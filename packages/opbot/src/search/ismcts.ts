/**
 * Single-observer Information Set MCTS (Cowling, Powley & Whitehouse, 2012)
 * over the rest of the current turn (or a few turns, see `horizonTurns`).
 *
 * Every iteration samples a world consistent with what the root seat can see,
 * walks down the tree applying actions in that world, expands one new action,
 * finishes with a rollout of the fast policy up to the horizon and backs the
 * value up. Nodes are keyed by the semantic action keys of
 * `enumerateActions`, so one tree is shared by all sampled worlds; because the
 * legal actions differ between worlds, selection uses *availability counts*
 * (how often an action was available) instead of parent visits.
 *
 * Both seats' decisions are in the tree. The opponent picks among a small,
 * reasonable candidate set (its rollout-policy choice plus a few structural
 * alternatives) so that our plans are tested against more than one fixed
 * response without exploding the branching factor. Values at a node are from
 * the point of view of the seat that decides there.
 */
import type { EngineCommand, MatchSeat, MatchState } from "@tcg/op-engine";
import { actingSeat, enumerateActions, pendingJudgePrompt, pendingPrompt, type Action } from "../engine/actions.ts";
import { determinize } from "../engine/determinize.ts";
import { applyInPlace } from "../engine/sim.ts";
import { evaluate, type ValueModel } from "../eval/value.ts";
import { rollout, rolloutCommand } from "./rollout.ts";
import { createRng, type Rng } from "../util/rng.ts";

export interface IsmctsConfig {
  readonly iterations: number;
  /** Optional wall-clock cap per decision. */
  readonly timeMs?: number;
  readonly horizonTurns: number;
  readonly model: ValueModel;
  readonly exploration?: number;
  /** Bonus added to the rollout policy's own choice, decaying with visits (progressive bias). */
  readonly policyBias?: number;
  readonly maxOwnActions?: number;
  readonly maxOpponentActions?: number;
  readonly maxRolloutSteps?: number;
}

interface Edge {
  readonly key: string;
  visits: number;
  value: number; // sum, from the deciding seat's point of view
  avail: number;
  child: Node | null;
  label?: EngineCommand;
}

interface Node {
  seat: MatchSeat | null;
  edges: Map<string, Edge>;
}

export interface IsmctsEdgeReport {
  readonly key: string;
  readonly visits: number;
  readonly mean: number;
  readonly command?: EngineCommand;
}

export interface IsmctsResult {
  readonly bestKey: string;
  readonly bestCommand: EngineCommand;
  readonly root: readonly IsmctsEdgeReport[];
  /** Most-visited line from the root (both seats' decisions). */
  readonly principalVariation: readonly { seat: MatchSeat | null; key: string; visits: number; mean: number }[];
  readonly iterations: number;
  readonly millis: number;
}

function sameCommand(a: EngineCommand, b: EngineCommand): boolean {
  const norm = (c: EngineCommand) =>
    JSON.stringify(
      Object.entries(c)
        .filter(([, v]) => v !== undefined)
        .sort(([x], [y]) => (x < y ? -1 : 1))
        .map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v]),
    );
  return norm(a) === norm(b);
}

/**
 * Candidate actions at a node. Ours: everything (screened down to
 * `maxOwnActions` keeping the policy's choice). Opponent: the policy's choice
 * plus the first alternatives of the enumeration (for counters that is "no
 * counter" and the cheapest single counters), up to `maxOpponentActions`.
 */
function candidates(
  world: MatchState,
  seat: MatchSeat,
  rootSeat: MatchSeat,
  config: IsmctsConfig,
  rng: Rng,
): { actions: Action[]; policyKey: string | null } {
  let actions = enumerateActions(world, seat);
  let policyKey: string | null = null;
  let policy: EngineCommand | null = null;
  try {
    policy = rolloutCommand(world, seat, rng);
  } catch {
    policy = null;
  }
  if (policy) {
    const match = actions.find((a) => sameCommand(a.command, policy!));
    if (match) policyKey = match.key;
    else if (policy.type !== "concede") {
      policyKey = `policy:${JSON.stringify(policy)}`;
      actions = [{ key: policyKey, command: policy }, ...actions];
    }
  }
  const cap = seat === rootSeat ? (config.maxOwnActions ?? 24) : (config.maxOpponentActions ?? 4);
  if (actions.length > cap) {
    const keep = actions.filter((a) => a.key === policyKey);
    const rest = actions.filter((a) => a.key !== policyKey);
    actions = [...keep, ...rest.slice(0, cap - keep.length)];
  }
  return { actions, policyKey };
}

