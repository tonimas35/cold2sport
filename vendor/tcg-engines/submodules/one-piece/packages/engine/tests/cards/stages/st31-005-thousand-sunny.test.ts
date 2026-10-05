import { describe, expect, test } from "vite-plus/test";
import {
  eb03Ain002,
  op02RoronoaZoro043,
  op12DemonAuraNineSwordStyleAsuraBladesDrawnDeadManSGame037,
  op13MonkeyDLuffy001,
  st21MonkeyDLuffy014,
  st30LuffyAce001,
  st30MonkeyDLuffy012,
  st31ThousandSunny005,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [On Play] Look at 5 cards from the top of your deck; reveal up to 1
// {Straw Hat Crew} type card and add it to your hand. Then, place the rest at
// the bottom of your deck in any order.
// [Activate: Main] You may rest this Stage: Give up to 1 rested DON!! card to
// 1 of your [Monkey.D.Luffy] cards.
const asura = op12DemonAuraNineSwordStyleAsuraBladesDrawnDeadManSGame037;

describe("ST31-005 Thousand Sunny", () => {
  test("[On Play] reveals any Straw Hat Crew card (an Event too) and bottoms the rest", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: st30LuffyAce001,
        hand: [st31ThousandSunny005],
        deck: [eb03Ain002, asura, op02RoronoaZoro043, eb03Ain002, eb03Ain002, eb03Ain002],
        activeDon: 1,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const deck = engine.getState().players.south.deck;
    const asuraId = engine.findCardInZone("south", "deck", asura);
    const zoroId = engine.findCardInZone("south", "deck", op02RoronoaZoro043);
    const sixthId = deck[5]!;

    south.play(st31ThousandSunny005);
    const search = south.pendingDecision("effectSearchSelection").steps[0];
    if (search?.kind !== "selectEntity") throw new Error("Expected Thousand Sunny's search.");
    expect(search.candidates).toHaveLength(5);
    const legalIds = search.candidates
      .filter((candidate) => candidate.legal !== false)
      .map((candidate) => candidate.ref.id);
    expect(legalIds.sort()).toEqual([asuraId, zoroId].sort());
    south.chooseSearch(asuraId);
    const order = south.pendingDecision("effectSearchRemainderOrder").steps[0];
    if (order?.kind !== "orderItems") throw new Error("Expected the remainder order.");
    south.orderCards(
      "effectSearchRemainderOrder",
      order.candidates.map((candidate) => candidate.ref.id),
    );

    const view = south.view().players.south;
    expect(view.hand.map((card) => card.instanceId)).toEqual([asuraId]);
    expect(view.stage?.cardId).toBe(st31ThousandSunny005.id);
    expect(engine.getState().players.south.deck[0]).toBe(sixthId);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Activate: Main] rests the Stage to give a rested DON!! only to a [Monkey.D.Luffy] card", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: st30LuffyAce001,
        stage: st31ThousandSunny005,
        character: [st30MonkeyDLuffy012, eb03Ain002],
        activeDon: 1,
        restedDon: 2,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const luffyId = south.findOnField(st30MonkeyDLuffy012);
    const sunnyId = engine.findCardInZone("south", "stage", st31ThousandSunny005);

    south.activateMain(sunnyId);
    south.acceptOptional();
    south.chooseAmount(1);
    // The "Luffy & Ace" Leader and Ain are not [Monkey.D.Luffy]: Luffy is the
    // only legal recipient, so no recipient choice is asked.
    expect(south.view().prompts).toHaveLength(0);

    const view = south.view().players.south;
    expect(view.characters.find((card) => card?.instanceId === luffyId)?.attachedDon).toBe(1);
    expect(view).toMatchObject({ activeDon: 1, restedDon: 1 });
    expect(view.stage?.rested).toBe(true);
    // Resting the Stage is the cost: it cannot be activated again while rested.
    south.expectFailure({
      type: "activateEffect",
      sourceInstanceId: sunnyId,
      trigger: "activateMain",
    });
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("a [Monkey.D.Luffy] Leader is also a legal recipient", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op13MonkeyDLuffy001,
        stage: st31ThousandSunny005,
        character: [st21MonkeyDLuffy014],
        restedDon: 1,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const sunnyId = engine.findCardInZone("south", "stage", st31ThousandSunny005);
    const luffyId = south.findOnField(st21MonkeyDLuffy014);

    south.activateMain(sunnyId);
    south.acceptOptional();
    south.chooseAmount(1);
    const recipient = south.pendingDecision("effectTargetSelection").steps[0];
    if (recipient?.kind !== "selectEntity") throw new Error("Expected the Luffy recipient.");
    expect(recipient.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [south.leader(), luffyId].sort(),
    );
    south.chooseTargets(south.leader());
    expect(south.view().players.south.leader.attachedDon).toBe(1);
  });
});
