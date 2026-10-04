/**
 * Determinization: build a complete game state that is consistent with what
 * one seat can see, re-dealing everything it cannot see at random.
 *
 * Visibility follows the engine's own rule (projection.ts `canSeeCard`): a card
 * is visible to a seat when it is public knowledge, a Leader or a Character, or
 * in that seat's own hand. Every other card (opponent hand, both decks, face-down
 * Life, including your own Life) is hidden. On top of that, cards listed in a
 * pending prompt of the seat (for example the top cards it is looking at) are
 * known to it.
 *
 * For each owner, the catalog ids of its hidden cards are shuffled among its
 * hidden instances. Instance ids, zones and per-instance fields stay where they
 * are, so the state remains structurally valid. The multiset of hidden cards
 * comes from the true state, which amounts to assuming the seat knows both
 * decklists (reasonable for public meta lists; see docs/NOTAS_MOTOR.md).
 *
 * The match seed is replaced too: the engine derives every future shuffle from
 * it, so keeping it would leak future deck orders.
 */
import type { CardInstance, MatchSeat, MatchState } from "@tcg/op-engine";
import { cloneState } from "./sim.ts";
import type { Rng } from "../util/rng.ts";

export function canSee(seat: MatchSeat, instance: CardInstance): boolean {
  if (instance.publicKnowledge || instance.zone === "leader" || instance.zone === "character") {
    return true;
  }
  return instance.zone === "hand" && instance.controller === seat;
}

/** Instance ids referenced by the seat's own pending prompts (cards it is being shown). */
function promptKnownIds(state: MatchState, seat: MatchSeat): Set<string> {
  const known = new Set<string>();
  for (const prompt of state.promptQueue) {
    if (prompt.status !== "pending" || prompt.seat !== seat) continue;
    for (const option of prompt.options) {
      for (const id of [option.id, option.value, option.targetId]) {
        if (id && state.cards[id]) known.add(id);
      }
    }
    const ctx = prompt.resolutionContext as { candidateIds?: unknown } | null;
    if (ctx && Array.isArray(ctx.candidateIds)) {
      for (const id of ctx.candidateIds) if (typeof id === "string" && state.cards[id]) known.add(id);
    }
  }
  return known;
}

/** Hidden instance ids per owner, from `seat`'s point of view. */
export function hiddenInstances(state: MatchState, seat: MatchSeat): Record<MatchSeat, string[]> {
  const known = promptKnownIds(state, seat);
  const hidden: Record<MatchSeat, string[]> = { south: [], north: [] };
  for (const instance of Object.values(state.cards)) {
    if (instance.zone === "resolution") continue;
    if (canSee(seat, instance) || known.has(instance.instanceId)) continue;
    hidden[instance.owner].push(instance.instanceId);
  }
  return hidden;
}

/**
 * A private, mutable copy of `state` with `seat`'s hidden information
 * re-dealt at random. The result can be simulated with `applyInPlace`.
 */
export function determinize(state: MatchState, seat: MatchSeat, rng: Rng): MatchState {
  const world = cloneState(state);
  const hidden = hiddenInstances(world, seat);
  for (const owner of ["south", "north"] as const) {
    const ids = hidden[owner];
    if (ids.length < 2) continue;
    const cardIds = rng.shuffle(ids.map((id) => world.cards[id]!.cardId));
    ids.forEach((id, i) => {
      world.cards[id]!.cardId = cardIds[i]!;
    });
  }
  world.config.seed = `det-${Math.floor(rng.next() * 2 ** 31)}`;
  return world;
}
