import { enumerateActions } from "../engine/actions.ts";
import type { Agent } from "./types.ts";

/** Plays a uniformly random legal action with probability `epsilon`, else defers to `base`. */
export function withExploration(base: Agent, epsilon: number): Agent {
  return {
    id: `${base.id}+eps${epsilon}`,
    honest: base.honest,
    decide(request) {
      if (request.rng.next() < epsilon) {
        const actions = enumerateActions(request.state, request.seat);
        if (actions.length > 0) return request.rng.pick(actions).command;
      }
      return base.decide(request);
    },
    mulligan: (request) => base.mulligan(request),
  };
}
