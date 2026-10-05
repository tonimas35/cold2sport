import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, eb01Fourtricks025, op15Mamaragan078 } from "@tcg/op-cards";
import type { EventCard } from "@tcg/op-types";

import { registerCards } from "../../../../cards/src/runtime-catalog.ts";
import {
  getLegalCommands,
  getPotentialCardCommands,
  OnePieceTestEngine,
} from "../../../src/index.ts";

// Rules 4-7-1/4-7-2 and 6-5-3-1: playing an Event from hand means paying its
// cost and activating its [Main] effect. Rule 8-3-1-3: an activation cost that
// cannot be paid in full cannot be paid at all, so that effect cannot be
// activated. Together: an Event whose mandatory [Main] activation cost cannot
// be paid cannot be played. Rule 8-3-1-4: a cost the text makes optional
// ("You may ...:") can be declined, so it does not block the play.

function testEvent(id: string, overrides: Partial<EventCard>): EventCard {
  return {
    ...op15Mamaragan078,
    id,
    canonicalId: id,
    slug: id.toLowerCase(),
    name: id,
    printings: [{ ...op15Mamaragan078.printings[0]!, id, artId: id }],
    ...overrides,
  };
}

// Cost 2 Event whose [Main] also rests 1 active DON!! (a mandatory ① cost).
const costTwoRestDonEvent = testEvent("TEST-EVENT-MAIN-REST-DON", {
  cost: 2,
  effects: {
    effects: [
      {
        trigger: "main",
        costs: [{ cost: "restDon", amount: 1 }],
        actions: [{ action: "draw", player: "self", amount: 1 }],
      },
    ],
  },
});

// [Main] Trash 1 card from your hand: Draw 2 cards. (mandatory cost)
const trashFromHandEvent = testEvent("TEST-EVENT-MAIN-TRASH-HAND", {
  cost: 0,
  effects: {
    effects: [
      {
        trigger: "main",
        costs: [{ cost: "trashFromHand", amount: 1 }],
        actions: [{ action: "draw", player: "self", amount: 2 }],
      },
    ],
  },
});

// [Main] You may return 1 DON!! card ...: Draw 1 card. (optional cost)
const optionalReturnDonEvent = testEvent("TEST-EVENT-MAIN-OPTIONAL-RETURN-DON", {
  cost: 0,
  effects: {
    effects: [
      {
        trigger: "main",
        optional: true,
        costs: [{ cost: "returnDon", amount: 1 }],
        actions: [{ action: "draw", player: "self", amount: 1 }],
      },
    ],
  },
});

registerCards([costTwoRestDonEvent, trashFromHandEvent, optionalReturnDonEvent]);

function isListedAsLegal(engine: OnePieceTestEngine, instanceId: string): boolean {
  return getLegalCommands(engine.getState(), "south").some(
    (command) => command.type === "playCard" && command.sourceId === instanceId,
  );
}

function expectUnplayable(engine: OnePieceTestEngine, instanceId: string) {
  expect(isListedAsLegal(engine, instanceId)).toBe(false);
  expect(
    getPotentialCardCommands(engine.getState(), "south").find(
      (command) => command.type === "playCard" && command.sourceId === instanceId,
    ),
  ).toMatchObject({ enabled: false, disabledReasonCode: "cost-unpayable" });
  const before = engine.getState();
  const result = engine.expectFailure({ type: "playCard", seat: "south", instanceId });
  expect(result.reason).toMatch(/\[Main\] activation cost cannot be paid/);
  // A rejected play changes nothing: the card stays in hand, no cost is paid
  // and no "could not be paid automatically" capability record is written.
  expect(engine.getState()).toBe(before);
  expect(engine.getState().players.south.hand).toContain(instanceId);
  expect(engine.getState().capabilityHistory).toHaveLength(0);
}

