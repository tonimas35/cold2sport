import { describe, expect, test } from "vite-plus/test";
import { op11Arlong023 } from "../../../../cards/src/cards/characters/op11-023-arlong.ts";
import { op14eb04Killer005 } from "../../../../cards/src/cards/characters/op14-005-killer.ts";
import { op14eb04JinbeOp14040040 } from "../../../../cards/src/cards/leaders/op14-040-jinbe-op14-040.ts";
import { OnePieceTestEngine } from "../../../src/index.ts";

describe("OP11-023 Arlong", () => {
  // "give this card in your hand -3 cost": printed cost 7 becomes 4 (it was
  // wrongly imported as "set the cost to 3").
  test("costs 4 (7 - 3) in hand when all three printed conditions are met", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op14eb04JinbeOp14040040,
        hand: [op11Arlong023],
        life: 3,
        activeDon: 4,
      },
      {
        character: Array.from({ length: 5 }, () => ({
          card: op14eb04Killer005,
          rested: true,
        })),
      },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const arlongId = engine.findCardInZone("south", "hand", op11Arlong023);
    const projectedArlong = engine
      .getView("south")
      .players.south.hand.find((card) => card.instanceId === arlongId);

    expect(projectedArlong?.cost).toBe(4);
    engine.playCard(op11Arlong023);

    expect(engine.findCardInZone("south", "character", op11Arlong023)).toBe(arlongId);
    expect(engine.getState().players.south.activeDon).toBe(0);
    expect(engine.getState().players.south.restedDon).toBe(4);
    expect(engine.getState().capabilityHistory).toEqual([]);
  });

  test("with only 3 DON!! it cannot be played even when the conditions are met", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op14eb04JinbeOp14040040,
        hand: [op11Arlong023],
        life: 3,
        activeDon: 3,
      },
      {
        character: Array.from({ length: 5 }, () => ({
          card: op14eb04Killer005,
          rested: true,
        })),
      },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const arlongId = engine.findCardInZone("south", "hand", op11Arlong023);
    expect(
      engine.expectFailure({ type: "playCard", seat: "south", instanceId: arlongId }).accepted,
    ).toBe(false);
    expect(engine.findCardInZone("south", "hand", op11Arlong023)).toBe(arlongId);
  });
});
