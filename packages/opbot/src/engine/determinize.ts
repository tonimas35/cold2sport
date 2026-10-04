/**
 * Determinization: build a complete game state that is consistent with what
 * one seat can see, re-dealing everything it cannot see at random.
 *
 * Visibility follows the engine's own rule (projection.ts `canSeeCard`): a card
 * is visible to a seat when it is public knowledge, a Leader or a Character, or
 * in that seat's own hand. Every other card (opponent hand, both decks, face-down
 * Life, including your own Life) is hidden. On top of that, cards listed in a
 * pending prompt of the seat (for example the top cards it is looking at) are
 * known to it, and cards referenced by the resolution queue are pinned.
 *
 * Known limitation: the engine forgets public reveals (a searched card revealed
 * and added to hand, a bounced Character) once the card is back in a hidden
 * zone, so this treats them as unknown. A human would remember them.
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

function collectIds(value: unknown, state: MatchState, into: Set<string>): void {
  if (typeof value === "string") {
    if (state.cards[value]) into.add(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectIds(v, state, into);
  } else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) collectIds(v, state, into);
  }
}

/**
 * Instance ids whose identity must not change: cards shown to the seat in its
 * own pending prompts, and cards referenced by effects that are mid-resolution
 * (their contents were computed from the real identities).
 */
function promptKnownIds(state: MatchState, seat: MatchSeat): Set<string> {
  const known = new Set<string>();
  collectIds(state.resolutionQueue, state, known);
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
export function hiddenInstances(
  state: MatchState,
  seat: MatchSeat,
  remembered?: ReadonlyMap<string, string>,
): Record<MatchSeat, string[]> {
  const known = promptKnownIds(state, seat);
  for (const id of remembered?.keys() ?? []) known.add(id);
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
export function determinize(
  state: MatchState,
  seat: MatchSeat,
  rng: Rng,
  /** Hidden cards the seat remembers (engine/knowledge.ts): kept with their identity. */
  remembered?: ReadonlyMap<string, string>,
): MatchState {
  const world = cloneState(state);
  // Resolved prompts are never read by the rules, but they still list the real
  // cards (e.g. the opponent's whole hand at a past counter step). Drop them.
  world.promptQueue = world.promptQueue.filter((p) => p.status === "pending");
  const hidden = hiddenInstances(world, seat, remembered);
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
