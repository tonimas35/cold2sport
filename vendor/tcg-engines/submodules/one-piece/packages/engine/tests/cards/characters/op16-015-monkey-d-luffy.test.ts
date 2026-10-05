import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, eb01TBone049, op16MonkeyDLuffy015, op16PortgasDAce001 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// "If your Leader's card name includes "Ace" and you have 6 or more DON!!
// cards on your field, give this card in your hand -2 cost." The reduction is
// printed for the card in hand only: on the field Luffy keeps his printed 4.

describe("OP16-015 Monkey.D.Luffy", () => {
  test("is played for 2 under the condition and then costs 4 on the field", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: op16PortgasDAce001, hand: [op16MonkeyDLuffy015], activeDon: 6 },
      {},
    );
    const luffyId = engine.findCardInZone("south", "hand", op16MonkeyDLuffy015);
    expect(engine.getView("south").players.south.hand[0]?.cost).toBe(2);

    engine.playCard(op16MonkeyDLuffy015, "south");

    const south = engine.getView("south").players.south;
    // Paying 2 rests 2 of the 6 DON!!, so the 6-DON!!-on-field condition
    // still holds; the cost stays 4 because the card is no longer in hand.
    expect(south).toMatchObject({ activeDon: 4, restedDon: 2 });
    expect(south.characters.find((card) => card?.instanceId === luffyId)?.cost).toBe(4);
  });

  test("on the field under the condition it is out of reach of a cost-2-or-less K.O.", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op16PortgasDAce001,
        character: [op16MonkeyDLuffy015, eb01Doma005],
        activeDon: 6,
      },
      { hand: [eb01TBone049], activeDon: 5 },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const luffyId = engine.findCardInZone("south", "character", op16MonkeyDLuffy015);
    const domaId = engine.findCardInZone("south", "character", eb01Doma005);
    expect(
      engine.getView("south").players.south.characters.find((card) => card?.instanceId === luffyId)
        ?.cost,
    ).toBe(4);

    engine.playCard(eb01TBone049, "north");
    const target = engine.pendingDecision("effectTargetSelection", "north").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected T-Bone's K.O. target.");
    const legalIds = target.candidates
      .filter((candidate) => candidate.legal !== false)
      .map((candidate) => candidate.ref.id);
    expect(legalIds).toContain(domaId);
    expect(legalIds).not.toContain(luffyId);
  });
});
