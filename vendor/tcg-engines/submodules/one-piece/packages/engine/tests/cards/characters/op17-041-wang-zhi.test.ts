import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, op13Higuma013, op17WangZhi041, op17XDrake075 } from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// OP17-041 Wang Zhi: "[Blocker] [On Play] You may trash 1 card from your hand:
// Place all of your opponent's Characters with a base cost of 1 at the bottom
// of the owner's deck in any order of the owner's choosing."
function setup(hand: FixtureCardEntry[] = [op17WangZhi041, op13Higuma013]) {
  return OnePieceTestEngine.create(
    { hand, activeDon: 4 },
    { character: [op13Higuma013, op17XDrake075, eb01Doma005], deck: 3 },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("OP17-041 Wang Zhi", () => {
  test("[On Play] trashing 1 card places every opposing base-cost-1 Character at the bottom, in the owner's order", () => {
    const engine = setup();
    const south = engine.asSouth();
    const north = engine.asNorth();
    const higumaId = north.findOnField(op13Higuma013);
    const domaId = north.findOnField(eb01Doma005);
    const drakeId = north.findOnField(op17XDrake075);
    const discardId = engine.findCardInZone("south", "hand", op13Higuma013);

    south.play(op17WangZhi041);
    south.acceptOptional();

    // The owner (North) chooses the order of its own cards.
    const order = north.pendingDecision("effectReturnToDeckOwnerOrder").steps[0];
    if (order?.kind !== "selectEntity" && order?.kind !== "orderItems") {
      throw new Error("Expected North's order choice.");
    }
    expect(order.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [higumaId, domaId].sort(),
    );
    north.orderCards("effectReturnToDeckOwnerOrder", [domaId, higumaId]);

    const state = engine.getState();
    expect(state.players.north.deck.slice(-2)).toEqual([domaId, higumaId]);
    const view = south.view();
    expect(view.players.north.characters.filter(Boolean).map((card) => card?.instanceId)).toEqual([
      drakeId,
    ]);
    expect(view.players.south.trash.map((card) => card.instanceId)).toEqual([discardId]);
    expect(view.players.south.characters.map((card) => card?.cardId)).toContain(op17WangZhi041.id);
    expect(view.prompts).toHaveLength(0);
    expect(state.capabilityHistory).toHaveLength(0);
  });

  test("[On Play] declining the trash keeps every Character on the field", () => {
    const engine = setup();
    const south = engine.asSouth();

    south.play(op17WangZhi041);
    south.declineOptional();

    const view = south.view();
    expect(view.players.north.characters.filter(Boolean)).toHaveLength(3);
    expect(view.players.north.deckCount).toBe(3);
    expect(view.players.south.hand.map((card) => card.cardId)).toEqual([op13Higuma013.id]);
    expect(view.players.south.trash).toHaveLength(0);
    expect(view.prompts).toHaveLength(0);
  });

  test("[On Play] with no other card in hand the cost cannot be paid", () => {
    const engine = setup([op17WangZhi041]);
    const south = engine.asSouth();

    south.play(op17WangZhi041);

    const view = south.view();
    expect(view.prompts).toHaveLength(0);
    expect(view.players.north.characters.filter(Boolean)).toHaveLength(3);
    expect(view.players.north.deckCount).toBe(3);
  });
});
