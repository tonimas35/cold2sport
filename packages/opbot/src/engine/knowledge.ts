/**
 * What each seat legitimately knows about cards that are currently hidden.
 *
 * The engine forgets public reveals: a card revealed by a search and added to
 * hand, a Character bounced to its owner's hand, a revealed top card put back,
 * all go back to plain hidden cards. A human remembers them, so we keep track:
 *
 * - a card that was visible to a seat before a command and is hidden from it
 *   after the command (bounce, card returned to hand, ...) stays known;
 * - a card named by a *public* "reveals" log line during a command is known to
 *   both seats.
 *
 * Knowledge is dropped when the card becomes visible anyway, or when it moves
 * into a deck (its position there is no longer known).
 *
 * Only public information is used: private log lines and event payloads are
 * ignored (the engine emits card ids on events even for private draws).
 */
import type { GameLogEntry, MatchSeat, MatchState } from "@tcg/op-engine";
import { canSee } from "./determinize.ts";

interface Fact {
  cardId: string;
  zone: string;
}

export class Knowledge {
  private readonly facts: Record<MatchSeat, Map<string, Fact>> = { south: new Map(), north: new Map() };

  /** Call after every applied command with the state before, the state after and the logs it emitted. */
  observe(before: MatchState | null, after: MatchState, logs: readonly GameLogEntry[]): void {
    for (const seat of ["south", "north"] as const) {
      const facts = this.facts[seat];
      // Visible before, hidden now: remember it.
      if (before) {
        for (const [id, prev] of Object.entries(before.cards)) {
          const next = after.cards[id];
          if (!next || !canSee(seat, prev) || canSee(seat, next) || next.zone === "deck") continue;
          facts.set(id, { cardId: next.cardId, zone: next.zone });
        }
      }
      // Publicly revealed during the command.
      for (const log of logs) {
        if (log.visibility !== "public" || !/\breveals\b/.test(log.message)) continue;
        for (const id of log.targetIds) {
          const next = after.cards[id];
          if (!next || canSee(seat, next) || next.zone === "deck") continue;
          facts.set(id, { cardId: next.cardId, zone: next.zone });
        }
      }
      // Forget what is visible anyway or has moved somewhere we cannot follow.
      for (const [id, fact] of facts) {
        const next = after.cards[id];
        if (!next || canSee(seat, next) || next.zone === "deck" || next.cardId !== fact.cardId) {
          facts.delete(id);
        } else if (next.zone !== fact.zone) {
          fact.zone = next.zone;
        }
      }
    }
  }

  /** instanceId -> cardId of hidden cards `seat` knows. */
  knownBy(seat: MatchSeat): ReadonlyMap<string, string> {
    return new Map([...this.facts[seat]].map(([id, f]) => [id, f.cardId]));
  }
}
