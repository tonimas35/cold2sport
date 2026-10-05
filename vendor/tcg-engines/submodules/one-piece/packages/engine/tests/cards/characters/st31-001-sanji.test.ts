import { describe, expect, test } from "vite-plus/test";
import {
  eb03Ain002,
  op02RoronoaZoro043,
  op04Sanji007,
  op09Jinbe067,
  op11Usopp003,
  st30LuffyAce001,
  st31Sanji001,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [DON!! x2] This Character gains [Rush].
// [On Play] Draw 1 card and play up to 1 {Straw Hat Crew} type Character card
// with a cost of 5 or less other than [Sanji] from your hand.
describe("ST31-001 Sanji", () => {
  test("draws first, then plays a cost-5-or-less Straw Hat Crew Character other than Sanji", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: st30LuffyAce001,
        hand: [st31Sanji001, op04Sanji007, op09Jinbe067, eb03Ain002, op11Usopp003],
        deck: [op02RoronoaZoro043, eb03Ain002],
        activeDon: 5,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const zoroId = engine.findCardInZone("south", "deck", op02RoronoaZoro043);
    const usoppId = engine.findCardInZone("south", "hand", op11Usopp003);
    const otherSanjiId = engine.findCardInZone("south", "hand", op04Sanji007);
    const jinbeId = engine.findCardInZone("south", "hand", op09Jinbe067);
    const ainId = engine.findCardInZone("south", "hand", eb03Ain002);

    south.play(st31Sanji001);
    // Paying 5 leaves no DON!!: the play from hand is free.
    expect(south.view().players.south.activeDon).toBe(0);
    const play = south.pendingDecision("effectPlaySelection").steps[0];
    expect(play).toMatchObject({ kind: "selectEntity", min: 0, max: 1 });
    if (play?.kind !== "selectEntity") throw new Error("Expected Sanji's play choice.");
    const legalIds = play.candidates
      .filter((candidate) => candidate.legal !== false)
      .map((candidate) => candidate.ref.id);
    // The drawn Zoro (cost 4) and Usopp (cost 5) qualify; the other [Sanji],
    // the cost-7 Jinbe and the non-Straw Hat Ain do not.
    expect(legalIds.sort()).toEqual([zoroId, usoppId].sort());
    expect(legalIds).not.toContain(otherSanjiId);
    expect(legalIds).not.toContain(jinbeId);
    expect(legalIds).not.toContain(ainId);
    south.choosePlay(zoroId);

    const view = south.view().players.south;
    expect(view.characters.filter(Boolean).map((card) => card!.instanceId)).toContain(zoroId);
    expect(view.hand).toHaveLength(4);
    expect(view.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([otherSanjiId, jinbeId, ainId, usoppId]),
    );
    expect(view.deckCount).toBe(1);
    expect(south.view().prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("may play nothing after drawing", () => {
    const engine = OnePieceTestEngine.create(
      { hand: [st31Sanji001, op02RoronoaZoro043], deck: [eb03Ain002, eb03Ain002], activeDon: 5 },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    south.play(st31Sanji001);
    south.chooseNoPlay();
    const view = south.view().players.south;
    expect(view.characters.filter(Boolean)).toHaveLength(1);
    expect(view.hand).toHaveLength(2);
    expect(view.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining([eb03Ain002.id, op02RoronoaZoro043.id]),
    );
  });

  test("[DON!! x2] gives [Rush]: it can attack the turn it is played only with 2 DON!! given", () => {
    const engine = OnePieceTestEngine.create(
      { hand: [st31Sanji001], deck: [eb03Ain002, eb03Ain002], activeDon: 7 },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    south.play(st31Sanji001);
    const sanjiId = south.findOnField(st31Sanji001);
    // Ain is not a Straw Hat Crew Character: nothing to play.
    expect(south.view().prompts).toHaveLength(0);

    south.attachDon(sanjiId, 1);
    south.expectFailure({
      type: "declareAttack",
      attackerId: sanjiId,
      targetId: south.opponentLeader(),
    });

    south.attachDon(sanjiId, 1);
    south.attack(sanjiId, south.opponentLeader());
    expect(
      south.view().players.south.characters.find((card) => card?.instanceId === sanjiId)?.rested,
    ).toBe(true);
  });
});