describe("Event [Main] activation costs (8-3-1-3)", () => {
  test("an Event whose DON!! −X cost exceeds the DON!! on the field cannot be played", () => {
    const engine = OnePieceTestEngine.create({
      hand: [op15Mamaragan078],
      deck: [eb01Doma005, eb01Fourtricks025],
      activeDon: 1,
      donDeckCount: 9,
    });
    const mamaraganId = engine.findCardInZone("south", "hand", op15Mamaragan078);

    expectUnplayable(engine, mamaraganId);
    expect(engine.getView("south").players.south).toMatchObject({
      activeDon: 1,
      donDeckCount: 9,
    });
  });

  test("DON!! given to Leaders or Characters and rested DON!! count toward DON!! −X (8-3-1-6)", () => {
    const engine = OnePieceTestEngine.create({
      hand: [op15Mamaragan078],
      deck: [eb01Doma005, eb01Fourtricks025],
      character: [{ card: eb01Doma005, attachedDon: 1 }],
      activeDon: 0,
      restedDon: 1,
      donDeckCount: 8,
    });
    const mamaraganId = engine.findCardInZone("south", "hand", op15Mamaragan078);
    const domaId = engine.findCardInZone("south", "character", eb01Doma005);
    expect(isListedAsLegal(engine, mamaraganId)).toBe(true);

    engine.playCard(op15Mamaragan078, "south");

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 0, restedDon: 0, donDeckCount: 10 });
    expect(south.characters.find((card) => card?.instanceId === domaId)?.attachedDon).toBe(0);
    expect(south.hand).toHaveLength(1);
    expect(south.trash.map((card) => card.instanceId)).toContain(mamaraganId);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("the Event's own cost is paid before its [Main] activation cost", () => {
    const short = OnePieceTestEngine.create({
      hand: [costTwoRestDonEvent],
      deck: [eb01Doma005],
      activeDon: 2,
    });
    // Two active DON!! pay the printed cost of 2 but leave none for ①.
    expectUnplayable(short, short.findCardInZone("south", "hand", costTwoRestDonEvent));

    const enough = OnePieceTestEngine.create({
      hand: [costTwoRestDonEvent],
      deck: [eb01Doma005],
      activeDon: 3,
    });
    enough.playCard(costTwoRestDonEvent, "south");
    const south = enough.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 0, restedDon: 3 });
    expect(south.hand.map((card) => card.cardId)).toEqual([eb01Doma005.id]);
    expect(enough.getState().capabilityHistory).toHaveLength(0);
  });

  test("an Event cannot trash itself to pay its own trash-from-hand cost", () => {
    const alone = OnePieceTestEngine.create({
      hand: [trashFromHandEvent],
      deck: [eb01Doma005, eb01Fourtricks025],
    });
    expectUnplayable(alone, alone.findCardInZone("south", "hand", trashFromHandEvent));

    const withFodder = OnePieceTestEngine.create({
      hand: [trashFromHandEvent, eb01Doma005],
      deck: [eb01Fourtricks025, eb01Fourtricks025],
    });
    const fodderId = withFodder.findCardInZone("south", "hand", eb01Doma005);
    withFodder.playCard(trashFromHandEvent, "south");
    const south = withFodder.getView("south").players.south;
    expect(south.trash.map((card) => card.instanceId)).toContain(fodderId);
    expect(south.hand.map((card) => card.cardId)).toEqual([
      eb01Fourtricks025.id,
      eb01Fourtricks025.id,
    ]);
    expect(withFodder.getState().capabilityHistory).toHaveLength(0);
  });

  test("an optional activation cost that cannot be paid does not block the play (8-3-1-4)", () => {
    const engine = OnePieceTestEngine.create({
      hand: [optionalReturnDonEvent],
      deck: [eb01Doma005],
      activeDon: 0,
      donDeckCount: 10,
    });
    const eventId = engine.findCardInZone("south", "hand", optionalReturnDonEvent);
    expect(isListedAsLegal(engine, eventId)).toBe(true);

    engine.playCard(optionalReturnDonEvent, "south");

    // The cost is not paid, so the effect after the colon is not activated.
    const south = engine.getView("south").players.south;
    expect(south.hand).toHaveLength(0);
    expect(south.trash.map((card) => card.instanceId)).toContain(eventId);
    expect(south.donDeckCount).toBe(10);
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});
