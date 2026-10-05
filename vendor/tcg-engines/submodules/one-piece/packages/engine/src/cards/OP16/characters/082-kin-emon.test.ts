import { describe, expect, test } from "vite-plus/test";

import { OnePieceTestEngine } from "../../../index.ts";

// These tests used to apply the +3 in hand (play cost 7). "This Character
// gains +3 cost." is Character text, which rule 2-8-2 limits to the Character
// area; the OP17 FAQ rules the same way on the identical "+12 cost" wording.
// So Kin'emon is played for its printed 4 and is cost 7 on the field.
describe("OP16-082 Kin'emon", () => {
  test("is played for its printed cost 4; the +3 cost applies on the field", () => {
    const engine = OnePieceTestEngine.create({ hand: ["OP16-082"], activeDon: 4 }, {});
    expect(engine.getView("south").players.south.hand[0]?.cost).toBe(4);

    engine.playCard("OP16-082");

    const south = engine.getView("south").players.south;
    expect(south.activeDon).toBe(0);
    expect(south.characters.find((card) => card?.cardId === "OP16-082")?.cost).toBe(7);
  });

  test("cannot be played with fewer than 4 DON!!", () => {
    const engine = OnePieceTestEngine.create({ hand: ["OP16-082"], activeDon: 3 }, {});

    expect(() => engine.playCard("OP16-082")).toThrow();
  });

  test("[On Play] for a Land of Wano Leader looks at 5, takes a LoW card, and trashes the rest", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP01-031",
        hand: ["OP16-082"],
        deck: ["OP13-013", "OP16-091", "OP13-013", "OP13-013", "OP13-013", "OP13-013"],
        activeDon: 7,
      },
      {},
    );

    engine.playCard("OP16-082");
    const search = engine.pendingDecision("effectSearchSelection", "south").steps[0];
    if (search?.kind !== "selectEntity") throw new Error("Expected the search choice.");
    const legal = search.candidates.filter((candidate) => candidate.legal);
    engine.resolveDecision("effectSearchSelection", { selectedIds: [legal[0]!.ref.id!] }, "south");

    // The trashed rest goes straight to the trash.

    const south = engine.getView("south").players.south;
    expect(south.hand.map((card) => card.cardId)).toContain("OP16-091");
    expect(south.trash.map((card) => card.cardId)).toContain("OP13-013");
  });
});
