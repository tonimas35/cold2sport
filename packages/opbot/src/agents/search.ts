/**
 * Search agent v1: determinized Monte Carlo over the current decision.
 *
 * For every candidate action, sample worlds consistent with what our seat can
 * see (determinize), play the action, continue with the rollout policy for both
 * seats up to a horizon, and score with the value model. Simulations are
 * allocated by sequential halving (Karnin et al., 2013) with *common worlds*:
 * in each round every surviving action is evaluated on the same sampled worlds
 * and the same rollout seeds, so differences between actions are not drowned in
 * the luck of the draw.
 *
 * The agent is honest: it never reads the true state except through
 * `determinize`, which re-deals everything the seat cannot see.
 */
import { getLegalCommands, heuristicAgent } from "@tcg/op-engine";
import type { EngineCommand, MatchSeat, MatchState } from "@tcg/op-engine";
import { enumerateActions, sameCommand, type Action } from "../engine/actions.ts";
import { determinize } from "../engine/determinize.ts";
import { applyInPlace } from "../engine/sim.ts";
import { evaluate, type ValueModel } from "../eval/value.ts";
import { rollout, rolloutCommand } from "../search/rollout.ts";
import { createRng, type Rng } from "../util/rng.ts";
import type { Agent, DecisionRequest, DecisionStats } from "./types.ts";

export interface SearchConfig {
  readonly id?: string;
  /** Total rollouts per decision. */
  readonly simulations: number;
  readonly horizonTurns: number;
  readonly maxRolloutSteps?: number;
  readonly model: ValueModel;
  /** Keep at most this many actions after a cheap one-step screening. */
  readonly maxCandidates?: number;
}

export interface ActionReport {
  readonly key: string;
  readonly visits: number;
  readonly mean: number;
}

export interface SearchReport extends DecisionStats {
  readonly chosen: string;
  readonly heuristicKey: string | null;
  readonly actions: readonly ActionReport[];
}


export function createSearchAgent(config: SearchConfig): Agent & { lastReport(): SearchReport | undefined } {
  const maxSteps = config.maxRolloutSteps ?? 300;
  const maxCandidates = config.maxCandidates ?? 12;
  let last: SearchReport | undefined;

  function heuristicSuggestion(state: MatchState, seat: MatchSeat, rng: Rng): EngineCommand | null {
    try {
      return rolloutCommand(determinize(state, seat, rng), seat, rng);
    } catch {
      return null;
    }
  }

  function screen(state: MatchState, seat: MatchSeat, actions: Action[], keep: Set<string>, rng: Rng): Action[] {
    if (actions.length <= maxCandidates) return actions;
    const seed = rng.int(2 ** 31);
    const scored = actions.map((action) => {
      const world = determinize(state, seat, createRng(seed));
      let score = -1;
      try {
        if (applyInPlace(world, action.command)) score = evaluate(config.model, world, seat);
      } catch {
        score = -1;
      }
      return { action, score: keep.has(action.key) ? 2 : score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxCandidates).map((s) => s.action);
  }

  function decide({ state, seat, rng }: DecisionRequest): EngineCommand {
    const started = performance.now();
    let actions = enumerateActions(state, seat);
    if (actions.length === 0) {
      last = undefined;
      return { type: "endTurn", seat };
    }
    if (actions.length === 1) {
      last = { chosen: actions[0]!.key, heuristicKey: null, actions: [], iterations: 0, millis: 0 };
      return actions[0]!.command;
    }

    // The rollout policy's own choice is always a candidate.
    const suggestion = heuristicSuggestion(state, seat, rng);
    let heuristicKey: string | null = null;
    if (suggestion) {
      const match = actions.find((a) => sameCommand(a.command, suggestion));
      if (match) heuristicKey = match.key;
      else if (suggestion.type !== "concede") {
        heuristicKey = `heuristic:${JSON.stringify(suggestion)}`;
        actions = [...actions, { key: heuristicKey, command: suggestion }];
      }
    }
    const keep = new Set(heuristicKey ? [heuristicKey] : []);
    const candidates = screen(state, seat, actions, keep, rng);

    const stats = new Map<string, { sum: number; n: number }>(candidates.map((a) => [a.key, { sum: 0, n: 0 }]));
    let alive = candidates;
    const rounds = Math.max(1, Math.ceil(Math.log2(candidates.length)));
    let simulations = 0;
    for (let round = 0; round < rounds && alive.length > 1; round++) {
      const perAction = Math.max(1, Math.floor(config.simulations / (alive.length * rounds)));
      const worldSeeds = Array.from({ length: perAction }, () => rng.int(2 ** 31));
      for (const action of alive) {
        const s = stats.get(action.key)!;
        for (const worldSeed of worldSeeds) {
          const worldRng = createRng(worldSeed);
          const world = determinize(state, seat, worldRng);
          let ok = false;
          try {
            ok = applyInPlace(world, action.command);
          } catch {
            ok = false;
          }
          simulations++;
          if (!ok) {
            s.n++; // an action that breaks in some world is penalized
            continue;
          }
          const result = rollout(world, seat, state.turnNumber, { horizonTurns: config.horizonTurns, maxSteps, model: config.model }, worldRng);
          if (result.broken) continue;
          s.sum += result.value;
          s.n++;
        }
      }
      const mean = (a: Action) => {
        const s = stats.get(a.key)!;
        return s.n > 0 ? s.sum / s.n : 0;
      };
      alive = [...alive].sort((a, b) => mean(b) - mean(a)).slice(0, Math.ceil(alive.length / 2));
    }
    const best = alive[0]!;
    const report: SearchReport = {
      chosen: best.key,
      heuristicKey,
      iterations: simulations,
      millis: performance.now() - started,
      value: (() => {
        const s = stats.get(best.key)!;
        return s.n > 0 ? s.sum / s.n : undefined;
      })(),
      actions: candidates
        .map((a) => {
          const s = stats.get(a.key)!;
          return { key: a.key, visits: s.n, mean: s.n > 0 ? s.sum / s.n : 0 };
        })
        .sort((a, b) => b.visits - a.visits || b.mean - a.mean),
    };
    last = report;
    return best.command;
  }

  return {
    id: config.id ?? `search-s${config.simulations}-h${config.horizonTurns}`,
    honest: true,
    decide,
    mulligan({ state, seat, rng }) {
      // Honest: let the heuristic judge our own hand inside a determinized world.
      const world = determinize(state, seat, rng);
      const choice = rolloutCommandForSetup(world, seat, rng);
      return choice === "mulligan";
    },
    lastStats: () => last,
    lastReport: () => last,
  };
}

function rolloutCommandForSetup(world: MatchState, seat: MatchSeat, rng: Rng): "mulligan" | "keep" {
  const legal = getLegalCommands(world, seat).filter(
    (d) => d.seat === seat && (d.type === "mulligan" || d.type === "keepHand"),
  );
  if (legal.length < 2) return "keep";
  const choice = heuristicAgent.choose(world, seat, legal, { random: () => rng.next() });
  return choice?.type === "mulligan" ? "mulligan" : "keep";
}
