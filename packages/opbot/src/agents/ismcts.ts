/** Playing agent on top of ISMCTS (search/ismcts.ts). Honest: it only sees determinized worlds. */
import { enumerateActions } from "../engine/actions.ts";
import { runIsmcts, type IsmctsConfig, type IsmctsResult } from "../search/ismcts.ts";
import type { Agent } from "./types.ts";
import { createSearchAgent } from "./search.ts";

export function createIsmctsAgent(config: IsmctsConfig & { id?: string }): Agent & { lastResult(): IsmctsResult | undefined } {
  let last: IsmctsResult | undefined;
  // Mulligan decisions reuse the flat search agent's honest heuristic call.
  const helper = createSearchAgent({ simulations: 1, horizonTurns: 1, model: config.model });
  return {
    id: config.id ?? `ismcts-i${config.iterations}-h${config.horizonTurns}`,
    honest: true,
    decide({ state, seat, rng }) {
      const actions = enumerateActions(state, seat);
      if (actions.length === 0) return { type: "endTurn", seat };
      if (actions.length === 1) {
        last = undefined;
        return actions[0]!.command;
      }
      last = runIsmcts(state, seat, config, rng);
      return last.bestCommand;
    },
    mulligan: (request) => helper.mulligan(request),
    lastStats: () => (last ? { iterations: last.iterations, millis: last.millis, value: last.root[0]?.mean } : undefined),
    lastResult: () => last,
  };
}
