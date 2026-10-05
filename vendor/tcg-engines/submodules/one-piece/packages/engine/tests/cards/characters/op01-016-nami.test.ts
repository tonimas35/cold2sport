import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01Fourtricks025,
  eb01MountainGod018,
  eb01TonyTonyChopper006,
  eb02Karoo001,
  op01Nami016,
  op12DemonAuraNineSwordStyleAsuraBladesDrawnDeadManSGame037,
  st30LuffyAce001,
  st31ThousandSunny005,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

describe("OP01-016 Nami", () => {
  test("finds a compound Straw Hat Crew Character other than Nami and orders the rest", () => {
    const engine = OnePieceTestEngine.create({
      hand: [op01Nami016],
      deck: [
        eb01TonyTonyChopper006,
        op01Nami016,
        eb01Doma005,
        eb01Fourtricks025,
        eb01MountainGod018,
        eb01Doma005,
      ],
      activeDon: op01Nami016.cost,
    });
    const chopperId = engine.findCardInZone("south", "deck", eb01TonyTonyChopper006);
    const namiId = engine.findCardInZone("south", "deck", op01Nami016);

    engine.playCard(op01Nami016, "south");
    const search = engine.pendingDecision("effectSearchSelection", "south").steps[0];
    expect(search?.kind).toBe("selectEntity");
    if (search?.kind !== "selectEntity") throw new Error("Expected Nami's search choice.");
    expect(search.candidates.find((candidate) => candidate.ref.id === chopperId)?.legal).toBe(true);
    expect(search.candidates.find((candidate) => candidate.ref.id === namiId)?.legal).toBe(false);
    engine.resolveDecision("effectSearchSelection", { selectedIds: [chopperId] }, "south");

    const remainder = engine.pendingDecision("effectSearchRemainderOrder", "south").steps[0];
    expect(remainder?.kind).toBe("orderItems");
    if (remainder?.kind !== "orderItems") throw new Error("Expected Nami's deck order.");
    engine.resolveDecision(
      "effectSearchRemainderOrder",
      { selectedIds: remainder.candidates.map((candidate) => candidate.ref.id).reverse() },
      "south",
    );

    expect(engine.getView("south").players.south.hand.map((card) => card.instanceId)).toContain(
      chopperId,
    );
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  // Errata of 2023-02-17 (official errata list and current card list text):
  // "reveal up to 1 {Straw Hat Crew} type card", no longer "Character card".
  test("may also reveal a Straw Hat Crew Event or Stage", () => {
    const engine = OnePieceTestEngine.create({
      hand: [op01Nami016],
      deck: [
        op12DemonAuraNineSwordStyleAsuraBladesDrawnDeadManSGame037,
        st31ThousandSunny005,
        eb01Doma005,
        eb01Fourtricks025,
        eb01MountainGod018,
        eb01Doma005,
      ],
      activeDon: op01Nami016.cost,
    });
    const eventId = engine.findCardInZone(
      "south",
      "deck",
      op12DemonAuraNineSwordStyleAsuraBladesDrawnDeadManSGame037,
    );
    const stageId = engine.findCardInZone("south", "deck", st31ThousandSunny005);
    const domaId = engine.findCardInZone("south", "deck", eb01Doma005);

    engine.asSouth().play(op01Nami016);
    const search = engine.pendingDecision("effectSearchSelection", "south").steps[0];
    if (search?.kind !== "selectEntity") throw new Error("Expected Nami's search choice.");
    const legal = (id: string) => search.candidates.find((c) => c.ref.id === id)?.legal;
    expect(legal(eventId)).toBe(true);
    expect(legal(stageId)).toBe(true);
    expect(legal(domaId)).toBe(false);
    engine.asSouth().chooseSearch(eventId);
    expect(engine.getView("south").players.south.hand.map((card) => card.instanceId)).toEqual([
      eventId,
    ]);
  });

  // Official card list (series 569101): Counter 1000.
  test("adds +1000 as a Counter: a 6000 Leader still loses to a 7000 attacker", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: st30LuffyAce001, hand: [op01Nami016], life: 2 },
      { character: [{ card: eb02Karoo001, playedOnTurn: 0 }] },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const karooId = engine.findCardInZone("north", "character", eb02Karoo001);
    const namiId = engine.findCardInZone("south", "hand", op01Nami016);

    engine.declareAttack(karooId, engine.leader("south"), "north");
    engine.resolveDecision("battleCounter", { selectedIds: [namiId] }, "south");

    // 6000 + 1000 = 7000: the attacker's 7000 is not lower, so 1 damage lands.
    const south = engine.getView("south").players.south;
    expect(south.trash.map((card) => card.instanceId)).toEqual([namiId]);
    expect(south.lifeCount).toBe(1);
  });
});
