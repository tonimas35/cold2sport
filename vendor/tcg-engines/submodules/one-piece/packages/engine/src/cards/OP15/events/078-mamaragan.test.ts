import { describe, expect, test } from "vite-plus/test";

import { getLegalCommands, OnePieceTestEngine } from "../../../index.ts";

describe("OP15-078 Mamaragan", () => {
  test("[Main] DON!! 2 draws and rests a Character of 5000 power or less", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["OP15-078"], activeDon: 6 },
      { character: ["OP13-013", "OP16-003"], activeDon: 5 },
    );
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");

    const donBefore = engine.getView("south").players.south;

    engine.playCard("OP15-078");
    // The DON!! 2 cost auto-pays from the active DON!!
    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the rest target.");
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([higumaId]);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [higumaId] }, "south");

    expect(
      engine.getView("south").players.north.characters.find((c) => c?.instanceId === higumaId)
        ?.rested,
    ).toBe(true);
    expect(engine.getView("south").players.south.hand).toHaveLength(1);
    // DON!! −2 (8-3-1-6): two DON!! cards go back to the DON!! deck.
    const south = engine.getView("south").players.south;
    expect(south.activeDon).toBe(donBefore.activeDon - 2);
    expect(south.donDeckCount).toBe(donBefore.donDeckCount + 2);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Main] cannot be played with only 1 DON!! on the field to pay DON!! −2 (8-3-1-3)", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["OP15-078"], activeDon: 1, donDeckCount: 9 },
      { character: ["OP13-013", "OP16-003"], activeDon: 5 },
    );
    const mamaraganId = engine.findCardInZone("south", "hand", "OP15-078");

    expect(
      getLegalCommands(engine.getState(), "south").some(
        (command) => command.type === "playCard" && command.sourceId === mamaraganId,
      ),
    ).toBe(false);
    expect(
      engine.expectFailure({ type: "playCard", seat: "south", instanceId: mamaraganId }).reason,
    ).toMatch(/activation cost cannot be paid/);
    // Rejected before anything happens: no DON!! was returned (no partial payment).
    expect(engine.getState().players.south).toMatchObject({ activeDon: 1, donDeckCount: 9 });
    expect(engine.getState().players.south.hand).toContain(mamaraganId);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});
