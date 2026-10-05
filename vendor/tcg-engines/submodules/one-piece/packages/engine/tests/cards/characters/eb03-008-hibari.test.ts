import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, eb03Hibari008, op11XDrake017 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// The SWORD recipient is OP11-017 X.Drake (Navy/SWORD/Drake Pirates). These
// tests used OP11-012 Franky, whose imported type was wrongly "Navy SWORD":
// the official card list gives Franky the {Straw Hat Crew} type only.
describe("EB03-008 Hibari", () => {
  test("maps her On Play SWORD recipient, active-Character attack, and once-per-turn reduction", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [eb03Hibari008],
        character: [
          { card: op11XDrake017, playedOnTurn: 0 },
          { card: eb01Doma005, playedOnTurn: 0 },
        ],
        activeDon: 3,
      },
      {
        character: [{ card: eb01Doma005, playedOnTurn: 0 }],
      },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const swordId = engine.findCardInZone("south", "character", op11XDrake017);
    const wrongTraitId = engine.findCardInZone("south", "character", eb01Doma005);
    const opposingId = engine.findCardInZone("north", "character", eb01Doma005);

    engine.playCard(eb03Hibari008, "south");
    const hibariId = engine.findCardInZone("south", "character", eb03Hibari008);
    const attackRecipient = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    expect(attackRecipient?.kind).toBe("selectEntity");
    if (attackRecipient?.kind !== "selectEntity") {
      throw new Error("Expected Hibari's SWORD attack recipient.");
    }
    expect(attackRecipient.candidates.map((candidate) => candidate.ref.id)).toEqual([
      swordId,
      hibariId,
    ]);
    expect(attackRecipient.candidates.map((candidate) => candidate.ref.id)).not.toContain(
      wrongTraitId,
    );
    engine.resolveDecision("effectTargetSelection", { selectedIds: [swordId] }, "south");

    engine.activateEffect(hibariId, "activateMain", "south");
    const reduction = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    expect(reduction?.kind).toBe("selectEntity");
    if (reduction?.kind !== "selectEntity") {
      throw new Error("Expected Hibari's opposing power target.");
    }
    expect(reduction.candidates.map((candidate) => candidate.ref.id)).toEqual([opposingId]);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [opposingId] }, "south");

    expect(
      engine
        .getView("south")
        .players.north.characters.find((card) => card?.instanceId === opposingId)?.power,
    ).toBe(2000);
    engine.declareAttack(swordId, opposingId, "south");
    expect(engine.getView("south").players.north.trash.map((card) => card.instanceId)).toContain(
      opposingId,
    );
    expect(
      engine.expectFailure({
        type: "activateEffect",
        seat: "south",
        sourceInstanceId: hibariId,
        trigger: "activateMain",
      }).reason,
    ).toBe("This effect has already been used this turn.");
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("maps the same SWORD active-attack permission from When Attacking", () => {
    const engine = OnePieceTestEngine.create(
      {
        character: [
          { card: eb03Hibari008, playedOnTurn: 0 },
          { card: op11XDrake017, playedOnTurn: 0 },
        ],
      },
      {
        character: [{ card: eb01Doma005, playedOnTurn: 0 }],
      },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const hibariId = engine.findCardInZone("south", "character", eb03Hibari008);
    const swordId = engine.findCardInZone("south", "character", op11XDrake017);
    const activeTargetId = engine.findCardInZone("north", "character", eb01Doma005);

    engine.declareAttack(hibariId, engine.leader("north"), "south");
    const recipient = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    expect(recipient?.kind).toBe("selectEntity");
    if (recipient?.kind !== "selectEntity") {
      throw new Error("Expected Hibari's When Attacking SWORD recipient.");
    }
    engine.resolveDecision("effectTargetSelection", { selectedIds: [swordId] }, "south");

    engine.declareAttack(swordId, activeTargetId, "south");
    engine.resolveDecision("battleCounter", { selectedIds: [] }, "north");
    expect(engine.getView("south").players.north.trash.map((card) => card.instanceId)).toContain(
      activeTargetId,
    );
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});
