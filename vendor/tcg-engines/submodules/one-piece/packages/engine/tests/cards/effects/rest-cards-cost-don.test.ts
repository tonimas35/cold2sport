import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005 } from "@tcg/op-cards";
import type { CharacterCard } from "@tcg/op-types";

import { registerCards } from "../../../../cards/src/runtime-catalog.ts";
import type { MatchSeat } from "../../../src/index.ts";
import { getLegalCommands, OnePieceTestEngine } from "../../../src/index.ts";

// "You may rest N of your cards:" (Cost restCards with no filter). OP14/EB04
// FAQ on OP14-020 Dracule Mihawk: "You can activate this effect by resting 1
// of your active Leader, Character, Stage, or DON!! cards." DON!! cards in the
// cost area are cards too, and the player chooses which card to rest whenever
// there is a real choice. A filtered cost ("rest 1 of your Characters") still
// names only those cards.

// "[Activate: Main] ① You may rest 1 of your cards: Draw 1 card." -- a DON!!
// card cannot pay both the ① (restDon) and the "rest 1 of your cards".
const restDonAndRestCard: CharacterCard = {
  ...eb01Doma005,
  id: "TEST-REST-DON-AND-REST-CARD",
  canonicalId: "TEST-REST-DON-AND-REST-CARD",
  slug: "test-rest-don-and-rest-card",
  name: "TEST-REST-DON-AND-REST-CARD",
  printings: [
    {
      ...eb01Doma005.printings[0]!,
      id: "TEST-REST-DON-AND-REST-CARD",
      artId: "TEST-REST-DON-AND-REST-CARD",
    },
  ],
  effects: {
    effects: [
      {
        trigger: "activateMain",
        optional: true,
        costs: [
          { cost: "restDon", amount: 1 },
          { cost: "restCards", amount: 1 },
        ],
        actions: [{ action: "draw", player: "self", amount: 1 }],
      },
    ],
  },
};
registerCards([restDonAndRestCard]);

function withRestedLeader(engine: OnePieceTestEngine, seat: MatchSeat): OnePieceTestEngine {
  const state = structuredClone(engine.getState());
  state.cards[state.players[seat].leaderInstanceId]!.rested = true;
  return OnePieceTestEngine.fromState(state);
}

/** North's 6000-power Benn.Beckman attacks south's 5000-power Shanks Leader. */
function northAttacksShanks(engine: OnePieceTestEngine) {
  engine.endTurn("south");
  engine.asNorth().attack("OP16-012", engine.asSouth().leader());
}

