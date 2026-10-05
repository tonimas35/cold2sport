import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  op03ThunderBolt121,
  op16EdwardNewgate003,
  op16Thatch005,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// "If you have a Character with 8000 power or more and a type including
// "Whitebeard Pirates" give this card in your hand -3 cost." The reduction is
// printed for the card in hand only. On the field Thatch (8000, Whitebeard
// Pirates) satisfies the condition himself, so applying it there would make
// him a cost-5 Character; he must keep his printed cost 8.

describe("OP16-005 Thatch", () => {
  test("is played for 5 under the condition and then costs 8 on the field", () => {
    const engine = OnePieceTestEngine.create(
      { character: [op16EdwardNewgate003], hand: [op16Thatch005], activeDon: 5 },
      {},
    );
    const thatchId = engine.findCardInZone("south", "hand", op16Thatch005);
    expect(engine.getView("south").players.south.hand[0]?.cost).toBe(5);

    engine.playCard(op16Thatch005, "south");

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 0, restedDon: 5 });
    expect(south.characters.find((card) => card?.instanceId === thatchId)?.cost).toBe(8);
  });

  test("on the field it is out of reach of an opponent's cost-5-or-less K.O.", () => {
    const engine = OnePieceTestEngine.create(
      { character: [op16Thatch005, eb01Doma005] },
      { hand: [op03ThunderBolt121], life: [eb01Doma005, eb01Doma005], activeDon: 2 },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const thatchId = engine.findCardInZone("south", "character", op16Thatch005);
    const domaId = engine.findCardInZone("south", "character", eb01Doma005);
    expect(
      engine.getView("south").players.south.characters.find((card) => card?.instanceId === thatchId)
        ?.cost,
    ).toBe(8);

    engine.playCard(op03ThunderBolt121, "north");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "north");
    const target = engine.pendingDecision("effectTargetSelection", "north").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected Thunder Bolt's K.O. target.");
    const legalIds = target.candidates
      .filter((candidate) => candidate.legal !== false)
      .map((candidate) => candidate.ref.id);
    expect(legalIds).toContain(domaId);
    expect(legalIds).not.toContain(thatchId);
    expect(() =>
      engine.resolveDecision("effectTargetSelection", { selectedIds: [thatchId] }, "north"),
    ).toThrow();
  });
});
