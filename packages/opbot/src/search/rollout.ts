/**
 * Rollouts: continue a (determinized, mutable) world with a fast policy for
 * both seats until the game ends or a horizon is reached, then score it.
 */
import { heuristicAgent, resolveBotPromptCommand, getLegalCommands } from "@tcg/op-engine";
import type { EngineCommand, MatchSeat, MatchState } from "@tcg/op-engine";
import { takeMaxDonOption } from "../agents/heuristic.ts";
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
 * During a battle, a "+X power" effect that targets one card should go to the
 * card that is fighting: the defender's target when the defending seat
 * chooses, the attacker when the attacking seat chooses. The engine heuristic
 * gives buffs to its strongest card instead, which wastes the effect (and the
 * card often trashed to pay for it); with Rocks lists this alone flips
 * matchups (see docs/RESULTADOS.md, calibration).
 */
function battleBuffTarget(world: MatchState, prompt: NonNullable<ReturnType<typeof pendingPrompt>>): EngineCommand | null {
  const battle = world.battle;
  if (!battle || prompt.choiceKind !== "selectTargets" || prompt.maxSelections !== 1) return null;
  const action = (prompt.resolutionContext as { action?: { action?: string; value?: number } } | null)?.action;
  if (action?.action !== "modifyPower" || (action.value ?? 0) <= 0) return null;
  const fighter = prompt.seat === battle.defendingSeat ? battle.targetId : battle.attackerId;
  if (world.cards[fighter]?.controller !== prompt.seat) return null;
  if (!prompt.options.some((o) => o.id === fighter && o.enabled !== false)) return null;
  return { type: "resolvePrompt", seat: prompt.seat as MatchSeat, promptId: prompt.id, selectedIds: [fighter] };
}

/**
 * The policy used inside rollouts: the engine's heuristic bot for both seats,
 * plus the fixes above.
 */
export function rolloutCommand(world: MatchState, seat: MatchSeat, rng: Rng): EngineCommand {
  const context = { random: () => rng.next() };
  const prompt = pendingPrompt(world);
  if (prompt && prompt.seat === seat) {
    return repairPromptCommand(
      world,
      battleBuffTarget(world, prompt) ??
        heuristicAgent.resolvePrompt?.(world, prompt, context) ??
        takeMaxDonOption(prompt) ??
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
