import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  op01UltiMortar118,
  op04Rebecca039,
  op15Mamaragan078,
  op15Sabo046,
} from "@tcg/op-cards";
import type { EventCard } from "@tcg/op-types";

import { registerCards } from "../../../../cards/src/runtime-catalog.ts";
import { getLegalCommands, OnePieceTestEngine } from "../../../src/index.ts";

// 8-4-1-3: activating an effect means paying all its activation costs, and
// 8-3-1-3: an activation cost that cannot be paid in full cannot be paid at
// all, so the effect cannot be activated. Patch 0007 applies this to playing
// an Event for its [Main]; the same holds when an Event is used in the
// Counter Step (7-1-3-1-2), activated by another effect ("activate 1 Event
// from your hand"), or has its [Main] activated by its own [Trigger] (rules
// FAQ on OP03-074 Top Knot: its [Main] cannot be activated without paying
// its DON!! −X).

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

// {Dressrosa} Events whose [Main] costs DON!! −8 / DON!! −1 (mandatory).
const dressrosaMinusEight = testEvent("TEST-DRESSROSA-MAIN-DON-MINUS-8", {
  cost: 1,
  traits: ["Dressrosa"],
  effects: {
    effects: [
      {
        trigger: "main",
        costs: [{ cost: "returnDon", amount: 8 }],
        actions: [{ action: "draw", player: "self", amount: 1 }],
      },
    ],
  },
});
const dressrosaMinusOne = testEvent("TEST-DRESSROSA-MAIN-DON-MINUS-1", {
  cost: 1,
  traits: ["Dressrosa"],
  effects: {
    effects: [
      {
        trigger: "main",
        costs: [{ cost: "returnDon", amount: 1 }],
        actions: [{ action: "draw", player: "self", amount: 1 }],
      },
    ],
  },
});
// [Main] DON!! −2: Draw 1 card. [Trigger] Activate this card's [Main] effect.
const triggerActivatesMain = testEvent("TEST-TRIGGER-ACTIVATES-MAIN-DON-MINUS-2", {
  cost: 1,
  trigger: "Activate this card's [Main] effect.",
  effects: {
    effects: [
      {
        trigger: "main",
        costs: [{ cost: "returnDon", amount: 2 }],
        actions: [{ action: "draw", player: "self", amount: 1 }],
      },
      { trigger: "trigger", actions: [{ action: "activateEffect", effectTrigger: "main" }] },
    ],
  },
});

registerCards([dressrosaMinusEight, dressrosaMinusOne, triggerActivatesMain]);

