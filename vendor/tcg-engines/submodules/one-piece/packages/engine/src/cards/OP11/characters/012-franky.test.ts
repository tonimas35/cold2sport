import { describe, expect, test } from "vite-plus/test";
import {
  eb01MountainGod018,
  eb03Ain002,
  eb03Hibari008,
  op01RadicalBeam029,
  op02IceAge117,
  op11Franky012,
  st30LuffyAce001,
  st31Sanji001,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../index.ts";

describe("OP11-012 Franky", () => {
  test("on its turn boosts all Characters only once after opposing Event Counters", () => {
    const engine = OnePieceTestEngine.create(
      {
        character: [
          op11Franky012,
          { card: eb01MountainGod018, playedOnTurn: 0 },
          { card: eb01MountainGod018, playedOnTurn: 0 },
        ],
      },
      { hand: [op01RadicalBeam029, op01RadicalBeam029], activeDon: 2 },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const frankyId = engine.findCardInZone("south", "character", op11Franky012);
    const attackerIds = engine
      .getView("south")
      .players.south.characters.filter((card) => card?.cardId === eb01MountainGod018.id)
      .map((card) => card!.instanceId);
    const eventIds = engine
      .getView("north")
      .players.north.hand.filter((card) => card.cardId === op01RadicalBeam029.id)
      .map((card) => card.instanceId);

    engine.declareAttack(attackerIds[0]!, engine.leader("north"), "south");
    engine.resolveDecision("battleCounter", { selectedIds: [eventIds[0]!] }, "north");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [engine.leader("north")] },
      "north",
    );

    let view = engine.getView("south");
    expect(view.players.south.characters.find((card) => card?.instanceId === frankyId)?.power).toBe(
      6000,
    );
    expect(
      view.players.south.characters.find((card) => card?.instanceId === attackerIds[1])?.power,
    ).toBe(9000);

    engine.declareAttack(attackerIds[1]!, engine.leader("north"), "south");
    engine.resolveDecision("battleCounter", { selectedIds: [eventIds[1]!] }, "north");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [engine.leader("north")] },
      "north",
    );

    view = engine.getView("south");
    expect(view.players.south.characters.find((card) => card?.instanceId === frankyId)?.power).toBe(
      6000,
    );
  });

  test("does not trigger from an opposing Main Event outside its controller's turn", () => {
    const engine = OnePieceTestEngine.create(
      { character: [op11Franky012] },
      { hand: [op02IceAge117], activeDon: op02IceAge117.cost },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const frankyId = engine.findCardInZone("south", "character", op11Franky012);

    engine.playCard(op02IceAge117, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [] }, "north");

    expect(
      engine.getView("south").players.south.characters.find((card) => card?.instanceId === frankyId)
        ?.power,
    ).toBe(4000);
  });

  // Official card list (series 569111): Franky has the {Straw Hat Crew} type
  // (the imported data said "Navy SWORD").
  test("is a Straw Hat Crew Character: ST31-001 Sanji may play it from hand", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: st30LuffyAce001,
        hand: [st31Sanji001, op11Franky012],
        deck: [eb03Ain002, eb03Ain002],
        activeDon: 5,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const frankyId = engine.findCardInZone("south", "hand", op11Franky012);

    south.play(st31Sanji001);
    const play = south.pendingDecision("effectPlaySelection").steps[0];
    if (play?.kind !== "selectEntity") throw new Error("Expected Sanji's play choice.");
    expect(play.candidates.find((candidate) => candidate.ref.id === frankyId)?.legal).not.toBe(
      false,
    );
    south.choosePlay(frankyId);
    expect(south.view().players.south.characters.map((card) => card?.instanceId)).toContain(
      frankyId,
    );
  });

  test("is not a SWORD Character: Hibari cannot pick it", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [eb03Hibari008],
        character: [{ card: op11Franky012, playedOnTurn: 0 }],
        activeDon: 3,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const frankyId = engine.findCardInZone("south", "character", op11Franky012);
    engine.playCard(eb03Hibari008, "south");
    const hibariId = engine.findCardInZone("south", "character", eb03Hibari008);
    // Only Hibari herself is a SWORD Character, so she is the only candidate.
    const prompt = engine.getState().promptQueue.find((p) => p.status === "pending");
    const candidateIds = prompt
      ? engine
          .pendingDecision("effectTargetSelection", "south")
          .steps.flatMap((step) =>
            step.kind === "selectEntity"
              ? step.candidates.map((candidate) => candidate.ref.id)
              : [],
          )
      : [];
    expect(candidateIds).not.toContain(frankyId);
    expect(candidateIds.every((id) => id === hibariId)).toBe(true);
  });
});
