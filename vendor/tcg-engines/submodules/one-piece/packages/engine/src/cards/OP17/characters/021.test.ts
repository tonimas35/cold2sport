import { describe, expect, test } from "vite-plus/test";
import { OnePieceTestEngine } from "../../../index.ts";

// OP17-021 Crone Oli: If your Character with a type including "Red-Haired
// Pirates" would be removed from the field by your opponent's effect, you may
// rest 1 of your cards instead.
// OP17 FAQ: "If 2 of my Characters with a type including 'Red-Haired Pirates'
// would leave the field at the same time, do I have to rest 2 cards?" -- "No.
// In this case, rest 1 of your cards, and neither Character leaves the field."

/** South has Crone, Hongo (OP17-029) and Yasopp (OP17-031) and 3 active DON!!. */
function croneEngine() {
  return OnePieceTestEngine.create(
    {
      leaderCardId: "OP17-020",
      character: ["OP17-021", "OP17-029", "OP17-031"],
      activeDon: 3,
    },
    { leaderCardId: "OP13-001", hand: ["OP06-058"], activeDon: 10 },
    { firstPlayer: "south", activeSeat: "north" },
  );
}

describe("OP17-021", () => {
  test("[Blocker/ability] on-field state", () => {
    const engine = OnePieceTestEngine.create({ character: ["OP17-021"], activeDon: 3 }, {});
    expect(engine.findCardInZone("south", "character", "OP17-021")).toBeDefined();
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Continuous] survives the turn handoff", () => {
    const engine = OnePieceTestEngine.create(
      { character: [{ cardId: "OP17-021", attachedDon: 1 }], activeDon: 5 },
      { activeDon: 5 },
    );
    const northBefore = engine.getView("south").players.north;

    engine.endTurn("south");
    const after = engine.getView("south").players.north;

    expect(after.activeDon).toBe(northBefore.activeDon + 2);
    expect(after.lifeCount).toBe(northBefore.lifeCount);
    expect(engine.getView("south").players.south.characters.map((c) => c?.cardId)).toContain(
      "OP17-021",
    );
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("one rest saves two Characters placed at the bottom of the deck at once (OP17 FAQ)", () => {
    const engine = croneEngine();
    const hongoId = engine.findCardInZone("south", "character", "OP17-029");
    const yasoppId = engine.findCardInZone("south", "character", "OP17-031");
    const deckBefore = engine.getState().players.south.deck.length;

    // North's OP06-058 places up to 2 Characters with a cost of 6 or less at
    // the bottom of the owner's deck: a removal that is not a K.O.
    engine.playCard("OP06-058", "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [hongoId, yasoppId] }, "north");
    // Both go to south's deck, so south (their owner) orders them first.
    const order = engine.pendingDecision("effectReturnToDeckOwnerOrder", "south").steps[0];
    if (order?.kind !== "orderItems") throw new Error("Expected the deck order.");
    engine.resolveDecision(
      "effectReturnToDeckOwnerOrder",
      { selectedIds: order.candidates.map((candidate) => candidate.ref.id) },
      "south",
    );
    // A single replacement covers both Characters.
    engine.resolveDecision("effectRemovalReplacement", { optionId: "yes" }, "south");
    engine.resolveDecision(
      "effectMixedRestSelection",
      { selectedIds: ["active-don:south:0"] },
      "south",
    );

    expect(engine.getState().promptQueue.filter((p) => p.status === "pending")).toHaveLength(0);
    const south = engine.getView("south").players.south;
    expect(south.characters.map((card) => card?.instanceId)).toEqual(
      expect.arrayContaining([hongoId, yasoppId]),
    );
    expect(south).toMatchObject({ activeDon: 2, restedDon: 1 });
    expect(engine.getState().players.south.deck).toHaveLength(deckBefore);
  });
});