export function runIsmcts(state: MatchState, rootSeat: MatchSeat, config: IsmctsConfig, rng: Rng): IsmctsResult {
  const started = performance.now();
  const c = config.exploration ?? 0.7;
  const bias = config.policyBias ?? 0.5;
  const stopTurn = state.turnNumber + config.horizonTurns;
  const root: Node = { seat: rootSeat, edges: new Map() };
  const rolloutConfig = { horizonTurns: config.horizonTurns, maxSteps: config.maxRolloutSteps ?? 300, model: config.model };
  let iterations = 0;

  const atHorizon = (world: MatchState) =>
    world.status === "finished" ||
    (world.turnNumber >= stopTurn && world.phase === "main" && !world.promptQueue.some((p) => p.status === "pending"));

  for (; iterations < config.iterations; iterations++) {
    if (config.timeMs !== undefined && performance.now() - started > config.timeMs && iterations > 8) break;
    const worldRng = createRng(rng.int(2 ** 31));
    const world = determinize(state, rootSeat, worldRng);
    const path: Array<{ edge: Edge; seat: MatchSeat }> = [];
    let node: Node = root;
    let broken = false;
    let expanded = false;

    try {
      while (!atHorizon(world)) {
        const judge = pendingJudgePrompt(world);
        if (judge) {
          applyInPlace(world, { type: "judgeResolvePrompt", seat: "judge", promptId: judge.id, note: "auto" });
          continue;
        }
        const seat = actingSeat(world);
        if (!seat) break;
        node.seat = seat;
        const { actions, policyKey } = candidates(world, seat, rootSeat, config, worldRng);
        if (actions.length === 0) break;
        const edges = actions.map((a) => {
          let e = node.edges.get(a.key);
          if (!e) {
            e = { key: a.key, visits: 0, value: 0, avail: 0, child: null };
            node.edges.set(a.key, e);
          }
          e.avail++;
          return { e, a };
        });
        let pick: { e: Edge; a: Action };
        const unvisited = edges.filter((x) => x.e.visits === 0);
        if (unvisited.length > 0) {
          pick = unvisited.find((x) => x.a.key === policyKey) ?? unvisited[worldRng.int(unvisited.length)]!;
        } else {
          let best = -Infinity;
          pick = edges[0]!;
          for (const x of edges) {
            const mean = x.e.value / x.e.visits;
            const explore = c * Math.sqrt(Math.log(Math.max(2, x.e.avail)) / x.e.visits);
            const prior = x.a.key === policyKey ? bias / (1 + x.e.visits) : 0;
            const score = mean + explore + prior;
            if (score > best) {
              best = score;
              pick = x;
            }
          }
        }
        pick.e.label ??= pick.a.command;
        if (!applyInPlace(world, pick.a.command)) {
          broken = true;
          break;
        }
        path.push({ edge: pick.e, seat });
        if (pick.e.visits === 0) {
          expanded = true;
          pick.e.child ??= { seat: null, edges: new Map() };
          break;
        }
        pick.e.child ??= { seat: null, edges: new Map() };
        node = pick.e.child;
      }
    } catch {
      broken = true;
    }
    if (broken || path.length === 0) continue;

    let value: number;
    if (world.status === "finished" || !expanded) {
      value = evaluate(config.model, world, rootSeat);
    } else {
      const r = rollout(world, rootSeat, state.turnNumber, rolloutConfig, worldRng);
      if (r.broken) continue;
      value = r.value;
    }
    for (const { edge, seat } of path) {
      edge.visits++;
      edge.value += seat === rootSeat ? value : 1 - value;
    }
  }

  const rootEdges = [...root.edges.values()].filter((e) => e.visits > 0);
  if (rootEdges.length === 0) throw new Error("ISMCTS produced no evaluated action");
  rootEdges.sort((a, b) => b.visits - a.visits || b.value / b.visits - a.value / a.visits);
  const best = rootEdges[0]!;

  const pv: Array<{ seat: MatchSeat | null; key: string; visits: number; mean: number }> = [];
  let cursor: Node | null = root;
  while (cursor && pv.length < 30) {
    const edges: Edge[] = [...cursor.edges.values()].filter((x) => x.visits > 0);
    if (edges.length === 0) break;
    edges.sort((a, b) => b.visits - a.visits);
    const e: Edge = edges[0]!;
    if (e.visits < 3) break;
    pv.push({ seat: cursor.seat, key: e.key, visits: e.visits, mean: e.value / e.visits });
    cursor = e.child;
  }

  return {
    bestKey: best.key,
    bestCommand: best.label!,
    root: rootEdges.map((e) => ({ key: e.key, visits: e.visits, mean: e.value / e.visits, ...(e.label && { command: e.label }) })),
    principalVariation: pv,
    iterations,
    millis: performance.now() - started,
  };
}

/** Exposed for tests: whether a pending prompt belongs to `seat`. */
export function promptOwnedBy(state: MatchState, seat: MatchSeat): boolean {
  return pendingPrompt(state)?.seat === seat;
}
