import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  op17DonMarlon052,
  op17Gloriosa046,
  op17Kaido042,
  op17Kyo045,
  op17RocksDXebec039,
  op17Shiki048,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// [Blocker]
// [On Play] You may reveal 3 cards with a type including "Rocks Pirates" from
// your hand: Give up to 1 of your opponent's Characters −3000 power during this
// turn.
//
// The power change is negative on the card; it used to be imported as +3000.
function setup(
  hand: FixtureCardEntry[] = [
    op17Kaido042,
    op17Kyo045,
    op17Gloriosa046,
    op17DonMarlon052,
    op17Shiki048,
    eb01Doma005,
  ],
) {
  return OnePieceTestEngine.create(
    { leaderCardId: op17RocksDXebec039, hand, activeDon: 4 },
    { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

function northPower(engine: OnePieceTestEngine, instanceId: string) {
  return engine
    .getView("south")
    .players.north.characters.find((card) => card?.instanceId === instanceId)?.power;
}

describe("OP17-042 Kaido", () => {
  test("revealing 3 Rocks Pirates cards gives an opposing Character -3000 power this turn", () => {
    const engine = setup();
    const south = engine.asSouth();
    const godId = engine.findCardInZone("north", "character", eb01MountainGod018);
    const revealIds = [
      engine.findCardInZone("south", "hand", op17Kyo045),
      engine.findCardInZone("south", "hand", op17Gloriosa046),
      engine.findCardInZone("south", "hand", op17DonMarlon052),
    ];
    const domaId = engine.findCardInZone("south", "hand", eb01Doma005);

    south.play(op17Kaido042);
    south.acceptOptional();
    const cost = south.pendingDecision("effectCostRevealFromHand").steps[0];
    if (cost?.kind !== "payCost") throw new Error("Expected Kaido's reveal cost.");
    expect(cost).toMatchObject({ min: 3, max: 3 });
    expect(cost.candidates).toHaveLength(4);
    expect(cost.candidates.map((candidate) => candidate.ref.id)).not.toContain(domaId);
    south.choose("effectCostRevealFromHand", revealIds);
    south.chooseTargets(godId);

    expect(northPower(engine, godId)).toBe(4000);
    // Revealed cards stay in hand.
    expect(south.view().players.south.hand).toHaveLength(5);
    expect(engine.getState().capabilityHistory).toHaveLength(0);

    south.endTurn();
    expect(northPower(engine, godId)).toBe(7000);
  });

  test("declining the reveal leaves the opposing Character's power unchanged", () => {
    const engine = setup();
    const south = engine.asSouth();
    const godId = engine.findCardInZone("north", "character", eb01MountainGod018);

    south.play(op17Kaido042);
    south.declineOptional();

    expect(northPower(engine, godId)).toBe(7000);
    expect(south.view().players.south.hand).toHaveLength(5);
    expect(south.view().prompts).toHaveLength(0);
  });

  test("with only 2 Rocks Pirates cards in hand the cost cannot be paid", () => {
    const engine = setup([op17Kaido042, op17Kyo045, op17Gloriosa046, eb01Doma005]);
    const south = engine.asSouth();
    const godId = engine.findCardInZone("north", "character", eb01MountainGod018);

    south.play(op17Kaido042);

    expect(south.hasPendingChoice()).toBe(false);
    expect(northPower(engine, godId)).toBe(7000);
    expect(south.findOnField(op17Kaido042)).toBeDefined();
  });
});
