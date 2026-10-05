/**
 * Wrappers around the bots that ship with the engine: the "heuristic" agent
 * (the strongest one there; an *oracle* bot that reads the full state) and its
 * aggressive variant. They are our baselines.
 */
import {
  aggressiveAgent,
  getLegalCommands,
  heuristicAgent,
  resolveBotPromptCommand,
  type EngineCommand,
  type MatchSeat,
  type OnePieceBotAgent,
  type PromptState,
} from "@tcg/op-engine";
import { pendingPrompt, repairPromptCommand } from "../engine/actions.ts";
import { determinize } from "../engine/determinize.ts";
import type { Agent, DecisionRequest } from "./types.ts";

/**
 * "Up to N DON!!" prompts where more is better for the chooser (for example
 * OP15-058 Enel's "add up to 1 ... up to 4 additional DON!! ... give up to 4").
 * The engine's heuristic does not handle `chooseOption` prompts and its
 * fallback (`resolveBotPromptCommand`) picks the first option, "0", which
 * wastes the effect, and sometimes a cost already paid. Used by the heuristic
 * agents below and by the rollout policy (search/rollout.ts), instead of
 * patching the vendored bot.
 */
const TAKE_MAX_INTENTS = new Set(["effectSetActiveDon", "effectAddDon", "effectGiveDonCount"]);

export function takeMaxDonOption(prompt: PromptState): EngineCommand | null {
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

function wrap(id: string, bot: OnePieceBotAgent): Agent {
  return {
    id,
    honest: false,
    decide({ state, seat, rng }: DecisionRequest): EngineCommand {
      const context = { random: () => rng.next() };
      const prompt = pendingPrompt(state);
      if (prompt && prompt.seat === seat) {
        // The engine bots do not know hidden selection constraints (total cost
        // limits); repair their choice instead of letting the engine reject it.
        return repairPromptCommand(
          state,
          bot.resolvePrompt?.(state, prompt, context) ??
            takeMaxDonOption(prompt) ??
            resolveBotPromptCommand(state, prompt) ?? { type: "endTurn", seat },
        );
      }
      const legal = getLegalCommands(state, seat).filter((d) => d.type !== "concede");
      return bot.choose(state, seat, legal, context) ?? { type: "endTurn", seat };
    },
    mulligan({ state, seat, rng }: DecisionRequest): boolean {
      const legal = getLegalCommands(state, seat).filter(
        (d) => d.seat === seat && (d.type === "mulligan" || d.type === "keepHand"),
      );
      if (legal.length < 2) return false;
      const choice = bot.choose(state, seat, legal, { random: () => rng.next() });
      return choice?.type === "mulligan";
    },
  };
}

export function createHeuristicAgent(): Agent {
  return wrap("heuristic", heuristicAgent);
}

export function createAggressiveAgent(): Agent {
  return wrap("aggressive", aggressiveAgent);
}

/**
 * The heuristic bot made honest: it decides on a determinized copy of the
 * state (hidden cards re-dealt at random), so it cannot read the opponent's
 * hand, Life or deck order. Commands only reference ids that exist in both.
 */
export function createHonestHeuristicAgent(): Agent {
  const inner = wrap("heuristic", heuristicAgent);
  return {
    id: "heuristic-honest",
    honest: true,
    decide: (request) =>
      inner.decide({ ...request, state: determinize(request.state, request.seat, request.rng, request.knowledge) }),
    mulligan: (request) =>
      inner.mulligan({ ...request, state: determinize(request.state, request.seat, request.rng, request.knowledge) }),
  };
}
