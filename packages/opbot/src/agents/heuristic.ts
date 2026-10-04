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
  type OnePieceBotAgent,
} from "@tcg/op-engine";
import { pendingPrompt } from "../engine/actions.ts";
import type { Agent, DecisionRequest } from "./types.ts";

function wrap(id: string, bot: OnePieceBotAgent): Agent {
  return {
    id,
    honest: false,
    decide({ state, seat, rng }: DecisionRequest): EngineCommand {
      const context = { random: () => rng.next() };
      const prompt = pendingPrompt(state);
      if (prompt && prompt.seat === seat) {
        return (
          bot.resolvePrompt?.(state, prompt, context) ??
          resolveBotPromptCommand(state, prompt) ?? { type: "endTurn", seat }
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
