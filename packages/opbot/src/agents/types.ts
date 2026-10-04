import type { EngineCommand, MatchSeat, MatchState } from "@tcg/op-engine";
import type { Rng } from "../util/rng.ts";

export interface DecisionRequest {
  /**
   * The true game state. It contains hidden information (opponent hand, deck
   * order, life cards). An *honest* agent only uses what `seat` can see; the
   * search agent guarantees it by determinizing before it looks at anything.
   * The engine's own heuristic bots are "oracle" bots and do read it.
   */
  readonly state: MatchState;
  readonly seat: MatchSeat;
  readonly rng: Rng;
  /** Hidden cards this seat legitimately remembers (instanceId -> cardId), see engine/knowledge.ts. */
  readonly knowledge?: ReadonlyMap<string, string>;
}

export interface DecisionStats {
  readonly iterations?: number;
  readonly millis?: number;
  /** Win-probability estimate of the chosen action, from the agent's point of view. */
  readonly value?: number;
}

export interface Agent {
  readonly id: string;
  /** Whether the agent only uses information visible to its seat. */
  readonly honest: boolean;
  decide(request: DecisionRequest): EngineCommand;
  /** true = mulligan, false = keep. */
  mulligan(request: DecisionRequest): boolean;
  /** Optional details about the last decision, for logs and analysis. */
  lastStats?(): DecisionStats | undefined;
}
