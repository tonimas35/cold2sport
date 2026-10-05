/**
 * Win-probability model: logistic regression over `extractFeatures`.
 *
 * Trained by `opbot train-value` on positions from self-play (see
 * eval/train.ts); the fitted weights live in `models/*.json`. Terminal states
 * are scored exactly.
 */
import type { MatchSeat, MatchState } from "@tcg/op-engine";
import { extractFeatures, FEATURE_NAMES, type FeatureVector } from "./features.ts";
import { mlpPredict, type MlpWeights } from "./mlp.ts";

export interface ValueModel {
  readonly version: string;
  readonly featureNames: readonly string[];
  /** Logistic-regression weights (used when `mlp` is absent). */
  readonly weights: readonly number[];
  /** Optional one-hidden-layer network over the same features; takes precedence. */
  readonly mlp?: MlpWeights;
  readonly trainedOn?: string;
  readonly metrics?: Record<string, number>;
}

export function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

export function predictFeatures(model: ValueModel, f: FeatureVector): number {
  if (model.mlp) return mlpPredict(model.mlp, f);
  let z = 0;
  const w = model.weights;
  for (let i = 0; i < f.length; i++) z += (w[i] ?? 0) * f[i]!;
  return sigmoid(z);
}

/** Probability that `seat` wins from `state`. */
export function evaluate(model: ValueModel, state: MatchState, seat: MatchSeat): number {
  if (state.status === "finished") {
    if (state.winner === null) return 0.5;
    return state.winner === seat ? 1 : 0;
  }
  return predictFeatures(model, extractFeatures(state, seat));
}

/**
 * Hand-set starting point used before any model is trained: life and board
 * dominate, cards in hand and counters help.
 */
export const HANDCRAFTED_MODEL: ValueModel = (() => {
  const w: Record<string, number> = {
    myTurn: 0.3,
    lifeMe: 2.5,
    lifeOpp: -2.5,
    lifeMe0: -1.5,
    lifeOpp0: 1.5,
    handMe: 0.8,
    handOpp: -0.8,
    donMe: 0.5,
    donOpp: -0.5,
    charPowerMe: 1.5,
    charPowerOpp: -1.5,
    blockersMe: 0.4,
    blockersOpp: -0.4,
    counterMe: 0.8,
    counterOpp: -0.8,
    pressureOnOpp: 1.0,
    pressureOnMe: -1.0,
  };
  return {
    version: "handcrafted-0",
    featureNames: [...FEATURE_NAMES],
    weights: FEATURE_NAMES.map((n) => w[n] ?? 0),
  };
})();

export function checkModel(model: ValueModel): void {
  const expected = FEATURE_NAMES.join(",");
  if (model.featureNames.join(",") !== expected) {
    throw new Error(`value model ${model.version} was trained on a different feature set`);
  }
}
