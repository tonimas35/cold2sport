import { describe, expect, test } from "vite-plus/test";
import { OnePieceTestEngine } from "../../../index.ts";

// Auto-verified: Charlotte Katakuri (OP17-103) cost=6 power=4000 counter=1000
describe("OP17-103 Charlotte Katakuri", () => {
  test("[On Play] resolves its play effects", () => {
    const engine = OnePieceTestEngine.create(
      { hand: ["OP17-103"], activeDon: 8 },
      { character: ["OP13-013"], activeDon: 5 },
    );

    engine.playCard("OP17-103");
    engine.acceptLeadingOptional("south");

    // Resolve any remaining prompts generically.
    for (let i = 0; i < 4; i++) {
      const remaining = engine.getView("south").prompts;
      if (remaining.length === 0) break;
      const d = (engine.getView("south").decisions ?? [])[0];
      if (!d) break;
      const intent = (d as { extensions?: { resolutionIntent?: any } }).extensions
        ?.resolutionIntent as any;
      if (intent === "effectTargetSelection" || intent === "effectPlaySelection") {
        const step = engine.pendingDecision(intent, "south").steps[0];
        if (step?.kind === "selectEntity" && step.candidates.length > 0) {
          engine.resolveDecision(
            intent as Parameters<typeof engine.resolveDecision>[0],
            { selectedIds: [step.candidates[0]!.ref.id] },
            "south",
          );
        } else {
          engine.resolveDecision(
            intent as Parameters<typeof engine.resolveDecision>[0],
            { selectedIds: [] },
            "south",
          );
        }
      } else {
        engine.resolveDecision(
          intent as Parameters<typeof engine.resolveDecision>[0],
          { optionId: "no" },
          "south",
        );
      }
    }

    expect(engine.getView("south").players.south.characters.map((c) => c?.cardId)).toContain(
      "OP17-103",
    );
  });

  test("[On Play] the Big Mom Pirates Leader check gates both the Life add and the Then −3000", () => {
    // "If your Leader has the {Big Mom Pirates} type, A. Then, B.": B cannot be
    // resolved when the "if" fails (4-10-2, 8-3-3; OP14/EB04 FAQ for OP14-078
    // and OP14-112).
    const play = (leaderCardId: string) => {
      const engine = OnePieceTestEngine.create(
        { leaderCardId, hand: ["OP17-103"], life: 3, activeDon: 6 },
        { character: ["OP13-013"] },
      );
      engine.playCard("OP17-103");
      return engine;
    };

    const other = play("OP13-001");
    const otherView = other.getView("south");
    expect(otherView.prompts).toHaveLength(0);
    expect(otherView.players.south.lifeCount).toBe(3);
    expect(otherView.players.north.characters[0]?.power).toBe(3000);

    const bigMom = play("OP08-058");
    bigMom.resolveDecision("effectAddToLifeFromDeck", { optionId: "1" }, "south");
    const higumaId = bigMom.findCardInZone("north", "character", "OP13-013");
    bigMom.resolveDecision("effectTargetSelection", { selectedIds: [higumaId] }, "south");
    const bigMomView = bigMom.getView("south");
    expect(bigMomView.players.south.lifeCount).toBe(4);
    expect(bigMomView.players.north.characters[0]?.power).toBe(0);
    expect(bigMomView.prompts).toHaveLength(0);
  });

  test("[Continuous] survives the turn handoff", () => {
    const engine = OnePieceTestEngine.create(
      { character: [{ cardId: "OP17-103", attachedDon: 1 }], activeDon: 5 },
      { activeDon: 5 },
    );
    const northBefore = engine.getView("south").players.north;

    engine.endTurn("south");
    const after = engine.getView("south").players.north;

    expect(after.activeDon).toBe(northBefore.activeDon + 2);
    expect(after.lifeCount).toBe(northBefore.lifeCount);
    expect(engine.getView("south").players.south.characters.map((c) => c?.cardId)).toContain(
      "OP17-103",
    );
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
