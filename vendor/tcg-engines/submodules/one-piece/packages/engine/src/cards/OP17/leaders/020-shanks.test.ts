import { describe, expect, test } from "vite-plus/test";
import { getLegalCommands, OnePieceTestEngine } from "../../../index.ts";

// [Activate: Main] [Once Per Turn] You may trash 1 card from your hand or rest
// 1 of your DON!! cards: Up to 1 of your opponent's rested Characters will not
// become active in your opponent's next Refresh Phase.
// OP17 FAQ: "If I have no cards in my hand, can I rest 1 of my DON!! cards
// with this [Activate: Main] effect?" -- "Yes, you can." The cost is one of
// the two, never both (Cost "choice").

function shanksEngine(south: { hand?: string[]; activeDon?: number }) {
  return OnePieceTestEngine.create(
    { leaderCardId: "OP17-020", character: ["OP17-020"], ...south },
    { character: [{ cardId: "OP13-013", rested: true }], activeDon: 5 },
  );
}

function canActivateShanks(engine: OnePieceTestEngine): boolean {
  return getLegalCommands(engine.getState(), "south").some(
    (command) => command.type === "activateEffect" && command.sourceId === engine.leader("south"),
  );
}

function freezeHiguma(engine: OnePieceTestEngine) {
  const higumaId = engine.findCardInZone("north", "character", "OP13-013");
  engine.resolveDecision("effectTargetSelection", { selectedIds: [higumaId] }, "south");
  expect(engine.getView("south").prompts).toHaveLength(0);
}

describe("OP17-020 Shanks", () => {
  test("[Activate:Main] rest DON or trash hand to freeze opposing rested Characters", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: "OP17-020", hand: ["EB01-005"], character: ["OP17-020"], activeDon: 5 },
      { character: [{ cardId: "OP13-013", rested: true }], activeDon: 5 },
    );
    const shanksId = engine.leader("south");
    engine.activateEffect(shanksId, "activateMain", "south");
    engine.acceptLeadingOptional("south");
    // Both alternatives can be paid, so the player picks one (here: rest DON!!).
    engine.resolveDecision("effectCostChoice", { optionId: "1" }, "south");
    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the freeze target.");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [target.candidates[0]!.ref.id] },
      "south",
    );
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Activate:Main] declined freezes nothing", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: "OP17-020", hand: ["EB01-005"], character: ["OP17-020"], activeDon: 5 },
      { character: [{ cardId: "OP13-013", rested: true }], activeDon: 5 },
    );
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");

    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");

    expect(
      engine.getView("south").players.north.characters.find((c) => c?.instanceId === higumaId)
        ?.rested,
    ).toBe(true);
    expect(engine.getView("south").players.south.handCount).toBe(1);
    expect(engine.getView("south").players.south.activeDon).toBe(5);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("with no cards in hand, resting 1 DON!! pays the cost (OP17 FAQ)", () => {
    const engine = shanksEngine({ hand: [], activeDon: 5 });

    expect(canActivateShanks(engine)).toBe(true);
    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    // Only the DON!! alternative can be paid: no choice is asked.
    expect(() => engine.pendingDecision("effectCostChoice", "south")).toThrow();
    freezeHiguma(engine);

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 4, restedDon: 1, handCount: 0 });
    expect(south.trash).toHaveLength(0);
  });

  test("with no active DON!!, trashing 1 card pays the cost and no DON!! is rested", () => {
    const engine = shanksEngine({ hand: ["EB01-005"], activeDon: 0 });

    expect(canActivateShanks(engine)).toBe(true);
    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    expect(() => engine.pendingDecision("effectCostChoice", "south")).toThrow();
    freezeHiguma(engine);

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 0, restedDon: 0, handCount: 0 });
    expect(south.trash.map((card) => card.cardId)).toEqual(["EB01-005"]);
  });

  test("when both can be paid, choosing the DON!! keeps the hand", () => {
    const engine = shanksEngine({ hand: ["EB01-005"], activeDon: 5 });

    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    const choice = engine.pendingDecision("effectCostChoice", "south").steps[0];
    if (choice?.kind !== "chooseOption") throw new Error("Expected the cost choice.");
    expect(choice.options.map((option) => [option.id, option.label])).toEqual([
      ["0", "Trash 1 card from your hand"],
      ["1", "Rest 1 of your DON!! cards"],
    ]);
    engine.resolveDecision("effectCostChoice", { optionId: "1" }, "south");
    freezeHiguma(engine);

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 4, restedDon: 1, handCount: 1 });
    expect(south.trash).toHaveLength(0);
  });

  test("choosing the trash asks which card, and leaves every DON!! active", () => {
    const engine = shanksEngine({ hand: ["EB01-005", "OP17-032"], activeDon: 5 });
    const limejuiceId = engine.findCardInZone("south", "hand", "OP17-032");

    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    engine.resolveDecision("effectCostChoice", { optionId: "0" }, "south");
    // The chosen alternative carries over to its own cost prompt.
    engine.resolveDecision("effectCostTrashFromHand", { selectedIds: [limejuiceId] }, "south");
    freezeHiguma(engine);

    const south = engine.getView("south").players.south;
    expect(south).toMatchObject({ activeDon: 5, restedDon: 0, handCount: 1 });
    expect(south.trash.map((card) => card.instanceId)).toEqual([limejuiceId]);
  });

  test("an option that is not offered is rejected", () => {
    const engine = shanksEngine({ hand: ["EB01-005"], activeDon: 5 });

    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    const promptId = engine.pendingDecision("effectCostChoice", "south").id;
    for (const optionId of ["2", "-1", "trash", undefined]) {
      engine.expectFailure({ type: "resolvePrompt", seat: "south", promptId, optionId });
    }
  });

  test("cannot be activated with neither a card in hand nor an active DON!!", () => {
    const engine = shanksEngine({ hand: [], activeDon: 0 });

    expect(canActivateShanks(engine)).toBe(false);
    const result = engine.expectFailure({
      type: "activateEffect",
      seat: "south",
      sourceInstanceId: engine.leader("south"),
      trigger: "activateMain",
    });
    expect(result.reason).toMatch(/activation costs cannot be paid/);
  });

  test("[Once Per Turn] still applies after paying with a DON!!", () => {
    const engine = shanksEngine({ hand: [], activeDon: 5 });

    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    freezeHiguma(engine);

    expect(canActivateShanks(engine)).toBe(false);
  });
});
