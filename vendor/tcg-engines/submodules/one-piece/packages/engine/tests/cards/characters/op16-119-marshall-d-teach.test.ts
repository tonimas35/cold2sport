import { describe, expect, test } from "vite-plus/test";
import { op13Higuma013, op15Enel118, op16MarshallDTeach119 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// OP16-119 Marshall.D.Teach: "[Trigger] Negate the effect of up to 1 of your
// opponent's Characters during this turn. Then, K.O. up to 1 of your
// opponent's Characters with a cost of 5 or less." (The [On Play] is covered
// in src/cards/OP16/characters/119-marshall-d-teach.test.ts.)
//
// The two targets are chosen independently. North's OP15-118 Enel (cost 6)
// shows the negate: with 6 or less DON!! on North's field it has +2000.

function takeDamageWithTeachOnTop() {
  const engine = OnePieceTestEngine.create(
    { life: [op16MarshallDTeach119, op13Higuma013] },
    { character: [op15Enel118, op13Higuma013], activeDon: 5 },
    { firstPlayer: "south", activeSeat: "north" },
  );
  engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
  return engine;
}

function northCharacter(engine: OnePieceTestEngine, card: { id: string }) {
  return engine
    .getView("south")
    .players.north.characters.find((entry) => entry?.cardId === card.id);
}

describe("OP16-119 Marshall.D.Teach", () => {
  test("[Trigger] negates one opposing Character, then K.O.s another with cost 5 or less", () => {
    const engine = takeDamageWithTeachOnTop();
    const south = engine.asSouth();
    const enelId = engine.findCardInZone("north", "character", op15Enel118);
    const higumaId = engine.findCardInZone("north", "character", op13Higuma013);
    expect(northCharacter(engine, op15Enel118)?.power).toBe(10000);

    south.activateLifeTrigger();
    const negate = south.pendingDecision("effectTargetSelection").steps[0];
    if (negate?.kind !== "selectEntity") throw new Error("Expected Teach's negate target.");
    expect(negate).toMatchObject({ min: 0, max: 1 });
    expect(negate.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [enelId, higumaId].sort(),
    );
    south.chooseTargets(enelId);
    expect(northCharacter(engine, op15Enel118)?.power).toBe(8000);

    const ko = south.pendingDecision("effectTargetSelection").steps[0];
    if (ko?.kind !== "selectEntity") throw new Error("Expected Teach's K.O. target.");
    // Enel costs 6, so only Higuma can be K.O.'d.
    expect(ko.candidates.map((candidate) => candidate.ref.id)).toEqual([higumaId]);
    south.chooseTargets(higumaId);

    const view = south.view();
    expect(view.players.north.trash.map((card) => card.instanceId)).toEqual([higumaId]);
    expect(view.players.south.trash.map((card) => card.cardId)).toEqual([op16MarshallDTeach119.id]);
    expect(view.prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Trigger] both choices are optional", () => {
    const engine = takeDamageWithTeachOnTop();
    const south = engine.asSouth();

    south.activateLifeTrigger();
    south.chooseNoTargets();
    south.chooseNoTargets();

    const view = south.view();
    expect(view.players.north.characters.filter(Boolean)).toHaveLength(2);
    expect(northCharacter(engine, op15Enel118)?.power).toBe(10000);
    expect(view.prompts).toHaveLength(0);
  });

  test("[Trigger] declined, Teach goes to the hand", () => {
    const engine = takeDamageWithTeachOnTop();
    const south = engine.asSouth();

    south.declineLifeTrigger();

    const view = south.view();
    expect(view.players.south.hand.map((card) => card.cardId)).toEqual([op16MarshallDTeach119.id]);
    expect(view.players.north.characters.filter(Boolean)).toHaveLength(2);
    expect(view.prompts).toHaveLength(0);
  });
});
