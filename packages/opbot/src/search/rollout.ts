/**
 * Rollouts: continue a (determinized, mutable) world with a fast policy for
 * both seats until the game ends or a horizon is reached, then score it.
 */
import { heuristicAgent, resolveBotPromptCommand, getLegalCommands } from "@tcg/op-engine";
import type { EngineCommand, MatchSeat, MatchState } from "@tcg/op-engine";
import { actingSeat, pendingJudgePrompt, pendingPrompt, repairPromptCommand } from "../engine/actions.ts";
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

/**
 * "Up to N DON!!" prompts where more is better for the chooser. The engine's
 * heuristic does not handle `chooseOption` prompts and its fallback picks the
 * first option, "0", wasting the effect (and sometimes a cost already paid).
 */
const TAKE_MAX_INTENTS = new Set(["effectSetActiveDon", "effectAddDon", "effectGiveDonCount"]);

function takeMaxOption(prompt: NonNullable<ReturnType<typeof pendingPrompt>>): EngineCommand | null {
  const intent = (prompt.resolutionContext as { intent?: string } | null)?.intent;
  if (prompt.choiceKind !== "chooseOption" || !intent || !TAKE_MAX_INTENTS.has(intent)) return null;
  let best: string | null = null;
  for (const option of prompt.options) {
    if (option.enabled === false || !/^\d+$/.test(option.id)) continue;
    if (best === null || Number(option.id) > Number(best)) best = option.id;
  }
  return best === null
    ? null
    : { type: "resolvePrompt", seat: prompt.seat as MatchSeat, promptId: prompt.id, optionId: best };
}

/**
 * The policy used inside rollouts: the engine's heuristic bot for both seats,
 * plus the fix above.
 */
export function rolloutCommand(world: MatchState, seat: MatchSeat, rng: Rng): EngineCommand {
  const context = { random: () => rng.next() };
  const prompt = pendingPrompt(world);
  if (prompt && prompt.seat === seat) {
    return repairPromptCommand(
      world,
      heuristicAgent.resolvePrompt?.(world, prompt, context) ??
        takeMaxOption(prompt) ??
        resolveBotPromptCommand(world, prompt) ?? { type: "endTurn", seat },
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
