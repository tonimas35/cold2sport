/**
 * Rollouts: continue a (determinized, mutable) world with a fast policy for
 * both seats until the game ends or a horizon is reached, then score it.
 */
import type { EngineCommand, MatchSeat, MatchState } from "@tcg/op-engine";
import { enginePolicyCommand, policyCommand } from "../agents/policy.ts";
import { actingSeat, pendingJudgePrompt, pendingPrompt } from "../engine/actions.ts";
import { applyInPlace } from "../engine/sim.ts";
import { evaluate, type ValueModel } from "../eval/value.ts";
import type { Rng } from "../util/rng.ts";

/**
 * Fast policy played by both seats inside rollouts: "policy" is the improved
 * policy of agents/policy.ts (default); "policy0" is that policy without its
 * DON!! rules (`policy:tempo=0`) and the search exactly as it was before them
 * (no `ruleCountAnswer`); "engine" is the older one (engine heuristic plus the
 * "up to N DON!!" and battle-buff fixes). The last two are kept to measure the
 * difference (`search:...,rollout=policy0`, `search:...,rollout=engine`).
 */
export type RolloutPolicy = "policy" | "policy0" | "engine";

export function parseRolloutPolicy(value: string | undefined): RolloutPolicy {
  if (value === undefined || value === "policy") return "policy";
  if (value === "policy0" || value === "engine") return value;
  throw new Error(`unknown rollout policy "${value}" (expected policy, policy0 or engine)`);
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
  return policyCommand(world, seat, rng, {
    ...(options.model && { model: options.model }),
    ...(options.policy === "policy0" && { tempo: false }),
  });
}

/**
 * Count prompts whose policy answer is a rule rather than a judgement: "add /
 * give / set active up to N DON!!" take the most, "add up to N cards from your
 * deck to your Life" and "draw up to N" take the most that leaves a card in
 * the deck (agents/policy.ts, countChoice).
 */
const RULE_COUNT_INTENTS = new Set([
  "effectAddDon",
  "effectGiveDonCount",
  "effectSetActiveDon",
  "effectAddToLifeFromDeck",
  "effectDrawCount",
]);

/** Whether `seat` has to answer one of the RULE_COUNT_INTENTS prompts and the policy decides it (rollout policy "policy"). */
export function isRuleCountPrompt(world: MatchState, seat: MatchSeat, policy: RolloutPolicy | undefined): boolean {
  if ((policy ?? "policy") !== "policy") return false;
  const prompt = pendingPrompt(world);
  const intent = prompt?.resolutionContext?.intent;
  return !!prompt && prompt.seat === seat && prompt.choiceKind === "chooseOption" && !!intent && RULE_COUNT_INTENTS.has(intent);
}

/**
 * The search's answer to a rule count prompt (`isRuleCountPrompt`): the
 * policy's, without rollouts. More DON!!, Life or cards is never worse there
 * (the policy already keeps a card in the deck), and the rollouts cannot tell:
 * at the Enel OP15-058 Leader's "add up to 1 DON!!" the value model scored
 * 0.117 for 0 and 0.235 for 1, but 32 rollouts to the end of the turn gave
 * 0.170 and 0.164 and the search added none. With 32 simulations over up to 5
 * options the noise of a mean (about ±0.1) is far above the real difference,
 * so keeping one alternative and asking for a significant difference would
 * spend simulations and still return the policy's answer. Null if the
 * policy's command is not one of the prompt's numeric options.
 */
export function ruleCountAnswer(world: MatchState, seat: MatchSeat, rng: Rng, options: RolloutCommandOptions = {}): EngineCommand | null {
  if (!isRuleCountPrompt(world, seat, options.policy)) return null;
  const command = rolloutCommand(world, seat, rng, options);
  if (command.type !== "resolvePrompt" || command.optionId === undefined || !/^\d+$/.test(command.optionId)) return null;
  const prompt = pendingPrompt(world)!;
  return prompt.options.some((o) => o.id === command.optionId && o.enabled !== false) ? command : null;
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
