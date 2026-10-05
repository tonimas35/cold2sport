import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, op08CharlotteLinlin069, op13Higuma013 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// Rule 8-3-1-1: a compound activation cost is paid in printed order. When the
// DON!! −X part has no real choice (every DON!! on the field sits in one pool),
// it is paid by default, but the following "trash 1 card from your hand" part
// must still let the player choose which card to trash.
describe("DON!! −X then trash-from-hand activation cost", () => {
  test("still asks which hand card to trash when every DON!! is rested in the cost area", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [op08CharlotteLinlin069, eb01Doma005, op13Higuma013],
        deck: [eb01Doma005, eb01Doma005],
        activeDon: 9,
        donDeckCount: 0,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const firstHandCardId = engine.findCardInZone("south", "hand", eb01Doma005);
    const chosenId = engine.findCardInZone("south", "hand", op13Higuma013);

    engine.playCard(op08CharlotteLinlin069, "south");
    expect(engine.getView("south").players.south).toMatchObject({ activeDon: 0, restedDon: 9 });
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");

    const trash = engine.pendingDecision("effectCostTrashFromHand", "south").steps[0];
    expect(trash).toMatchObject({ kind: "payCost", min: 1, max: 1 });
    if (trash?.kind !== "payCost") throw new Error("Expected the trash-from-hand cost choice.");
    expect(trash.candidates.map((candidate) => candidate.ref.id)).toEqual(
      expect.arrayContaining([firstHandCardId, chosenId]),
    );
    engine.resolveDecision("effectCostTrashFromHand", { selectedIds: [chosenId] }, "south");

    const view = engine.getView("south");
    expect(view.players.south.trash.map((card) => card.instanceId)).toContain(chosenId);
    expect(view.players.south.hand.map((card) => card.instanceId)).toContain(firstHandCardId);
    expect(view.players.south).toMatchObject({ restedDon: 8, donDeckCount: 1 });
  });

  test("asks for the DON!! to return first, then the hand card, when DON!! sit in several pools", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [op08CharlotteLinlin069, eb01Doma005, op13Higuma013],
        deck: [eb01Doma005, eb01Doma005],
        activeDon: 10,
        donDeckCount: 0,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const firstHandCardId = engine.findCardInZone("south", "hand", eb01Doma005);
    const chosenId = engine.findCardInZone("south", "hand", op13Higuma013);

    engine.playCard(op08CharlotteLinlin069, "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");

    const returnDon = engine.pendingDecision("effectCostReturnDon", "south").steps[0];
    expect(returnDon).toMatchObject({ kind: "payCost", min: 1, max: 1 });
    expect(() => engine.pendingDecision("effectCostTrashFromHand", "south")).toThrow();
    engine.resolveDecision("effectCostReturnDon", { selectedIds: ["active-don:0"] }, "south");

    engine.resolveDecision("effectCostTrashFromHand", { selectedIds: [chosenId] }, "south");

    const view = engine.getView("south");
    expect(view.players.south.trash.map((card) => card.instanceId)).toContain(chosenId);
    expect(view.players.south.hand.map((card) => card.instanceId)).toContain(firstHandCardId);
    expect(view.players.south).toMatchObject({ activeDon: 0, restedDon: 9, donDeckCount: 1 });
  });
});
