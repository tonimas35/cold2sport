/**
 * Rollouts: continue a (determinized, mutable) world with a fast policy for
 * both seats until the game ends or a horizon is reached, then score it.
 */
import type { EngineCommand, MatchSeat, MatchState } from "@tcg/op-engine";
import { enginePolicyCommand, policyCommand } from "../agents/policy.ts";
import { actingSeat, pendingJudgePrompt } from "../engine/actions.ts";
import { applyInPlace } from "../engine/sim.ts";
import { evaluate, type ValueModel } from "../eval/value.ts";
import type { Rng } from "../util/rng.ts";

/**
 * Fast policy played by both seats inside rollouts: "policy" is the improved
 * policy of agents/policy.ts (default); "engine" is the previous one (engine
 * heuristic plus the "up to N DON!!" and battle-buff fixes), kept to measure
 * the difference (`search:...,rollout=engine`).
 */
export type RolloutPolicy = "policy" | "engine";

export function parseRolloutPolicy(value: string | undefined): RolloutPolicy {
  if (value === undefined || value === "policy") return "policy";
  if (value === "engine") return "engine";
  throw new Error(`unknown rollout policy "${value}" (expected policy or engine)`);
}

export interface RolloutConfig {
  /**
   * Stop at the first main-phase decision of turn `rootTurn + horizonTurns`.
   * 1 = end of the current turn, 2 = after the next turn as well.
   */
  readonly horizonTurns: number;
  readonly maxSteps: number;
  readonly model: ValueModel;
  readonly policy?: RolloutPolicy;
}

export interface RolloutCommandOptions {
  /** Value model for the policy's lookahead ("choose one" effects). */
  readonly model?: ValueModel;
  readonly policy?: RolloutPolicy;
}

/** The rollout policy's command for `seat` (see `RolloutPolicy`). */
export function rolloutCommand(world: MatchState, seat: MatchSeat, rng: Rng, options: RolloutCommandOptions = {}): EngineCommand {
  if (options.policy === "engine") return enginePolicyCommand(world, seat, rng);
  return policyCommand(world, seat, rng, options.model ? { model: options.model } : {});
}

export interface RolloutResult {
  /** Probability that `perspective` wins, in [0, 1]. */
  readonly value: number;
  readonly steps: number;
  readonly terminal: boolean;
  /** The world became unusable (engine error or rejected command). */
  readonly broken: boolean;
}

export function rollout(
  world: MatchState,
  perspective: MatchSeat,
  rootTurn: number,
  config: RolloutConfig,
  rng: Rng,
): RolloutResult {
  const stopTurn = rootTurn + config.horizonTurns;
  let steps = 0;
  try {
    while (steps < config.maxSteps) {
      if (world.status === "finished") {
        return { value: evaluate(config.model, world, perspective), steps, terminal: true, broken: false };
      }
      const judge = pendingJudgePrompt(world);
      if (judge) {
        applyInPlace(world, { type: "judgeResolvePrompt", seat: "judge", promptId: judge.id, note: "auto" });
        continue;
      }
      const seat = actingSeat(world);
      if (!seat) break;
      if (
        world.turnNumber >= stopTurn &&
        world.phase === "main" &&
        !world.promptQueue.some((p) => p.status === "pending")
      ) {
        break;
      }
      const command = rolloutCommand(world, seat, rng, { model: config.model, policy: config.policy ?? "policy" });
      if (!applyInPlace(world, command)) {
        return { value: 0.5, steps, terminal: false, broken: true };
      }
      steps++;
    }
  } catch {
    return { value: 0.5, steps, terminal: false, broken: true };
  }
  return { value: evaluate(config.model, world, perspective), steps, terminal: world.status === "finished", broken: false };
}
