import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  op15PiratesDockingSix088,
  op17Gerd081,
  op17MonkeyDLuffy079,
  op17MonkeyDLuffy093,
  op17RoronoaZoro095,
  prb02ThousandSunnyPirateFoil017,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// "This Character gains +6 cost." is Character text: by rule 2-8-2 it only
// works in the Character area. The OP17 FAQ answers the identical "+12 cost"
// wording (Dorry, Saul, Brook, Brogy): the card does not gain the cost in
// hand, trash or deck. So Docking Six is played for its printed 5 and is a
// cost-11 Character on the field (cost 12 with Thousand Sunny ST14-017, which
// the OP17-079 Luffy Leader turns into a [Blocker]).

function cardCost(engine: OnePieceTestEngine, instanceId: string) {
  const south = engine.getView("south").players.south;
  return [...south.hand, ...south.trash, ...south.characters].find(
    (card) => card?.instanceId === instanceId,
  )?.cost;
}

describe("OP15-088 Pirates Docking Six", () => {
  test("costs its printed 5 in hand, is played with 5 DON!!, and costs 11 on the field", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17MonkeyDLuffy079,
        hand: [op15PiratesDockingSix088],
        activeDon: 5,
        deck: 10,
      },
      {},
    );
    const dockingId = engine.findCardInZone("south", "hand", op15PiratesDockingSix088);
    expect(cardCost(engine, dockingId)).toBe(5);

    engine.playCard(op15PiratesDockingSix088, "south");
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 0, restedDon: 5 });
    expect(south.characters.map((card) => card?.instanceId)).toContain(dockingId);
    expect(cardCost(engine, dockingId)).toBe(11);
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("cannot be played with 4 DON!!", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: op17MonkeyDLuffy079, hand: [op15PiratesDockingSix088], activeDon: 4 },
      {},
    );

    expect(() => engine.playCard(op15PiratesDockingSix088, "south")).toThrow();
    expect(engine.getView("south").players.south.hand).toHaveLength(1);
  });

  test("[On Play] still replays a cost-2 Straw Hat Crew Character from the trash", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17MonkeyDLuffy079,
        hand: [op15PiratesDockingSix088],
        trash: [op17RoronoaZoro095],
        activeDon: 5,
        deck: 10,
      },
      {},
    );
    const zoroId = engine.findCardInZone("south", "trash", op17RoronoaZoro095);

    engine.playCard(op15PiratesDockingSix088, "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    const play = engine.pendingDecision("effectPlaySelection", "south").steps[0];
    if (play?.kind !== "selectEntity") throw new Error("Expected the replay choice.");
    expect(play.candidates.map((candidate) => candidate.ref.id)).toContain(zoroId);
    engine.resolveDecision("effectPlaySelection", { selectedIds: [zoroId] }, "south");

    const south = engine.getView("south").players.south;
    expect(south.characters.map((card) => card?.instanceId)).toContain(zoroId);
    expect(south.deckCount).toBe(7);
    expect(south.activeDon).toBe(0);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("with Thousand Sunny it costs 12 on the field and the Luffy Leader gives it [Blocker]", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17MonkeyDLuffy079,
        stage: prb02ThousandSunnyPirateFoil017,
        hand: [op15PiratesDockingSix088],
        activeDon: 5,
        deck: 10,
      },
      { deck: 10 },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const dockingId = engine.findCardInZone("south", "hand", op15PiratesDockingSix088);
    // Thousand Sunny's +1 reaches Characters only, so the hand cost stays 5.
    expect(cardCost(engine, dockingId)).toBe(5);

    engine.playCard(op15PiratesDockingSix088, "south");
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    expect(cardCost(engine, dockingId)).toBe(12);

    engine.endTurn("south");
    engine.declareAttack(engine.leader("north"), engine.leader("south"), "north");
    const blocker = engine.pendingDecision("battleBlocker", "south").steps[0];
    if (blocker?.kind !== "selectEntity") throw new Error("Expected a Blocker choice.");
    expect(blocker.candidates.map((candidate) => candidate.ref.id)).toContain(dockingId);
  });

  test("without Thousand Sunny it stays at 11 and gains no [Blocker]", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17MonkeyDLuffy079,
        character: [op15PiratesDockingSix088],
        deck: 10,
      },
      { deck: 10 },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const dockingId = engine.findCardInZone("south", "character", op15PiratesDockingSix088);
    expect(cardCost(engine, dockingId)).toBe(11);

    engine.declareAttack(engine.leader("north"), engine.leader("south"), "north");
    expect(() => engine.pendingDecision("battleBlocker", "south")).toThrow();
  });

  test("costs 5 in the trash: Gerd's cost-8-or-less retrieval offers it", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17MonkeyDLuffy079,
        hand: [op17Gerd081, eb01Doma005],
        trash: [op15PiratesDockingSix088],
        activeDon: 10,
        deck: 10,
      },
      {},
    );
    const dockingId = engine.findCardInZone("south", "trash", op15PiratesDockingSix088);
    const domaId = engine.findCardInZone("south", "hand", eb01Doma005);
    expect(cardCost(engine, dockingId)).toBe(5);

    engine.playCard(op17Gerd081, "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    // Doma is the only card left in hand, so it pays the trash cost directly.
    expect(engine.getView("south").players.south.trash.map((card) => card.instanceId)).toContain(
      domaId,
    );
    const retrieve = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (retrieve?.kind !== "selectEntity") throw new Error("Expected Gerd's retrieval choice.");
    expect(
      retrieve.candidates
        .filter((candidate) => candidate.legal)
        .map((candidate) => candidate.ref.id),
    ).toContain(dockingId);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [dockingId] }, "south");

    expect(engine.getView("south").players.south.hand.map((card) => card.instanceId)).toEqual([
      dockingId,
    ]);
    expect(cardCost(engine, dockingId)).toBe(5);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("costs 5 in the trash: Luffy OP17-093's cost-2-or-less replay does not offer it", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17MonkeyDLuffy079,
        hand: [op17MonkeyDLuffy093],
        trash: [op15PiratesDockingSix088, op17RoronoaZoro095],
        activeDon: 10,
        deck: 10,
      },
      {},
    );
    const dockingId = engine.findCardInZone("south", "trash", op15PiratesDockingSix088);
    const zoroId = engine.findCardInZone("south", "trash", op17RoronoaZoro095);
    expect(cardCost(engine, dockingId)).toBe(5);

    engine.playCard(op17MonkeyDLuffy093, "south");
    const play = engine.pendingDecision("effectPlaySelection", "south").steps[0];
    if (play?.kind !== "selectEntity") throw new Error("Expected Luffy's replay choice.");
    const legalIds = play.candidates
      .filter((candidate) => candidate.legal !== false)
      .map((candidate) => candidate.ref.id);
    expect(legalIds).toContain(zoroId);
    expect(legalIds).not.toContain(dockingId);
    expect(() =>
      engine.resolveDecision("effectPlaySelection", { selectedIds: [dockingId] }, "south"),
    ).toThrow();
  });
});
