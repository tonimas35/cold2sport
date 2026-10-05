import { describe, expect, test } from "vite-plus/test";

import { getLegalCommands, OnePieceTestEngine } from "../../../index.ts";

describe("OP15-076 Lightning Beast Kiten", () => {
  test("[Main] DON!! 1 with an [Enel] Leader draws and gives -1000 power", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: "OP15-058", hand: ["OP15-076", "EB01-005"], activeDon: 5 },
      { character: ["OP13-013"] },
    );
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");

    const donBefore = engine.getView("south").players.south;

    engine.playCard("OP15-076");
    // The DON!! cost auto-pays from the active DON!!
    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the power target.");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [higumaId] }, "south");

    const south = engine.getView("south").players.south;
    expect(south.hand).toHaveLength(2);
    // DON!! −1 (8-3-1-6): one DON!! card goes back to the DON!! deck.
    expect(south.activeDon).toBe(donBefore.activeDon - 1);
    expect(south.donDeckCount).toBe(donBefore.donDeckCount + 1);
    expect(
      engine.getView("south").players.north.characters.find((c) => c?.instanceId === higumaId)
        ?.power,
    ).toBe(2000);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Main] cannot be played with no DON!! on the field to pay DON!! −1 (8-3-1-3)", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: "OP15-058", hand: ["OP15-076", "EB01-005"], activeDon: 0, donDeckCount: 6 },
      { character: ["OP13-013"] },
    );
    const kitenId = engine.findCardInZone("south", "hand", "OP15-076");

    expect(
      getLegalCommands(engine.getState(), "south").some(
        (command) => command.type === "playCard" && command.sourceId === kitenId,
      ),
    ).toBe(false);
    expect(
      engine.expectFailure({ type: "playCard", seat: "south", instanceId: kitenId }).reason,
    ).toMatch(/activation cost cannot be paid/);
    expect(engine.getState().players.south.hand).toContain(kitenId);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Counter] resolves as a battle counter", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["OP15-076"], activeDon: 5 },
      { activeDon: 5 },
    );

    engine.endTurn("south");
    engine.asNorth().attack(engine.leader("north"), engine.asSouth().leader());
    engine.asSouth().chooseCounter("OP15-076");
    const boost = engine.getView("south").decisions?.[0] as
      | { extensions?: { resolutionIntent?: string } }
      | undefined;
    if (boost?.extensions?.resolutionIntent === "effectTargetSelection") {
      engine.resolveDecision("effectTargetSelection", { selectedIds: [] }, "south");
    }

    expect(engine.getView("south").players.south.trash.map((c) => c.cardId)).toContain("OP15-076");
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
