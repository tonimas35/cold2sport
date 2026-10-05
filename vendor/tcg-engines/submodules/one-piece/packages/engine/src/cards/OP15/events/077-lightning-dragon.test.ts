import { describe, expect, test } from "vite-plus/test";

import { getLegalCommands, OnePieceTestEngine } from "../../../index.ts";

describe("OP15-077 Lightning Dragon", () => {
  test("[Main] DON!! 1 draws and freezes a rested Character of 6000 power or less", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["OP15-077"], activeDon: 5 },
      { character: [{ cardId: "OP13-013", rested: true }, "OP16-003"], activeDon: 5 },
    );
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");

    const donBefore = engine.getView("south").players.south;

    engine.playCard("OP15-077");
    // The DON!! cost auto-pays from the active DON!!
    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the freeze target.");
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([higumaId]);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [higumaId] }, "south");

    const south = engine.getView("south").players.south;
    expect(south.hand).toHaveLength(1);
    // DON!! −1 (8-3-1-6): one DON!! card goes back to the DON!! deck.
    expect(south.activeDon).toBe(donBefore.activeDon - 1);
    expect(south.donDeckCount).toBe(donBefore.donDeckCount + 1);

    engine.endTurn("south");
    engine.endTurn("north");
    expect(
      engine.getView("south").players.north.characters.find((c) => c?.instanceId === higumaId)
        ?.rested,
    ).toBe(true);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Main] only rested Characters with 6000 power or less can be frozen", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["OP15-077"], activeDon: 5 },
      {
        character: [
          { cardId: "OP13-013", rested: true },
          { cardId: "OP16-003", rested: true },
        ],
        activeDon: 5,
      },
    );
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");

    engine.playCard("OP15-077");
    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the freeze target.");
    // Edward.Newgate (10000 power) is rested but above the 6000 power limit.
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([higumaId]);
  });

  test("[Main] cannot be played with no DON!! on the field to pay DON!! −1 (8-3-1-3)", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["OP15-077"], activeDon: 0, donDeckCount: 10 },
      { character: [{ cardId: "OP13-013", rested: true }], activeDon: 5 },
    );
    const dragonId = engine.findCardInZone("south", "hand", "OP15-077");

    expect(
      getLegalCommands(engine.getState(), "south").some(
        (command) => command.type === "playCard" && command.sourceId === dragonId,
      ),
    ).toBe(false);
    expect(
      engine.expectFailure({ type: "playCard", seat: "south", instanceId: dragonId }).reason,
    ).toMatch(/activation cost cannot be paid/);
    expect(engine.getState().players.south.hand).toContain(dragonId);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});
