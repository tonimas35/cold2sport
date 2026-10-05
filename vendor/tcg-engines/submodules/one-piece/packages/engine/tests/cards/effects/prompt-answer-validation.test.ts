import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, eb01Fourtricks025, op03Zeff047 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// A yes/no style prompt only accepts its own answers. An unknown option id
// used to be read as the negative answer, so a client or bot sending a wrong
// id silently skipped a [Trigger] (10-1-5-2 makes skipping a choice, not a
// default) or an optional effect.

function pendingPromptId(engine: OnePieceTestEngine, intent: string): string {
  const prompt = engine
    .getState()
    .promptQueue.find((p) => p.status === "pending" && p.resolutionContext?.intent === intent);
  if (!prompt) throw new Error(`Expected a pending ${intent} prompt.`);
  return prompt.id;
}

describe("lifeTrigger prompts reject unknown answers", () => {
  function lifeTriggerEngine() {
    // OP06-058 Gravity Blade Raging Tiger has a free [Trigger].
    const engine = OnePieceTestEngine.create(
      { life: ["OP06-058", eb01Doma005], deck: [eb01Doma005, eb01Doma005] },
      { character: ["OP16-012"], activeDon: 5 },
    );
    engine.endTurn("south");
    engine.asNorth().attack("OP16-012", engine.asSouth().leader());
    return engine;
  }

  test("an id that is not activate/skip is rejected and the prompt stays", () => {
    const engine = lifeTriggerEngine();
    const promptId = pendingPromptId(engine, "lifeTrigger");

    for (const optionId of ["bogus", "yes", "no", "decline", undefined]) {
      const result = engine.expectFailure({
        type: "resolvePrompt",
        seat: "south",
        promptId,
        optionId,
      });
      expect(result.reason).toBe("Prompt resolution could not be applied.");
    }
    expect(pendingPromptId(engine, "lifeTrigger")).toBe(promptId);
    expect(engine.getView("south").players.south.handCount).toBe(0);
  });

  test("skip still adds the card to hand, and activate still activates the [Trigger]", () => {
    const skipped = lifeTriggerEngine();
    skipped.resolveDecision("lifeTrigger", { optionId: "skip" }, "south");
    expect(skipped.getView("south").players.south.hand.map((card) => card.cardId)).toEqual([
      "OP06-058",
    ]);

    const activated = lifeTriggerEngine();
    activated.resolveDecision("lifeTrigger", { optionId: "activate" }, "south");
    expect(activated.getView("south").players.south.handCount).toBe(0);
    expect(
      activated
        .getState()
        .promptQueue.some(
          (p) => p.status === "pending" && p.resolutionContext?.intent === "effectTargetSelection",
        ),
    ).toBe(true);
  });
});

describe("optional effect prompts reject unknown answers", () => {
  test("effectOptional accepts only yes and no", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: "OP17-020", hand: [], activeDon: 5 },
      { character: [{ cardId: "OP13-013", rested: true }] },
    );
    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    const promptId = pendingPromptId(engine, "effectOptional");

    for (const optionId of ["skip", "activate", "maybe", undefined]) {
      engine.expectFailure({ type: "resolvePrompt", seat: "south", promptId, optionId });
    }
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    expect(engine.getView("south").players.south.activeDon).toBe(5);
  });

  test("effectActionOptional accepts only yes and no", () => {
    // OP03-047 Zeff: "...Then, you may trash 2 cards from the top of your deck."
    const engine = OnePieceTestEngine.create(
      {
        hand: [op03Zeff047],
        deck: [eb01Doma005, eb01Doma005, eb01Doma005],
        activeDon: op03Zeff047.cost,
      },
      { character: [eb01Fourtricks025] },
    );
    engine.playCard(op03Zeff047, "south");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [engine.findCardInZone("north", "character", eb01Fourtricks025)] },
      "south",
    );
    const promptId = pendingPromptId(engine, "effectActionOptional");

    for (const optionId of ["skip", "activate", "maybe", undefined]) {
      engine.expectFailure({ type: "resolvePrompt", seat: "south", promptId, optionId });
    }
    expect(pendingPromptId(engine, "effectActionOptional")).toBe(promptId);
    engine.resolveDecision("effectActionOptional", { optionId: "no" }, "south");
    expect(engine.getView("south").players.south.trash).toHaveLength(0);
    expect(engine.getView("south").players.south.deckCount).toBe(3);
  });
});
