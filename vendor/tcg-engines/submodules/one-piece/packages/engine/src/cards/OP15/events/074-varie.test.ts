import { describe, expect, test } from "vite-plus/test";

import { getLegalCommands, OnePieceTestEngine } from "../../../index.ts";

describe("OP15-074 Varie", () => {
  test("[Main] DON!! 1 with an [Enel] Leader draws and gives a Character +2 cost", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP15-058",
        hand: ["OP15-074", "EB01-005"],
        character: ["OP15-060"],
        activeDon: 5,
      },
      {},
    );
    const enelId = engine.findCardInZone("south", "character", "OP15-060");

    const donBefore = engine.getView("south").players.south;

    engine.playCard("OP15-074");
    // The DON!! cost auto-pays; choose Enel for the +2 cost.
    const costTarget = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (costTarget?.kind !== "selectEntity") throw new Error("Expected the +2 cost target.");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [enelId] }, "south");

    const south = engine.getView("south").players.south;
    expect(south.hand).toHaveLength(2);
    expect(south.characters.find((card) => card?.instanceId === enelId)?.cost).toBe(8);
    // DON!! −1 (8-3-1-6): one DON!! card goes back to the DON!! deck.
    expect(south.activeDon).toBe(donBefore.activeDon - 1);
    expect(south.donDeckCount).toBe(donBefore.donDeckCount + 1);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Main] cannot be played with no DON!! on the field to pay DON!! −1 (8-3-1-3)", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP15-058",
        hand: ["OP15-074", "EB01-005"],
        character: ["OP15-060"],
        activeDon: 0,
        donDeckCount: 6,
      },
      {},
    );
    const varieId = engine.findCardInZone("south", "hand", "OP15-074");

    expect(
      getLegalCommands(engine.getState(), "south").some(
        (command) => command.type === "playCard" && command.sourceId === varieId,
      ),
    ).toBe(false);
    expect(
      engine.expectFailure({ type: "playCard", seat: "south", instanceId: varieId }).reason,
    ).toMatch(/activation cost cannot be paid/);
    expect(engine.getState().players.south.hand).toContain(varieId);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Main] pays DON!! −1 with a DON!! given to a Character (8-3-1-6)", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP15-058",
        hand: ["OP15-074", "EB01-005"],
        character: [{ cardId: "OP15-060", attachedDon: 1 }],
        activeDon: 0,
        donDeckCount: 5,
      },
      {},
    );
    const enelId = engine.findCardInZone("south", "character", "OP15-060");

    engine.playCard("OP15-074");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [enelId] }, "south");

    const south = engine.getView("south").players.south;
    const enel = south.characters.find((card) => card?.instanceId === enelId);
    expect(enel?.attachedDon).toBe(0);
    expect(enel?.cost).toBe(8);
    expect(south.donDeckCount).toBe(6);
    expect(south.hand).toHaveLength(2);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Counter] an [Enel] card gains +2000 power during the battle", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: "OP15-058", hand: ["OP15-074"], activeDon: 5 },
      { character: ["OP16-012"], activeDon: 5 },
    );
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    engine.endTurn("south");
    engine.asNorth().attack("OP16-012", engine.asSouth().leader());
    engine.asSouth().chooseCounter("OP15-074");
    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the [Enel] target.");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [engine.getView("south").players.south.leader!.instanceId!] },
      "south",
    );

    // 5000 + 2000 >= 6000: saved (without the boost it would not be).
    expect(engine.getView("south").players.south.lifeCount).toBe(lifeBefore);
  });
});
