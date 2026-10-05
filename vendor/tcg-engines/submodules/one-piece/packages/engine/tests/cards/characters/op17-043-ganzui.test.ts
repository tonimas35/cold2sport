import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  op13Higuma013,
  op17Ganzui043,
  op17Gloriosa046,
  op17RocksDXebec039,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// If this Character would be removed from the field, you may trash 2 cards from
// your hand instead.
// [On Play] Your Leader's base power becomes 6000 until the end of your
// opponent's next End Phase.
//
// The [On Play] had no block in the catalog (catalog-check structure:onPlay).
// The replacement has no "by your opponent's effect": the Japanese text reads
// "leave the field", so a battle K.O. is replaced too. OP17 FAQ: with 0 or 1
// cards in hand it cannot be chosen (8-1-3-4-5).

function attackedGanzui(hand: FixtureCardEntry[]) {
  return OnePieceTestEngine.create(
    { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
    {
      leaderCardId: op17RocksDXebec039,
      hand,
      character: [{ card: op17Ganzui043, rested: true }],
    },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

function northCharacterIds(engine: OnePieceTestEngine) {
  return engine
    .getView("north")
    .players.north.characters.filter((card) => card !== null)
    .map((card) => card!.instanceId);
}

describe("OP17-043 Ganzui", () => {
  test("[On Play] the Leader's base power becomes 6000 until the end of the opponent's next turn", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: op17RocksDXebec039, hand: [op17Ganzui043], activeDon: 5 },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();

    south.play(op17Ganzui043);
    expect(south.view().players.south.leader.power).toBe(6000);

    south.endTurn();
    expect(engine.getView("south").players.south.leader.power).toBe(6000);
    engine.asNorth().endTurn();
    expect(engine.getView("south").players.south.leader.power).toBe(5000);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("a battle K.O. is replaced by trashing 2 chosen cards from hand", () => {
    const engine = attackedGanzui([eb01Doma005, op13Higuma013, eb01Doma005]);
    const south = engine.asSouth();
    const north = engine.asNorth();
    const ganzuiId = north.findOnField(op17Ganzui043);
    const higumaId = engine.findCardInZone("north", "hand", op13Higuma013);
    const state = engine.getState();
    const domaIds = state.players.north.hand.filter(
      (instanceId) => state.cards[instanceId]?.cardId === eb01Doma005.id,
    );

    // 7000 attacker against a 7000 Ganzui: K.O. without the replacement.
    south.attack(eb01MountainGod018, ganzuiId);
    north.chooseCounter();
    north.chooseOption("battleKoReplacement", "yes");
    north.trashFromHand(...domaIds);

    expect(northCharacterIds(engine)).toContain(ganzuiId);
    expect(north.view().players.north.hand.map((card) => card.instanceId)).toEqual([higumaId]);
    expect(new Set(north.view().players.north.trash.map((card) => card.instanceId))).toEqual(
      new Set(domaIds),
    );
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("declining lets the battle K.O. happen", () => {
    const engine = attackedGanzui([eb01Doma005, op13Higuma013]);
    const south = engine.asSouth();
    const north = engine.asNorth();
    const ganzuiId = north.findOnField(op17Ganzui043);

    south.attack(eb01MountainGod018, ganzuiId);
    north.chooseCounter();
    north.chooseOption("battleKoReplacement", "no");

    expect(northCharacterIds(engine)).not.toContain(ganzuiId);
    expect(north.view().players.north.hand).toHaveLength(2);
  });

  test("with only 1 card in hand the replacement is not offered", () => {
    const engine = attackedGanzui([eb01Doma005]);
    const south = engine.asSouth();
    const north = engine.asNorth();
    const ganzuiId = north.findOnField(op17Ganzui043);

    south.attack(eb01MountainGod018, ganzuiId);
    north.chooseCounter();

    expect(north.hasPendingChoice()).toBe(false);
    expect(northCharacterIds(engine)).not.toContain(ganzuiId);
    expect(north.view().players.north.hand).toHaveLength(1);
  });

  test("an opposing removal effect is replaced too", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17RocksDXebec039,
        hand: [eb01Doma005, op13Higuma013],
        character: [op17Ganzui043],
      },
      { hand: [op17Gloriosa046], activeDon: 10 },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const south = engine.asSouth();
    const north = engine.asNorth();
    const ganzuiId = south.findOnField(op17Ganzui043);

    north.play(op17Gloriosa046);
    north.chooseTargets(ganzuiId);
    south.chooseOption("effectRemovalReplacement", "yes");

    expect(south.view().players.south.characters.map((card) => card?.instanceId)).toContain(
      ganzuiId,
    );
    expect(south.view().players.south.hand).toHaveLength(0);
    expect(south.view().players.south.trash).toHaveLength(2);
  });
});