describe("Counter Step: an Event's mandatory [Counter] cost must be payable", () => {
  /** North's Doma (6000) attacks south's Leader; south holds the given hand. */
  function counterStep(south: { hand: EventCard[]; activeDon: number }) {
    const engine = OnePieceTestEngine.create(
      { hand: south.hand, activeDon: south.activeDon, deck: [eb01Doma005, eb01Doma005] },
      { character: [eb01Doma005], activeDon: 5 },
    );
    engine.endTurn("south");
    engine.asNorth().attack(eb01Doma005, engine.asSouth().leader());
    return engine;
  }

  function counterOption(engine: OnePieceTestEngine, instanceId: string) {
    const prompt = engine
      .getState()
      .promptQueue.find(
        (candidate) =>
          candidate.status === "pending" && candidate.resolutionContext?.intent === "battleCounter",
      );
    return prompt?.options.find((option) => option.id === instanceId);
  }

  test("OP01-118 Ulti-Mortar (DON!! −2) with 1 DON!! on the field is disabled and rejected", () => {
    const engine = counterStep({ hand: [op01UltiMortar118], activeDon: 1 });
    const mortarId = engine.findCardInZone("south", "hand", op01UltiMortar118);

    expect(counterOption(engine, mortarId)?.enabled).toBe(false);
    const promptId = engine.pendingDecision("battleCounter", "south").id;
    engine.expectFailure({
      type: "resolvePrompt",
      seat: "south",
      promptId,
      selectedIds: [mortarId],
    });
  });

  test("OP01-118 with 2 DON!! on the field can be used, and pays DON!! −2", () => {
    const engine = counterStep({ hand: [op01UltiMortar118], activeDon: 2 });
    const mortarId = engine.findCardInZone("south", "hand", op01UltiMortar118);

    expect(counterOption(engine, mortarId)?.enabled).toBe(true);
    engine.asSouth().chooseCounter(op01UltiMortar118);

    expect(engine.getView("south").players.south).toMatchObject({ activeDon: 0, restedDon: 0 });
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("two Events cannot share DON!! cards their DON!! −X costs both need", () => {
    // 3 DON!!: either Ulti-Mortar alone works (cost 1, then DON!! −2 from the
    // 3 DON!! still on the field), but both need 2 + 4 > 3.
    const engine = counterStep({ hand: [op01UltiMortar118, op01UltiMortar118], activeDon: 3 });
    const [firstId, secondId] = engine.getState().players.south.hand;

    expect(counterOption(engine, firstId!)?.enabled).toBe(true);
    expect(counterOption(engine, secondId!)?.enabled).toBe(true);
    const promptId = engine.pendingDecision("battleCounter", "south").id;
    engine.expectFailure({
      type: "resolvePrompt",
      seat: "south",
      promptId,
      selectedIds: [firstId!, secondId!],
    });
    engine.resolveDecision("battleCounter", { selectedIds: [firstId!] }, "south");
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});

describe("activateEvent: an Event whose mandatory [Main] cost cannot be paid is not a choice", () => {
  test("OP15-046 Sabo offers only the Dressrosa Event whose DON!! −X fits the field", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op04Rebecca039,
        hand: [op15Sabo046, dressrosaMinusEight, dressrosaMinusOne],
        deck: [eb01Doma005, eb01Doma005],
        activeDon: 7,
        donDeckCount: 3,
      },
      {},
    );
    const minusEightId = engine.findCardInZone("south", "hand", dressrosaMinusEight);
    const minusOneId = engine.findCardInZone("south", "hand", dressrosaMinusOne);

    // Sabo costs 7: 7 DON!! stay on the field, too few for DON!! −8.
    engine.playCard(op15Sabo046, "south");
    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the Event choice.");
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([minusOneId]);
    const promptId = engine.pendingDecision("effectTargetSelection", "south").id;
    engine.expectFailure({
      type: "resolvePrompt",
      seat: "south",
      promptId,
      selectedIds: [minusEightId],
    });

    engine.resolveDecision("effectTargetSelection", { selectedIds: [minusOneId] }, "south");
    const south = engine.getView("south").players.south;
    expect(south.donDeckCount).toBe(4);
    expect(south.hand.map((card) => card.instanceId)).toContain(minusEightId);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});

describe("[Trigger] Activate this card's [Main]: an unpayable [Main] cost is not activated", () => {
  function triggerFromLife(activeDon: number) {
    const engine = OnePieceTestEngine.create(
      {
        life: [triggerActivatesMain, eb01Doma005],
        deck: [eb01Doma005, eb01Doma005],
        activeDon,
        donDeckCount: 10 - activeDon,
      },
      { character: ["OP16-012"], activeDon: 5 },
    );
    engine.endTurn("south");
    // An empty hand means no Counter Step prompt: straight to the damage.
    engine.asNorth().attack("OP16-012", engine.asSouth().leader());
    engine.resolveDecision("lifeTrigger", { optionId: "activate" }, "south");
    return engine;
  }

  test("with 1 DON!! on the field the [Main] (DON!! −2) does nothing, with no judge record", () => {
    const engine = triggerFromLife(1);

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 1, donDeckCount: 9, handCount: 0 });
    expect(engine.getState().capabilityHistory).toHaveLength(0);
    expect(engine.getState().promptQueue.filter((p) => p.status === "pending")).toHaveLength(0);
  });

  test("with 2 DON!! on the field the [Main] pays DON!! −2 and draws", () => {
    const engine = triggerFromLife(2);

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 0, donDeckCount: 10, handCount: 1 });
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});

describe("a [Trigger] with a mandatory cost that cannot be paid cannot be activated", () => {
  test("its activate answer is disabled and rejected; skipping adds the card to hand", () => {
    // EB01-038 Oh Come My Way: "[Trigger] DON!! −1: Draw 2 cards."
    const engine = OnePieceTestEngine.create(
      { life: ["EB01-038", eb01Doma005], deck: [eb01Doma005, eb01Doma005] },
      { character: ["OP16-012"], activeDon: 5 },
    );
    engine.endTurn("south");
    engine.asNorth().attack("OP16-012", engine.asSouth().leader());
    const prompt = engine
      .getState()
      .promptQueue.find(
        (p) => p.status === "pending" && p.resolutionContext?.intent === "lifeTrigger",
      );
    expect(prompt?.options.find((option) => option.id === "activate")?.enabled).toBe(false);
    engine.expectFailure({
      type: "resolvePrompt",
      seat: "south",
      promptId: prompt!.id,
      optionId: "activate",
    });

    engine.resolveDecision("lifeTrigger", { optionId: "skip" }, "south");
    expect(engine.getView("south").players.south.hand.map((card) => card.cardId)).toEqual([
      "EB01-038",
    ]);
    expect(getLegalCommands(engine.getState(), "north").length).toBeGreaterThan(0);
  });
});
