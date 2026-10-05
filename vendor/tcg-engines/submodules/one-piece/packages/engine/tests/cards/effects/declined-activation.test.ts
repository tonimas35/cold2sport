import { describe, expect, test } from "vite-plus/test";
import {
  eb02ThousandSunny009,
  st30LuffyAce001,
  st30MonkeyDLuffy012,
  st31ThousandSunny005,
} from "@tcg/op-cards";

import { getLegalCommands, OnePieceTestEngine } from "../../../src/index.ts";

// "[Activate: Main] You may <cost>: ...". Declining the cost after activating
// means the effect was not activated (8-3-1-4), so it does not use up [Once
// Per Turn] (10-2-13-1; OP09 FAQ on OP09-001 Shanks: an [Once Per Turn] effect
// not activated the first time can still be activated later) and it may be
// activated again. But activate-then-decline changes nothing, so repeating it
// is an endless no-op for bots: activated again before anything else happens,
// the effect can no longer be declined (it commits to paying the cost).

function canActivate(engine: OnePieceTestEngine, sourceId: string): boolean {
  return getLegalCommands(engine.getState(), "south").some(
    (command) => command.type === "activateEffect" && command.sourceId === sourceId,
  );
}

function optionalAnswers(engine: OnePieceTestEngine): Array<[string, boolean]> {
  const prompt = engine
    .getState()
    .promptQueue.find(
      (candidate) =>
        candidate.status === "pending" && candidate.resolutionContext?.intent === "effectOptional",
    );
  if (!prompt) throw new Error("Expected a pending effectOptional prompt.");
  return prompt.options.map((option) => [option.id, option.enabled !== false]);
}

function sunnyEngine() {
  return OnePieceTestEngine.create(
    {
      leaderCardId: st30LuffyAce001,
      stage: st31ThousandSunny005,
      character: [st30MonkeyDLuffy012],
      activeDon: 2,
      restedDon: 2,
    },
    {},
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("a declined [Activate: Main] cannot be declined again until something else happens", () => {
  test("ST31-005 Thousand Sunny: activated again at once, it must be paid", () => {
    const engine = sunnyEngine();
    const sunnyId = engine.findCardInZone("south", "stage", st31ThousandSunny005);
    const luffyId = engine.findCardInZone("south", "character", st30MonkeyDLuffy012);

    engine.activateEffect(sunnyId, "activateMain", "south");
    expect(optionalAnswers(engine)).toEqual([
      ["yes", true],
      ["no", true],
    ]);
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    expect(engine.getView("south").players.south.stage?.rested).toBe(false);

    // Still legal: declining did not activate it.
    expect(canActivate(engine, sunnyId)).toBe(true);
    engine.activateEffect(sunnyId, "activateMain", "south");
    expect(optionalAnswers(engine)).toEqual([
      ["yes", true],
      ["no", false],
    ]);
    const promptId = engine.pendingDecision("effectOptional", "south").id;
    engine.expectFailure({ type: "resolvePrompt", seat: "south", promptId, optionId: "no" });

    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    engine.resolveDecision("effectGiveDonCount", { optionId: "1" }, "south");
    const view = engine.getView("south").players.south;
    expect(view.stage?.rested).toBe(true);
    expect(view.characters.find((card) => card?.instanceId === luffyId)?.attachedDon).toBe(1);
  });

  test("after another action the activation can be declined again", () => {
    const engine = sunnyEngine();
    const sunnyId = engine.findCardInZone("south", "stage", st31ThousandSunny005);
    const luffyId = engine.findCardInZone("south", "character", st30MonkeyDLuffy012);

    engine.activateEffect(sunnyId, "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    engine.attachDon(luffyId, 1, "south");

    engine.activateEffect(sunnyId, "activateMain", "south");
    expect(optionalAnswers(engine)).toEqual([
      ["yes", true],
      ["no", true],
    ]);
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    expect(engine.getView("south").players.south.stage?.rested).toBe(false);
  });

  test("two declined activations cannot alternate: each must be paid next time", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP17-020",
        stage: eb02ThousandSunny009,
        character: [{ card: st30MonkeyDLuffy012, attachedDon: 1 }],
        hand: ["EB01-005"],
        activeDon: 3,
      },
      { character: [{ cardId: "OP13-013", rested: true }] },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const shanksId = engine.leader("south");
    const sunnyId = engine.findCardInZone("south", "stage", eb02ThousandSunny009);

    engine.activateEffect(shanksId, "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    engine.activateEffect(sunnyId, "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");

    engine.activateEffect(shanksId, "activateMain", "south");
    expect(optionalAnswers(engine)).toEqual([
      ["yes", true],
      ["no", false],
    ]);
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    // Paying Shanks's cost changed the game: Sunny may be declined again.
    engine.resolveDecision("effectCostChoice", { optionId: "1" }, "south");
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [engine.findCardInZone("north", "character", "OP13-013")] },
      "south",
    );
    engine.activateEffect(sunnyId, "activateMain", "south");
    expect(optionalAnswers(engine)).toEqual([
      ["yes", true],
      ["no", true],
    ]);
  });

  test("declining does not use up [Once Per Turn] (OP17-020 Shanks)", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: "OP17-020", hand: [], activeDon: 3 },
      { character: [{ cardId: "OP13-013", rested: true }] },
    );
    const shanksId = engine.leader("south");
    const higumaId = engine.findCardInZone("north", "character", "OP13-013");

    engine.activateEffect(shanksId, "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");

    expect(canActivate(engine, shanksId)).toBe(true);
    engine.activateEffect(shanksId, "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [higumaId] }, "south");
    expect(engine.getView("south").players.south).toMatchObject({ activeDon: 2, restedDon: 1 });
    // Now it has been activated and resolved: [Once Per Turn] is used up.
    expect(canActivate(engine, shanksId)).toBe(false);
  });
});
