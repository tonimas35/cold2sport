import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, op09Shanks001, op16Buggy048 } from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// Rules 7-1-1-3 and 8-6-1-1: effects whose activation timing is fulfilled by
// the same attack declaration activate together, and the player who owns them
// chooses the order. OP09-001 Shanks (Leader) and OP16-048 Buggy both have an
// optional "when your opponent attacks" effect, so the defender orders them.
function setup(character: FixtureCardEntry[]) {
  const engine = OnePieceTestEngine.create(
    { deck: 10 },
    {
      leaderCardId: op09Shanks001,
      character,
      hand: [eb01Doma005],
      deck: 10,
    },
    { firstPlayer: "north", activeSeat: "south" },
  );
  engine.asSouth().attack(engine.leader("south"), engine.leader("north"));
  return engine;
}

describe("simultaneous attack-declaration effects", () => {
  test("the defending player chooses which card's [On Your Opponent's Attack] effect activates first", () => {
    const engine = setup([op16Buggy048]);
    const shanksId = engine.leader("north");
    const buggyId = engine.asNorth().findOnField(op16Buggy048);

    const step = engine.pendingDecision("effectOrderChoice", "north").steps[0];
    if (step?.kind !== "chooseOption") throw new Error("Expected the effect order choice.");
    expect(step.options.map((option) => option.targetId)).toEqual(
      expect.arrayContaining([shanksId, buggyId]),
    );
    expect(step.options).toHaveLength(2);
    // Nothing else is asked before the order is chosen.
    expect(engine.getView("north").prompts).toHaveLength(1);

    const buggyFirst = step.options.find((option) => option.targetId === buggyId)!.id;
    engine.asNorth().chooseOption("effectOrderChoice", buggyFirst);
    expect(engine.pendingDecision("effectOptional", "north").source?.id).toBe(buggyId);
    engine.asNorth().declineOptional();

    expect(engine.pendingDecision("effectOptional", "north").source?.id).toBe(shanksId);
    engine.asNorth().acceptOptional();
    engine.asNorth().chooseTargets(engine.leader("south"));
    expect(engine.getView("north").players.south.leader.power).toBe(4000);
    expect(engine.pendingDecision("battleCounter", "north")).toBeDefined();
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("an invalid order choice is rejected", () => {
    const engine = setup([op16Buggy048]);
    engine.expectFailure({
      type: "resolvePrompt",
      seat: "north",
      promptId: engine.pendingDecision("effectOrderChoice", "north").id,
      optionId: "not-an-effect",
    });
  });

  test("a single card's effect activates directly, without an order choice", () => {
    const engine = setup([]);

    expect(() => engine.pendingDecision("effectOrderChoice", "north")).toThrow();
    expect(engine.pendingDecision("effectOptional", "north").source?.id).toBe(
      engine.leader("north"),
    );
  });
});
