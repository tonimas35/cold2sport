import { enumerateActions } from "../engine/actions.ts";
import type { Agent } from "./types.ts";

/** Uniformly random over distinct legal actions. Honest (uses no hidden info). */
export function createRandomAgent(): Agent {
  return {
    id: "random",
    honest: true,
    decide({ state, seat, rng }) {
      const actions = enumerateActions(state, seat);
      if (actions.length === 0) return { type: "endTurn", seat };
      return rng.pick(actions).command;
    },
    mulligan: () => false,
  };
}
