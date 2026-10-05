import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  eb04RobLucci048,
  op07RobLucci079,
  op13Higuma013,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// If your Leader's type includes "CP", this Character gains +1000 power and +2
// cost for every 5 cards in your trash.
// [On Play] You may trash 1 of your Characters: Draw 1 card.
//
// The engine had no block at all for this card (and its text read "-2 cost").
function onField(trash: number, leader: { id: string } = op07RobLucci079) {
  return OnePieceTestEngine.create(
    { leaderCardId: leader, character: [eb04RobLucci048], trash },
    {},
    { firstPlayer: "north", activeSeat: "south" },
  );
}

function lucci(engine: OnePieceTestEngine) {
  const id = engine.findCardInZone("south", "character", eb04RobLucci048);
  return engine.getView("south").players.south.characters.find((card) => card?.instanceId === id);
}

describe("EB04-048 Rob Lucci", () => {
  test("with a CP Leader it gains +1000 power and +2 cost per complete group of 5 trash cards", () => {
    expect(lucci(onField(4))).toMatchObject({ power: 6000, cost: 4 });
    expect(lucci(onField(5))).toMatchObject({ power: 7000, cost: 6 });
    expect(lucci(onField(9))).toMatchObject({ power: 7000, cost: 6 });
    expect(lucci(onField(10))).toMatchObject({ power: 8000, cost: 8 });
  });

  test("without a CP Leader the trash does not change it", () => {
    expect(lucci(onField(10, { id: "OP13-001" }))).toMatchObject({ power: 6000, cost: 4 });
  });

  test("in hand it still costs 4: the +2 cost is this Character's, on the field only", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: op07RobLucci079, hand: [eb04RobLucci048], trash: 10, activeDon: 4 },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const handId = engine.findCardInZone("south", "hand", eb04RobLucci048);
    expect(south.view().players.south.hand.find((card) => card.instanceId === handId)?.cost).toBe(
      4,
    );

    south.play(eb04RobLucci048);
    south.declineOptional();
    expect(lucci(engine)).toMatchObject({ power: 8000, cost: 8 });
    expect(south.view().players.south.activeDon).toBe(0);
  });

  test("[On Play] trashing 1 of your Characters draws 1 card", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op07RobLucci079,
        hand: [eb04RobLucci048],
        character: [eb01Doma005, eb01MountainGod018],
        deck: [op13Higuma013, eb01Doma005],
        activeDon: 4,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const domaId = south.findOnField(eb01Doma005);
    const godId = south.findOnField(eb01MountainGod018);

    south.play(eb04RobLucci048);
    south.acceptOptional();
    const cost = south.pendingDecision("effectCostTrashCharacter").steps[0];
    if (cost?.kind !== "payCost") throw new Error("Expected the trash-a-Character cost.");
    // Lucci himself is one of your Characters too.
    expect(cost.candidates).toHaveLength(3);
    south.choose("effectCostTrashCharacter", [domaId]);

    const view = south.view().players.south;
    expect(view.trash.map((card) => card.instanceId)).toEqual([domaId]);
    expect(view.characters.map((card) => card?.instanceId)).toContain(godId);
    expect(view.hand.map((card) => card.cardId)).toEqual([op13Higuma013.id]);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("declining the [On Play] keeps every Character and draws nothing", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op07RobLucci079,
        hand: [eb04RobLucci048],
        character: [eb01Doma005] as FixtureCardEntry[],
        activeDon: 4,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();

    south.play(eb04RobLucci048);
    south.declineOptional();

    const view = south.view().players.south;
    expect(view.hand).toHaveLength(0);
    expect(view.trash).toHaveLength(0);
    expect(view.characters.filter(Boolean)).toHaveLength(2);
  });
});
