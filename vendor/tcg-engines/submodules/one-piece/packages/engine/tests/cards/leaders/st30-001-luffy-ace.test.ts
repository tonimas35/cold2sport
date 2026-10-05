import { describe, expect, test } from "vite-plus/test";
import {
  eb02Karoo001,
  eb03Ain002,
  op13MonkeyDLuffy001,
  op16PortgasDAce118,
  st30LuffyAce001,
  st30MonkeyDLuffy012,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// If you have a Character with 7000 base power or more, give this Leader
// −2000 power.
// [Opponent's Turn] All of your [Portgas.D.Ace] and [Monkey.D.Luffy] cards
// gain +3000 power.
describe("ST30-001 Luffy & Ace", () => {
  test("is a red/green 6000-power Leader with 4 Life", () => {
    const engine = OnePieceTestEngine.create({ leaderCardId: st30LuffyAce001 });
    const south = engine.getView("south").players.south;
    expect(south.leader.power).toBe(6000);
    expect(south.lifeCount).toBe(4);
    expect(st30LuffyAce001.color).toEqual(["red", "green"]);
  });

  test("gets −2000 once a Character with 7000 base power is played, not for a 6000 one with DON!!", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: st30LuffyAce001,
        hand: [eb02Karoo001],
        character: [{ card: eb03Ain002, attachedDon: 1 }],
        activeDon: 5,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const ainId = south.findOnField(eb03Ain002);

    // Ain has 7000 power with the given DON!!, but its base power is 6000.
    expect(
      south.view().players.south.characters.find((card) => card?.instanceId === ainId)?.power,
    ).toBe(7000);
    expect(south.view().players.south.leader.power).toBe(6000);

    south.play(eb02Karoo001);
    expect(south.view().players.south.leader.power).toBe(4000);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("with no Characters the Leader keeps its power (ST-30 FAQ)", () => {
    const engine = OnePieceTestEngine.create({ leaderCardId: st30LuffyAce001 });
    expect(engine.getView("south").players.south.characters.filter(Boolean)).toHaveLength(0);
    expect(engine.getView("south").players.south.leader.power).toBe(6000);
  });

  test("on the opponent's turn only its Luffy and Ace Characters gain +3000, so a 8000 attack fails", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: st30LuffyAce001,
        character: [{ card: st30MonkeyDLuffy012, rested: true }, op16PortgasDAce118, eb03Ain002],
      },
      { character: [{ card: eb02Karoo001, playedOnTurn: 0, attachedDon: 1 }] },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const luffyId = engine.findCardInZone("south", "character", st30MonkeyDLuffy012);
    const aceId = engine.findCardInZone("south", "character", op16PortgasDAce118);
    const ainId = engine.findCardInZone("south", "character", eb03Ain002);
    const powerOf = (id: string) =>
      engine.getView("south").players.south.characters.find((card) => card?.instanceId === id)
        ?.power;

    // Own turn: no boost.
    expect([powerOf(luffyId), powerOf(aceId), powerOf(ainId)]).toEqual([6000, 6000, 6000]);

    engine.endTurn("south");
    expect([powerOf(luffyId), powerOf(aceId), powerOf(ainId)]).toEqual([9000, 9000, 6000]);
    // The Leader is named "Luffy & Ace", not [Monkey.D.Luffy]: no +3000 (ST-30 FAQ).
    expect(engine.getView("south").players.south.leader.power).toBe(6000);

    // The boost is real battle power: Karoo (7000 + 1 DON!!) cannot K.O. a 9000 Luffy.
    const karooId = engine.findCardInZone("north", "character", eb02Karoo001);
    engine.attachDon(karooId, 1, "north");
    // South has no hand, so there is no Counter Step choice to make.
    engine.declareAttack(karooId, luffyId, "north");
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(
      engine.getView("south").players.south.characters.map((card) => card?.instanceId),
    ).toContain(luffyId);
    expect(engine.getState().capabilityHistory).toHaveLength(0);

    engine.endTurn("north");
    expect([powerOf(luffyId), powerOf(aceId), powerOf(ainId)]).toEqual([6000, 6000, 6000]);
  });

  test("the same 8000 attack K.O.s that Luffy under a Leader without the boost", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op13MonkeyDLuffy001,
        character: [{ card: st30MonkeyDLuffy012, rested: true }],
      },
      { character: [{ card: eb02Karoo001, playedOnTurn: 0, attachedDon: 1 }] },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const luffyId = engine.findCardInZone("south", "character", st30MonkeyDLuffy012);
    engine.endTurn("south");
    const karooId = engine.findCardInZone("north", "character", eb02Karoo001);
    engine.attachDon(karooId, 1, "north");
    // South has no hand, so there is no Counter Step choice to make.
    engine.declareAttack(karooId, luffyId, "north");
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getView("south").players.south.trash.map((card) => card.instanceId)).toContain(
      luffyId,
    );
  });
});
