import { describe, expect, test } from "vite-plus/test";

import { OnePieceTestEngine } from "../../../index.ts";

describe("OP17-038 I Think He's Seen an Ugly Future", () => {
  test("[Main] resting 4 cards rests an opposing Character", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: ["OP17-038", "EB01-005"],
        character: ["EB01-005", "OP16-004", "OP13-013"],
        activeDon: 5,
        restedDon: 2,
      },
      { character: ["OP16-012"], activeDon: 5 },
    );
    const bennId = engine.findCardInZone("north", "character", "OP16-012");

    engine.playCard("OP17-038");
    engine.acceptLeadingOptional("south");
    // "Rest 4 of your cards" also takes active DON!! cards (OP14/EB04 FAQ on
    // OP14-020: "your active Leader, Character, Stage, or DON!! cards"), so the
    // player chooses which 4 of the Leader, 3 Characters and 5 DON!!: here 4 DON!!.
    const cost = engine.pendingDecision("effectCostRestCards", "south").steps[0];
    if (cost?.kind !== "payCost") throw new Error("Expected the rest-4 cost.");
    expect(cost.candidates).toHaveLength(9);
    engine.resolveDecision(
      "effectCostRestCards",
      { selectedIds: ["active-don:0", "active-don:1", "active-don:2", "active-don:3"] },
      "south",
    );
    const rest = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (rest?.kind !== "selectEntity") throw new Error("Expected the rest target.");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [bennId] }, "south");

    expect(
      engine.getView("south").players.north.characters.find((c) => c?.instanceId === bennId)
        ?.rested,
    ).toBe(true);
    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 1, restedDon: 6 });
    expect(south.leader.rested).toBe(false);
    expect(south.characters.filter((c) => c?.rested)).toHaveLength(0);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Optional] declined leaves the board unchanged", () => {
    const engine = OnePieceTestEngine.create({ hand: ["OP17-038"], activeDon: 3 }, {});

    engine.playCard("OP17-038");
    const gate = engine.getView("south").decisions?.[0] as
      | { extensions?: { resolutionIntent?: string } }
      | undefined;
    const gateIntent = gate?.extensions?.resolutionIntent;
    if (gateIntent === "effectOptional") {
      engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    } else if (gateIntent) {
      const gateStep = engine.pendingDecision(gateIntent as never, "south").steps[0];
      if (gateStep?.kind === "selectEntity" || gateStep?.kind === "orderItems") {
        engine.resolveDecision(gateIntent as never, { selectedIds: [] }, "south");
      } else if (gateStep?.kind === "chooseOption") {
        engine.resolveDecision(gateIntent as never, { optionId: "0" }, "south");
      }
    }

    expect(engine.getView("south").players.south.trash.map((c) => c.cardId)).toContain("OP17-038");
    expect(engine.getView("south").players.south.characters.filter(Boolean)).toHaveLength(0);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
