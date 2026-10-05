import { describe, expect, test } from "vite-plus/test";

import { OnePieceTestEngine } from "../../../index.ts";
import { getCardCounter } from "../../../shared.ts";

// "The counter of all of your Character cards with 8000 power in your hand
// becomes +2000." Like any Character text it only works while Ace is in the
// Character area (2-8-2). The counter "becomes" +2000: it does not add to a
// printed Counter, and two Aces still give +2000 (OP16 FAQ; 2-10-4: a card
// with several Counters uses only the highest).
describe("OP16-118 Portgas.D.Ace", () => {
  test("the counter of 8000-power Characters in hand becomes +2000 while Ace is on the field", () => {
    const engine = OnePieceTestEngine.create(
      { character: ["OP16-118"], hand: ["OP16-016", "EB01-041", "OP16-004"], activeDon: 5 },
      { activeDon: 5 },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const rambaId = engine.findCardInZone("south", "hand", "OP16-016");
    const state = engine.getState();
    // Ramba (8000, no Counter), Crocus (8000, +1000) and Curiel (8000, +2000).
    expect(getCardCounter(state, rambaId)).toBe(2000);
    expect(getCardCounter(state, engine.findCardInZone("south", "hand", "EB01-041"))).toBe(2000);
    expect(getCardCounter(state, engine.findCardInZone("south", "hand", "OP16-004"))).toBe(2000);
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    // North's Leader attacks with 1 DON!! (6000). Ramba's +2000 Counter makes
    // the Leader 7000 > 6000: saved.
    engine.attachDon(engine.leader("north"), 1, "north");
    engine.asNorth().attack(engine.leader("north"), engine.asSouth().leader());
    engine.asSouth().chooseCounter(rambaId);
    expect(engine.getView("south").players.south.lifeCount).toBe(lifeBefore);
  });

  test("Ace in hand changes no counter, and two Aces on the field still give +2000 (OP16 FAQ)", () => {
    // OP16-016 Ramba (8000 power) prints a +1000 Counter: Ace in hand leaves it
    // at +1000, two Aces on the field raise it to +2000 (the highest value is
    // used, 2-10-4).
    const inHand = OnePieceTestEngine.create({ hand: ["OP16-118", "OP16-016", "EB01-041"] }, {});
    expect(
      getCardCounter(inHand.getState(), inHand.findCardInZone("south", "hand", "OP16-016")),
    ).toBe(1000);
    expect(
      getCardCounter(inHand.getState(), inHand.findCardInZone("south", "hand", "EB01-041")),
    ).toBe(1000);

    const twoAces = OnePieceTestEngine.create(
      { character: ["OP16-118", "OP16-118"], hand: ["OP16-016"] },
      {},
    );
    expect(
      getCardCounter(twoAces.getState(), twoAces.findCardInZone("south", "hand", "OP16-016")),
    ).toBe(2000);
  });

  test("without Ace in hand the same counter no longer saves the Leader", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["OP16-004"], activeDon: 5 },
      { character: ["OP16-065"], activeDon: 5 },
    );
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    engine.endTurn("south");
    engine.asNorth().attack("OP16-065", engine.asSouth().leader());
    engine.asSouth().chooseCounter("OP16-004");
    expect(engine.getView("south").players.south.lifeCount).toBe(lifeBefore - 1);
  });

  test("[On Play] looks at 5, may take a Whitebeard Pirates card, and orders the rest", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: ["OP16-118"],
        deck: ["OP13-013", "OP16-003", "OP13-013", "OP13-013", "OP13-013", "OP13-013"],
        activeDon: 5,
      },
      {},
    );

    engine.playCard("OP16-118");
    const search = engine.pendingDecision("effectSearchSelection", "south").steps[0];
    if (search?.kind !== "selectEntity") throw new Error("Expected the search choice.");
    const legal = search.candidates.filter((candidate) => candidate.legal);
    expect(legal.map((candidate) => candidate.publicInfo?.cardId)).toEqual(["OP16-003"]);
    engine.resolveDecision("effectSearchSelection", { selectedIds: [legal[0]!.ref.id!] }, "south");

    const order = engine.pendingDecision("effectSearchRemainderOrder", "south").steps[0];
    if (order?.kind !== "orderItems") throw new Error("Expected the remainder order.");
    engine.resolveDecision(
      "effectSearchRemainderOrder",
      { selectedIds: order.candidates.map((candidate) => candidate.ref.id) },
      "south",
    );

    const south = engine.getView("south").players.south;
    expect(south.hand.map((card) => card.cardId)).toContain("OP16-003");
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
