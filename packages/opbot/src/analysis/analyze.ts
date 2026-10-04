/**
 * Position analysis: every legal action of the seat to move, with its
 * estimated win probability and a confidence interval.
 *
 * Unlike the playing agent (which spends its budget unevenly with sequential
 * halving), the analyzer gives every action the same simulations on the same
 * sampled worlds ("common random numbers"), so the numbers are directly
 * comparable and the difference between two actions has a much smaller error
 * than each estimate on its own.
 *
 * Only information visible to `seat` is used (determinization), so the answer
 * is "what was best given what you could know", not hindsight.
 */
import type { MatchSeat, MatchState } from "@tcg/op-engine";
import { actingSeat, enumerateActions, type Action } from "../engine/actions.ts";
import { determinize } from "../engine/determinize.ts";
import { applyInPlace } from "../engine/sim.ts";
import { evaluate, type ValueModel } from "../eval/value.ts";
import { rollout } from "../search/rollout.ts";
import { createRng } from "../util/rng.ts";

export interface AnalysisConfig {
  /** Sampled worlds; every action is simulated once per world. */
  readonly worlds: number;
  readonly horizonTurns: number;
  readonly model: ValueModel;
  readonly seed?: string;
  readonly maxRolloutSteps?: number;
}

export interface ActionAnalysis {
  readonly key: string;
  readonly label: string;
  readonly winProbability: number;
  /** 95% interval of the win probability. */
  readonly ci95: [number, number];
  /** Mean difference with the best action and its 95% interval (paired). */
  readonly deltaVsBest: number;
  readonly deltaCi95: [number, number];
  /** Share of simulations in which the game was won before the horizon (e.g. lethal this turn). */
  readonly winNowRate: number;
  readonly samples: number;
  readonly brokenSamples: number;
}

export interface PositionAnalysis {
  readonly seat: MatchSeat;
  readonly turn: number;
  readonly phase: string;
  readonly worlds: number;
  readonly staticEval: number;
  readonly actions: readonly ActionAnalysis[];
  readonly millis: number;
}

function meanCi(values: number[]): { mean: number; ci: [number, number] } {
  const n = values.length;
  if (n === 0) return { mean: NaN, ci: [NaN, NaN] };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0.25;
  const half = 1.96 * Math.sqrt(variance / n);
  return { mean, ci: [mean - half, mean + half] };
}

export function describeAction(state: MatchState, action: Action, cardName: (cardId: string) => string): string {
  const name = (id: string) => {
    const inst = state.cards[id];
    if (!inst) return id;
    const owner = inst.controller === action.command.seat ? "your" : "opponent's";
    return inst.zone === "leader" ? `${owner} Leader ${cardName(inst.cardId)}` : cardName(inst.cardId);
  };
  const c = action.command;
  switch (c.type) {
    case "endTurn":
      return "End turn";
    case "playCard":
      return `Play ${name(c.instanceId)}`;
    case "attachDon":
      return `Give ${c.amount ?? 1} DON!! to ${name(c.targetId)}`;
    case "declareAttack":
      return `Attack ${name(c.targetId)} with ${name(c.attackerId)}`;
    case "activateEffect":
      return `Activate ${name(c.sourceInstanceId)}`;
    case "resolvePrompt": {
      if (c.optionId !== undefined) return `Choose "${c.optionId}"`;
      const ids = c.selectedIds ?? [];
      return ids.length === 0 ? "Choose nothing" : `Choose ${ids.map(name).join(", ")}`;
    }
    default:
      return action.key;
  }
}

export function analyzePosition(
  state: MatchState,
  config: AnalysisConfig,
  cardName: (cardId: string) => string,
  seatOverride?: MatchSeat,
): PositionAnalysis {
  const started = performance.now();
  const seat = seatOverride ?? actingSeat(state);
  if (!seat) throw new Error("nobody can act in this position");
  const actions = enumerateActions(state, seat);
  if (actions.length === 0) throw new Error(`${seat} has no legal action here`);
  const rng = createRng(config.seed ?? "analysis");
  const worldSeeds = Array.from({ length: config.worlds }, () => rng.int(2 ** 31));
  const samples = new Map<string, Array<number | null>>(actions.map((a) => [a.key, []]));
  const winsNow = new Map<string, number>(actions.map((a) => [a.key, 0]));
  for (const worldSeed of worldSeeds) {
    for (const action of actions) {
      const worldRng = createRng(worldSeed);
      const world = determinize(state, seat, worldRng);
      let value: number | null = null;
      try {
        if (applyInPlace(world, action.command)) {
          const r = rollout(
            world,
            seat,
            state.turnNumber,
            { horizonTurns: config.horizonTurns, maxSteps: config.maxRolloutSteps ?? 300, model: config.model },
            worldRng,
          );
          value = r.broken ? null : r.value;
          if (!r.broken && r.terminal && r.value === 1) winsNow.set(action.key, winsNow.get(action.key)! + 1);
        }
      } catch {
        value = null;
      }
      samples.get(action.key)!.push(value);
    }
  }
  const stats = actions.map((action) => {
    const raw = samples.get(action.key)!;
    const valid = raw.filter((v): v is number => v !== null);
    return { action, raw, ...meanCi(valid), broken: raw.length - valid.length };
  });
  stats.sort((a, b) => b.mean - a.mean);
  const best = stats[0]!;
  const result: ActionAnalysis[] = stats.map((s) => {
    const diffs: number[] = [];
    for (let i = 0; i < s.raw.length; i++) {
      const a = s.raw[i];
      const b = best.raw[i];
      if (a !== null && a !== undefined && b !== null && b !== undefined) diffs.push(a - b);
    }
    const d = meanCi(diffs);
    return {
      key: s.action.key,
      label: describeAction(state, s.action, cardName),
      winProbability: s.mean,
      ci95: s.ci,
      deltaVsBest: s === best ? 0 : d.mean,
      deltaCi95: s === best ? [0, 0] : d.ci,
      winNowRate: winsNow.get(s.action.key)! / Math.max(1, s.raw.length),
      samples: s.raw.length,
      brokenSamples: s.broken,
    };
  });
  return {
    seat,
    turn: state.turnNumber,
    phase: state.phase,
    worlds: config.worlds,
    staticEval: evaluate(config.model, state, seat),
    actions: result,
    millis: performance.now() - started,
  };
}

export function formatAnalysis(a: PositionAnalysis): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const lines = [
    `${a.seat} to act, turn ${a.turn} (${a.phase}). Static eval ${pct(a.staticEval)}. ${a.worlds} worlds per action, ${(a.millis / 1000).toFixed(1)} s.`,
    "",
    "  #  win%    95% CI            vs best (95% CI)        win now  action",
  ];
  a.actions.forEach((x, i) => {
    const delta = i === 0 ? "best".padEnd(22) : `${(x.deltaVsBest * 100).toFixed(1)} [${(x.deltaCi95[0] * 100).toFixed(1)}, ${(x.deltaCi95[1] * 100).toFixed(1)}]`.padEnd(22);
    lines.push(
      `${String(i + 1).padStart(3)}  ${pct(x.winProbability).padStart(6)}  [${pct(x.ci95[0])}, ${pct(x.ci95[1])}]`.padEnd(36) +
        `  ${delta}  ${pct(x.winNowRate).padStart(6)}  ${x.label}${x.brokenSamples ? ` (${x.brokenSamples} broken)` : ""}`,
    );
  });
  return lines.join("\n");
}
