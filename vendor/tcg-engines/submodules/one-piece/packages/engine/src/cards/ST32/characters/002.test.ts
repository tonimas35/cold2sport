import { describe, expect, test } from "vite-plus/test";
import { OnePieceTestEngine } from "../../../index.ts";

describe("ST32-002", () => {
  test("[On Play] draws 1 and marks an opposing Character as unable to rest", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["ST32-002"], activeDon: 5 },
      { character: ["OP13-013"], activeDon: 5 },
    );
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");

    engine.playCard("ST32-002");
    const mark = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (mark?.kind !== "selectEntity") throw new Error("Expected the cannot-be-rested target.");
    expect(mark.candidates.map((c) => c.ref.id)).toContain(higumaId);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [higumaId] }, "south");

    expect(engine.getView("south").players.south.handCount).toBe(1);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[On Play] only Characters with a base cost of 6 or less can be chosen", () => {
    // "... up to 1 of your opponent's Characters with a base cost of 6 or less
    // cannot be rested until the end of your opponent's next End Phase."
    const engine = OnePieceTestEngine.create(
      { hand: ["ST32-002"], activeDon: 5 },
      { character: ["EB01-041", "EB02-043", "OP05-044"], activeDon: 5 },
    );
    const crocusId = engine.findCardInZone("north", "character", "EB01-041");

    engine.playCard("ST32-002");
    const mark = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (mark?.kind !== "selectEntity") throw new Error("Expected the cannot-be-rested target.");
    // Crocus costs 6; Jonathan (7) and John Giant (8) are not legal choices.
    expect(mark.candidates.map((candidate) => candidate.ref.id)).toEqual([crocusId]);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [crocusId] }, "south");

    expect(engine.getView("south").players.south.handCount).toBe(1);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[On Play] declined marks nothing and still draws", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["ST32-002"], activeDon: 5 },
      { character: ["OP13-013"], activeDon: 5 },
    );
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");

    engine.playCard("ST32-002");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [] }, "south");

    expect(engine.getView("south").players.south.handCount).toBe(1);
    expect(
      engine.getView("south").players.north.characters.find((c) => c?.instanceId === higumaId),
    ).toBeDefined();
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
