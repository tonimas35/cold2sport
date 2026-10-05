/** Playing agent on top of ISMCTS (search/ismcts.ts). Honest: it only sees determinized worlds. */
import { enumerateActions } from "../engine/actions.ts";
import { determinize } from "../engine/determinize.ts";
import { runIsmcts, type IsmctsConfig, type IsmctsResult } from "../search/ismcts.ts";
import { isRuleCountPrompt, ruleCountAnswer } from "../search/rollout.ts";
import type { Agent } from "./types.ts";
import { createSearchAgent } from "./search.ts";

export function createIsmctsAgent(config: IsmctsConfig & { id?: string }): Agent & { lastResult(): IsmctsResult | undefined } {
  let last: IsmctsResult | undefined;
  // Mulligan decisions reuse the flat search agent's honest heuristic call.
  const helper = createSearchAgent({ simulations: 1, horizonTurns: 1, model: config.model });
  return {
    id: config.id ?? `ismcts-i${config.iterations}-h${config.horizonTurns}`,
    honest: true,
    decide({ state, seat, rng, knowledge }) {
      // Rule count prompts ("add up to N DON!!"...): the policy's answer, as in the flat search.
      if (isRuleCountPrompt(state, seat, config.rolloutPolicy)) {
        const world = determinize(state, seat, rng, knowledge);
        const answer = ruleCountAnswer(world, seat, rng, { model: config.model, policy: config.rolloutPolicy ?? "policy" });
        if (answer) {
          last = undefined;
          return answer;
        }
      }
      const actions = enumerateActions(state, seat);
      if (actions.length === 0) return { type: "endTurn", seat };
      if (actions.length === 1) {
        last = undefined;
        return actions[0]!.command;
      }
      last = runIsmcts(state, seat, config, rng, knowledge);
      return last.bestCommand;
    },
    mulligan: (request) => helper.mulligan(request),
    lastStats: () => (last ? { iterations: last.iterations, millis: last.millis, value: last.root[0]?.mean } : undefined),
    lastResult: () => last,
  };
}
