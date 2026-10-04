/**
 * Rollouts: continue a (determinized, mutable) world with a fast policy for
 * both seats until the game ends or a horizon is reached, then score it.
 */
import { heuristicAgent, resolveBotPromptCommand, getLegalCommands } from "@tcg/op-engine";
import type { EngineCommand, MatchSeat, MatchState } from "@tcg/op-engine";
import { actingSeat, pendingJudgePrompt, pendingPrompt } from "../engine/actions.ts";
import { applyInPlace } from "../engine/sim.ts";
import { evaluate, type ValueModel } from "../eval/value.ts";
import type { Rng } from "../util/rng.ts";

export interface RolloutConfig {
  /**
   * Stop at the first main-phase decision of turn `rootTurn + horizonTurns`.
   * 1 = end of the current turn, 2 = after the next turn as well.
   */
  readonly horizonTurns: number;
  readonly maxSteps: number;
  readonly model: ValueModel;
}

/** The policy used inside rollouts: the engine's heuristic bot, for both seats. */
export function rolloutCommand(world: MatchState, seat: MatchSeat, rng: Rng): EngineCommand {
  const context = { random: () => rng.next() };
  const prompt = pendingPrompt(world);
  if (prompt && prompt.seat === seat) {
    return (
      heuristicAgent.resolvePrompt?.(world, prompt, context) ??
      resolveBotPromptCommand(world, prompt) ?? { type: "endTurn", seat }
    );
  }
  const legal = getLegalCommands(world, seat).filter((d) => d.type !== "concede");
  return heuristicAgent.choose(world, seat, legal, context) ?? { type: "endTurn", seat };
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
      const command = rolloutCommand(world, seat, rng);
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
