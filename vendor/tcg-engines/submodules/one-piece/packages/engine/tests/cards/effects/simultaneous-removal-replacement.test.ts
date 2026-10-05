import { describe, expect, test } from "vite-plus/test";
import type { EventCard } from "@tcg/op-types";
import {
  eb01Doma005,
  eb01Fourtricks025,
  eb01OffWhite019,
  op02IceAge117,
  op15Leo052,
  op15Perona090,
  op17Loki119,
  op17Nami086,
} from "@tcg/op-cards";

import { registerCards } from "../../../../cards/src/runtime-catalog.ts";
import { OnePieceTestEngine } from "../../../src/index.ts";

// Rule 8-1-3-4-4: a replacement effect replaces the whole part of the
// processing it names. When one effect removes several Characters at the same
// time, one application of a replacement that covers them saves all of them.
// OP15 FAQ, OP15-090 Perona: "If two of my Characters with 7000 base power or
// less would be simultaneously removed from the field by my opponent's effect"
// -> "trash 1 of your cards to keep both Characters on the field". The effect
// K.O. path already grouped targets this way; this covers the non-K.O.
// removal path (return to hand / deck, trash).

const bounceTwoEvent: EventCard = {
  ...eb01OffWhite019,
  id: "TEST-BOUNCE-TWO",
  canonicalId: "TEST-BOUNCE-TWO",
  name: "Test Bounce Two",
  cost: 0,
  effect: "[Main] Return up to 2 of your opponent's Characters to the owner's hand.",
  effects: {
    effects: [
      {
        trigger: "main",
        actions: [
          {
            action: "returnToHand",
            target: {
              player: "opponent",
              zones: ["character"],
              count: { amount: 2, upTo: true },
            },
          },
        ],
      },
    ],
  },
};

registerCards([bounceTwoEvent]);

function setup() {
  const engine = OnePieceTestEngine.create(
    {
      character: [op15Perona090, eb01Doma005, eb01Fourtricks025],
      hand: [op02IceAge117, eb01Doma005],
    },
    { hand: [bounceTwoEvent] },
    { firstPlayer: "south", activeSeat: "north" },
  );
  return {
    engine,
    domaId: engine.findCardInZone("south", "character", eb01Doma005),
    fourtricksId: engine.findCardInZone("south", "character", eb01Fourtricks025),
    iceAgeId: engine.findCardInZone("south", "hand", op02IceAge117),
  };
}

function southCharacterIds(engine: OnePieceTestEngine) {
  return engine
    .getView("south")
    .players.south.characters.map((card) => card?.instanceId)
    .filter(Boolean);
}

describe("simultaneous removal replacement (8-1-3-4-4)", () => {
  test("one Perona payment keeps both Characters returned to hand at the same time", () => {
    const { engine, domaId, fourtricksId, iceAgeId } = setup();

    engine.playCard(bounceTwoEvent, "north");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [domaId, fourtricksId] },
      "north",
    );
    engine.resolveDecision("effectRemovalReplacement", { optionId: "yes" }, "south");
    engine.resolveDecision("effectTrashFromHandSelection", { selectedIds: [iceAgeId] }, "south");

    const south = engine.getView("south").players.south;
    expect(southCharacterIds(engine)).toEqual(expect.arrayContaining([domaId, fourtricksId]));
    expect(south.trash.map((card) => card.instanceId)).toEqual([iceAgeId]);
    expect(south.hand).toHaveLength(1);
    // The single application covered both targets: no second offer.
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  // The FAQ's options are "keep both" or "let both be removed" (OP15 FAQ on
  // Perona and on OP15-052 Leo). 8-1-3-4-1: the declined replacement is not
  // applied, so it is not offered again for the second Character.
  test("declining once removes both Characters", () => {
    const { engine, domaId, fourtricksId } = setup();

    engine.playCard(bounceTwoEvent, "north");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [domaId, fourtricksId] },
      "north",
    );
    engine.resolveDecision("effectRemovalReplacement", { optionId: "no" }, "south");

    const south = engine.getView("south").players.south;
    expect(southCharacterIds(engine)).not.toContain(domaId);
    expect(southCharacterIds(engine)).not.toContain(fourtricksId);
    expect(south.hand).toHaveLength(4);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});

// OP15 FAQ, OP15-052 Leo: "If two of my Characters with 7000 base power or less
// would be simultaneously removed from the field by my opponent's effect, can
// I choose to place 2 of my Characters at the bottom of the owner's deck
// instead?" -> "you can either choose to place 1 of your Characters at the
// bottom of the owner's deck to keep both Characters on the field, or do
// nothing and let your opponent remove both Characters from the field."
describe("OP15-052 Leo: simultaneous effect K.O. (OP15 FAQ)", () => {
  function setupLeo() {
    const engine = OnePieceTestEngine.create(
      { character: [op15Leo052, eb01Doma005, op17Nami086], deck: 5 },
      { hand: [op17Loki119], activeDon: 6, deck: 5 },
      { firstPlayer: "south", activeSeat: "north" },
    );
    return {
      engine,
      leoId: engine.findCardInZone("south", "character", op15Leo052),
      domaId: engine.findCardInZone("south", "character", eb01Doma005),
      namiId: engine.findCardInZone("south", "character", op17Nami086),
    };
  }

  test("placing 1 Character keeps both K.O. targets on the field", () => {
    const { engine, leoId, domaId, namiId } = setupLeo();

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [domaId, namiId] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [leoId] }, "south");

    expect(southCharacterIds(engine)).toEqual([domaId, namiId]);
    expect(engine.getState().players.south.deck.at(-1)).toBe(leoId);
    expect(engine.getState().players.south.trash).toEqual([]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("doing nothing lets both be K.O.'d, with no second offer", () => {
    const { engine, leoId, domaId, namiId } = setupLeo();

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [domaId, namiId] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "no" }, "south");

    expect(southCharacterIds(engine)).toEqual([leoId]);
    expect(engine.getState().players.south.trash).toEqual([domaId, namiId]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
