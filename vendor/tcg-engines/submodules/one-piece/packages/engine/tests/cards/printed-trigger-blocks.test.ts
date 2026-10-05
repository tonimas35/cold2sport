import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  op01Sai012,
  op01Wire053,
  op03CharlotteSmoothie110,
  op03OneTwoJango039,
  op04Chaka008,
  op06AmaNoMurakumoSword056,
  op06Kamakiri102,
  op06Kawamatsu103,
  op08CharlottePudding058,
  op08ItSToDieFor076,
  op10TrafalgarLaw022,
  op11CharlotteKatakuri067,
  op12JewelryBonney101,
  op13BrilliantPunk059,
  op14eb04IceTime028,
  op15ImpactDial115,
  op17CharlotteCracker104,
  op17WoRoRoRoRoIThinkIVeSoberedUp076,
  op01RadicalBeam029,
} from "@tcg/op-cards";
import type { OPCard } from "@tcg/op-types";

import { OnePieceTestEngine, type PlayerFixture } from "../../src/index.ts";

/**
 * Cards whose printed [Trigger] (official card list) was missing from the
 * catalog: no `trigger` text and no `trigger` effect block, so a revealed Life
 * card offered no Trigger at all (10-1-5). Each test reveals the card from
 * North's Life with an attack and activates the Trigger.
 */

/** South's 7000 Mountain God attacks North's 5000 Leader; North's top Life is `card`. */
function revealFromLife(
  card: OPCard,
  north: PlayerFixture = {},
  south: PlayerFixture = {},
): { engine: OnePieceTestEngine; cardId: string } {
  const engine = OnePieceTestEngine.create(
    {
      ...south,
      character: [{ card: eb01MountainGod018, playedOnTurn: 0 }, ...(south.character ?? [])],
    },
    { ...north, life: [card, ...((north.life as OPCard[] | undefined) ?? [eb01Doma005])] },
    { firstPlayer: "north", activeSeat: "south" },
  );
  const cardId = engine.findCardInZone("north", "life", card);
  const attackerId = engine.findCardInZone("south", "character", eb01MountainGod018);
  engine.declareAttack(attackerId, engine.leader("north"), "south");
  // North has no Blocker; a hand card only opens an empty Counter Step.
  if (engine.getView("north").prompts.some((prompt) => prompt.seat === "north")) {
    try {
      engine.resolveDecision("battleCounter", { selectedIds: [] }, "north");
    } catch {
      // No Counter Step was open.
    }
  }
  return { engine, cardId };
}

function activateTrigger(engine: OnePieceTestEngine) {
  engine.resolveDecision("lifeTrigger", { optionId: "activate" }, "north");
}

function targets(engine: OnePieceTestEngine, seat: "north" | "south" = "north") {
  const step = engine.pendingDecision("effectTargetSelection", seat).steps[0];
  if (step?.kind !== "selectEntity") throw new Error("Expected a target selection.");
  return step.candidates.map((candidate) => candidate.ref.id);
}