describe("rest N of your cards (restCards) can rest active DON!! cards", () => {
  test("OP17-037 [Counter]: with the Leader rested, an active DON!! pays the cost", () => {
    const engine = withRestedLeader(
      OnePieceTestEngine.create(
        { leaderCardId: "OP17-020", hand: ["OP17-037"], activeDon: 2 },
        { character: ["OP16-012"], activeDon: 5 },
      ),
      "south",
    );
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    northAttacksShanks(engine);
    engine.asSouth().chooseCounter("OP17-037");
    // The event cost rests 1 DON!!; the remaining active DON!! is the only
    // card to rest, so it is rested without a prompt.
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    expect(() => engine.pendingDecision("effectCostRestCards", "south")).toThrow();
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [engine.leader("south")] },
      "south",
    );

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 0, restedDon: 2, lifeCount: lifeBefore });
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("OP17-037 [Counter]: an active Leader and a DON!! are both offered", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: "OP17-020", hand: ["OP17-037"], activeDon: 2 },
      { character: ["OP16-012"], activeDon: 5 },
    );
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    northAttacksShanks(engine);
    engine.asSouth().chooseCounter("OP17-037");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    const cost = engine.pendingDecision("effectCostRestCards", "south").steps[0];
    if (cost?.kind !== "payCost") throw new Error("Expected the rest cost.");
    expect(cost.candidates.map((candidate) => candidate.ref.id)).toEqual([
      engine.leader("south"),
      "active-don:0",
    ]);
    engine.resolveDecision("effectCostRestCards", { selectedIds: ["active-don:0"] }, "south");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [engine.leader("south")] },
      "south",
    );

    const view = engine.getView("south");
    expect(view.players.south).toMatchObject({
      activeDon: 0,
      restedDon: 2,
      lifeCount: lifeBefore,
    });
    expect(view.players.south.leader.rested).toBe(false);
  });

  test("OP14-020 Mihawk asks whether to rest the Leader or a DON!! instead of resting the Leader", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP14-020",
        character: ["OP13-014"],
        activeDon: 1,
        restedDon: 2,
      },
      {},
    );
    const roguId = engine.findCardInZone("south", "character", "OP13-014");

    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    const cost = engine.pendingDecision("effectCostRestCards", "south").steps[0];
    if (cost?.kind !== "payCost") throw new Error("Expected the rest cost.");
    expect(cost.candidates.map((candidate) => candidate.ref.id)).toEqual([
      engine.leader("south"),
      roguId,
      "active-don:0",
    ]);
    engine.resolveDecision("effectCostRestCards", { selectedIds: ["active-don:0"] }, "south");

    const view = engine.getView("south");
    expect(view.players.south.leader.rested).toBe(false);
    expect(view.players.south.characters.find((c) => c?.instanceId === roguId)?.rested).toBe(false);
    expect(view.players.south).toMatchObject({ activeDon: 0, restedDon: 3 });
  });

  test("a DON!! id that is not one of the active DON!! cards is rejected", () => {
    const engine = OnePieceTestEngine.create({ leaderCardId: "OP14-020", activeDon: 1 }, {});

    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    const promptId = engine.pendingDecision("effectCostRestCards", "south").id;
    for (const selectedIds of [["active-don:1"], ["active-don:0", "active-don:0"], []]) {
      engine.expectFailure({ type: "resolvePrompt", seat: "south", promptId, selectedIds });
    }
  });

  test("with no active DON!!, the only active card is still rested without a prompt", () => {
    const engine = OnePieceTestEngine.create({ leaderCardId: "OP14-020", restedDon: 3 }, {});

    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    expect(() => engine.pendingDecision("effectCostRestCards", "south")).toThrow();

    expect(engine.getView("south").players.south.leader.rested).toBe(true);
  });

  test("one active DON!! cannot pay both a ① and a 'rest 1 of your cards' cost", () => {
    const rested = (activeDon: number) =>
      withRestedLeader(
        OnePieceTestEngine.create(
          {
            character: [{ card: restDonAndRestCard, rested: true, playedOnTurn: 0 }],
            deck: [eb01Doma005, eb01Doma005],
            activeDon,
          },
          {},
        ),
        "south",
      );
    const canActivate = (engine: OnePieceTestEngine) =>
      getLegalCommands(engine.getState(), "south").some(
        (command) => command.type === "activateEffect",
      );

    // Leader and Character rested: only DON!! can pay the rest-1 cost.
    expect(canActivate(rested(1))).toBe(false);
    const engine = rested(2);
    expect(canActivate(engine)).toBe(true);
    const sourceId = engine.findCardInZone("south", "character", restDonAndRestCard);
    engine.activateEffect(sourceId, "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    expect(engine.getView("south").players.south).toMatchObject({
      activeDon: 0,
      restedDon: 2,
      handCount: 1,
    });
  });

  test("a filtered cost ('rest 1 of your Characters') does not take DON!!", () => {
    // OP05-089 Saint Mjosgard: "You may rest 1 of your DON!! cards, this
    // Character and 1 of your other Characters: ...". Without another
    // Character the activation cannot be paid, however many DON!! are active.
    const engine = OnePieceTestEngine.create(
      { character: [{ cardId: "OP05-089", playedOnTurn: 0 }], activeDon: 5 },
      {},
    );
    const mjosgardId = engine.findCardInZone("south", "character", "OP05-089");

    const result = engine.expectFailure({
      type: "activateEffect",
      seat: "south",
      sourceInstanceId: mjosgardId,
      trigger: "activateMain",
    });
    expect(result.reason).toMatch(/activation costs cannot be paid/);
  });
});
