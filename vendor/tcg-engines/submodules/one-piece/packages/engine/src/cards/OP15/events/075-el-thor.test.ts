import { describe, expect, test } from "vite-plus/test";

import { getLegalCommands, OnePieceTestEngine } from "../../../index.ts";

describe("OP15-075 El Thor", () => {
  test("[Main] DON!! 1 with an [Enel] Leader boosts a card and may K.O. 3000 power or less", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP15-058",
        hand: ["OP15-075"],
        character: ["OP16-005"],
        activeDon: 5,
      },
      { character: ["OP13-013"] },
    );
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");

    const donBefore = engine.getView("south").players.south;

    engine.playCard("OP15-075");
    // The DON!! cost auto-pays from the active DON!!
    const boost = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (boost?.kind !== "selectEntity") throw new Error("Expected the boost target.");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [engine.getView("south").players.south.leader!.instanceId!] },
      "south",
    );
    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the K.O. target.");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [higumaId] }, "south");

    expect(engine.getView("south").players.north.trash.map((card) => card.instanceId)).toContain(
      higumaId,
    );
    // DON!! −1 (8-3-1-6): one DON!! card goes back to the DON!! deck.
    const south = engine.getView("south").players.south;
    expect(south.activeDon).toBe(donBefore.activeDon - 1);
    expect(south.donDeckCount).toBe(donBefore.donDeckCount + 1);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Main] with a non-[Enel] Leader pays DON!! −1 but neither boosts nor K.O.s", () => {
    // The "Then, K.O." depends on the "If your Leader is [Enel]" clause too
    // (4-10-2, 8-3-3; OP14/EB04 FAQ for OP14-078 and OP14-112).
    const engine = OnePieceTestEngine.create(
      { hand: ["OP15-075"], character: ["OP16-005"], activeDon: 5 },
      { character: ["OP13-013"] },
    );
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");
    const donBefore = engine.getView("south").players.south;

    engine.playCard("OP15-075");

    const view = engine.getView("south");
    expect(view.prompts).toHaveLength(0);
    expect(view.players.north.characters.map((card) => card?.instanceId)).toContain(higumaId);
    expect(view.players.south.leader?.power).toBe(5000);
    expect(view.players.south.activeDon).toBe(donBefore.activeDon - 1);
    expect(view.players.south.donDeckCount).toBe(donBefore.donDeckCount + 1);
  });

  test("[Main] cannot be played with no DON!! on the field to pay DON!! −1 (8-3-1-3)", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP15-058",
        hand: ["OP15-075"],
        character: ["OP16-005"],
        activeDon: 0,
        donDeckCount: 6,
      },
      { character: ["OP13-013"] },
    );
    const elThorId = engine.findCardInZone("south", "hand", "OP15-075");

    expect(
      getLegalCommands(engine.getState(), "south").some(
        (command) => command.type === "playCard" && command.sourceId === elThorId,
      ),
    ).toBe(false);
    expect(
      engine.expectFailure({ type: "playCard", seat: "south", instanceId: elThorId }).reason,
    ).toMatch(/activation cost cannot be paid/);
    expect(engine.getState().players.south.hand).toContain(elThorId);
    expect(engine.getState().players.north.characterArea.filter(Boolean)).toHaveLength(1);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Counter] resolves as a battle counter", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["OP15-075"], activeDon: 5 },
      { activeDon: 5 },
    );

    engine.endTurn("south");
    engine.asNorth().attack(engine.leader("north"), engine.asSouth().leader());
    engine.asSouth().chooseCounter("OP15-075");
    const boost = engine.getView("south").decisions?.[0] as
      | { extensions?: { resolutionIntent?: string } }
      | undefined;
    if (boost?.extensions?.resolutionIntent === "effectTargetSelection") {
      engine.resolveDecision("effectTargetSelection", { selectedIds: [] }, "south");
    }

    expect(engine.getView("south").players.south.trash.map((c) => c.cardId)).toContain("OP15-075");
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