describe("printed [Trigger] blocks added from the official card list", () => {
  test("EB04-028 Ice Time: returns a cost-5-or-less Character to its owner's hand", () => {
    const { engine, cardId } = revealFromLife(
      op14eb04IceTime028,
      {},
      { character: [op11CharlotteKatakuri067] },
    );
    activateTrigger(engine);
    const attackerId = engine.findCardInZone("south", "character", eb01MountainGod018);
    const expensiveId = engine.findCardInZone("south", "character", op11CharlotteKatakuri067);
    expect(targets(engine)).toContain(attackerId);
    expect(targets(engine)).not.toContain(expensiveId);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [attackerId] }, "north");

    expect(engine.getView("south").players.south.hand.map((card) => card.instanceId)).toContain(
      attackerId,
    );
    const view = engine.getView("north");
    expect(view.players.north.trash.map((card) => card.instanceId)).toContain(cardId);
    expect(view.prompts).toHaveLength(0);
  });

  test("OP01-029 Radical Beam!!: up to 1 Leader or Character gains +1000 this turn", () => {
    const { engine } = revealFromLife(op01RadicalBeam029);
    activateTrigger(engine);
    const leaderId = engine.leader("north");
    expect(targets(engine)).toContain(leaderId);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [leaderId] }, "north");

    expect(engine.getView("north").players.north.leader.power).toBe(6000);
    expect(engine.getView("north").prompts).toHaveLength(0);
  });

  test("OP03-039 One, Two, Jango: rests a cost-4-or-less opposing Character", () => {
    const { engine } = revealFromLife(op03OneTwoJango039, {}, { character: [op04Chaka008] });
    activateTrigger(engine);
    const chakaId = engine.findCardInZone("south", "character", op04Chaka008);
    const attackerId = engine.findCardInZone("south", "character", eb01MountainGod018);
    expect(targets(engine)).toContain(chakaId);
    expect(targets(engine)).not.toContain(attackerId);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [chakaId] }, "north");

    const chaka = engine
      .getView("north")
      .players.south.characters.find((card) => card?.instanceId === chakaId);
    expect(chaka?.rested).toBe(true);
  });

  test("OP03-110 Charlotte Smoothie: may trash 1 card from hand to play itself", () => {
    const { engine, cardId } = revealFromLife(op03CharlotteSmoothie110, {
      hand: [op04Chaka008, op01Sai012],
    });
    const chakaId = engine.findCardInZone("north", "hand", op04Chaka008);
    const saiId = engine.findCardInZone("north", "hand", op01Sai012);
    activateTrigger(engine);
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "north");
    engine.resolveDecision("effectCostTrashFromHand", { selectedIds: [chakaId] }, "north");

    const north = engine.getView("north").players.north;
    expect(north.characters.map((card) => card?.instanceId)).toContain(cardId);
    expect(north.trash.map((card) => card.instanceId)).toEqual([chakaId]);
    expect(north.hand.map((card) => card.instanceId)).toEqual([saiId]);
  });

  test("OP03-110 Charlotte Smoothie: declining the cost keeps the hand and trashes Smoothie", () => {
    const { engine, cardId } = revealFromLife(op03CharlotteSmoothie110, { hand: [op04Chaka008] });
    const chakaId = engine.findCardInZone("north", "hand", op04Chaka008);
    activateTrigger(engine);
    engine.resolveDecision("effectOptional", { optionId: "no" }, "north");

    const north = engine.getView("north").players.north;
    expect(north.characters.map((card) => card?.instanceId)).not.toContain(cardId);
    expect(north.hand.map((card) => card.instanceId)).toEqual([chakaId]);
    expect(north.trash.map((card) => card.instanceId)).toEqual([cardId]);
  });

  test("OP06-056 Ama no Murakumo Sword: activates its [Main] (opposing cost-2-or-less to the deck bottom)", () => {
    const { engine } = revealFromLife(op06AmaNoMurakumoSword056, {}, { character: [op01Wire053] });
    activateTrigger(engine);
    const wireId = engine.findCardInZone("south", "character", op01Wire053);
    expect(targets(engine)).toContain(wireId);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [wireId] }, "north");

    const state = engine.getState();
    expect(state.players.south.deck.at(-1)).toBe(wireId);
    expect(
      engine.getView("north").players.south.characters.map((card) => card?.instanceId),
    ).not.toContain(wireId);
  });

  test("OP06-102 Kamakiri: plays itself with 2 or less Life, not with 3", () => {
    const low = revealFromLife(op06Kamakiri102, { life: [eb01Doma005] });
    activateTrigger(low.engine);
    expect(
      low.engine.getView("north").players.north.characters.map((card) => card?.instanceId),
    ).toContain(low.cardId);

    const high = revealFromLife(op06Kamakiri102, { life: [eb01Doma005, eb01Doma005, eb01Doma005] });
    activateTrigger(high.engine);
    const north = high.engine.getView("north").players.north;
    expect(north.characters.map((card) => card?.instanceId)).not.toContain(high.cardId);
    expect(north.trash.map((card) => card.instanceId)).toContain(high.cardId);
  });

  test("OP06-103 Kawamatsu: plays itself while the opponent has 3 or less Life, not 4", () => {
    const low = revealFromLife(op06Kawamatsu103, {}, { life: 3 });
    activateTrigger(low.engine);
    expect(
      low.engine.getView("north").players.north.characters.map((card) => card?.instanceId),
    ).toContain(low.cardId);

    const high = revealFromLife(op06Kawamatsu103, {}, { life: 4 });
    activateTrigger(high.engine);
    expect(
      high.engine.getView("north").players.north.characters.map((card) => card?.instanceId),
    ).not.toContain(high.cardId);
  });

  test("OP08-076 It's to Die For...: adds 1 active DON!! from the DON!! deck", () => {
    const { engine } = revealFromLife(op08ItSToDieFor076, { donDeckCount: 2 });
    const before = engine.getView("north").players.north;
    activateTrigger(engine);
    engine.resolveDecision("effectAddDon", { optionId: "1" }, "north");

    const after = engine.getView("north").players.north;
    expect(after.activeDon).toBe(before.activeDon + 1);
    expect(after.donDeckCount).toBe(before.donDeckCount - 1);
  });

  test("OP12-101 Jewelry Bonney: plays itself only under a {Supernovas} Leader", () => {
    const yes = revealFromLife(op12JewelryBonney101, { leaderCardId: op10TrafalgarLaw022 });
    activateTrigger(yes.engine);
    expect(
      yes.engine.getView("north").players.north.characters.map((card) => card?.instanceId),
    ).toContain(yes.cardId);

    const no = revealFromLife(op12JewelryBonney101, { leaderCardId: op08CharlottePudding058 });
    activateTrigger(no.engine);
    expect(
      no.engine.getView("north").players.north.characters.map((card) => card?.instanceId),
    ).not.toContain(no.cardId);
  });

  test("OP13-059 Brilliant Punk: draws 1 card", () => {
    const { engine } = revealFromLife(op13BrilliantPunk059, { deck: [op01Sai012, eb01Doma005] });
    const saiId = engine.findCardInZone("north", "deck", op01Sai012);
    activateTrigger(engine);

    expect(engine.getView("north").players.north.hand.map((card) => card.instanceId)).toEqual([
      saiId,
    ]);
  });

  test("OP15-115 Impact Dial: K.O.s a cost-4-or-less opposing Character", () => {
    const { engine } = revealFromLife(op15ImpactDial115, {}, { character: [op04Chaka008] });
    activateTrigger(engine);
    const chakaId = engine.findCardInZone("south", "character", op04Chaka008);
    const attackerId = engine.findCardInZone("south", "character", eb01MountainGod018);
    expect(targets(engine)).toContain(chakaId);
    expect(targets(engine)).not.toContain(attackerId);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [chakaId] }, "north");

    expect(engine.getView("north").players.south.trash.map((card) => card.instanceId)).toContain(
      chakaId,
    );
  });

  test("OP17-076 Wo Ro Ro Ro Ro...: DON!! -1 to draw 2 cards", () => {
    const { engine } = revealFromLife(op17WoRoRoRoRoIThinkIVeSoberedUp076, {
      activeDon: 1,
      deck: [op01Sai012, op01Wire053, eb01Doma005],
    });
    const saiId = engine.findCardInZone("north", "deck", op01Sai012);
    const wireId = engine.findCardInZone("north", "deck", op01Wire053);
    const before = engine.getView("north").players.north;
    activateTrigger(engine);

    const after = engine.getView("north").players.north;
    expect(after.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([saiId, wireId]),
    );
    expect(after.hand).toHaveLength(2);
    expect(after.activeDon).toBe(before.activeDon - 1);
    expect(after.donDeckCount).toBe(before.donDeckCount + 1);
  });

  test("OP17-104 Charlotte Cracker: plays itself; its [Your Turn] [On Play] stays off", () => {
    // Two active DON!! could pay the [On Play] rest cost, but it is the opponent's turn.
    const { engine, cardId } = revealFromLife(op17CharlotteCracker104, {
      leaderCardId: op08CharlottePudding058,
      activeDon: 2,
    });
    activateTrigger(engine);

    const north = engine.getView("north").players.north;
    expect(north.characters.map((card) => card?.instanceId)).toContain(cardId);
    expect(north.activeDon).toBe(2);
    expect(engine.getView("north").prompts).toHaveLength(0);
  });
});
