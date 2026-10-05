/**
 * The heuristic prompt resolver on the cost prompts added for alternative
 * costs ("You may A or B:") and for "rest N of your cards" paid with DON!!
 * cards, and on prompts with a disabled answer. Every command it returns must
 * be accepted by the engine.
 */
import { describe, expect, test } from "vite-plus/test";
import {
  eb01OhComeMyWay038,
  op14eb04Tashigi029,
  op16BennBeckman012,
  op17Shanks020,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../testing/test-engine.ts";
import { resolveBotPromptCommand } from "./bot-harness.ts";
import { heuristicPromptResolver } from "./heuristic-strategy.ts";

function pendingPrompt(engine: OnePieceTestEngine, intent: string) {
  const prompt = engine
    .getState()
    .promptQueue.find((p) => p.status === "pending" && p.resolutionContext?.intent === intent);
  if (!prompt) throw new Error(`Expected a pending ${intent} prompt.`);
  return prompt;
}

describe("heuristic resolver: alternative and DON!! costs", () => {
  test("OP17-020 Shanks: pays with a DON!! rather than a card from hand", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: op17Shanks020, hand: ["EB01-005"], activeDon: 3 },
      { character: [{ cardId: "OP13-013", rested: true }] },
    );
    engine.activateEffect(engine.leader("south"), "activateMain", "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");

    const command = heuristicPromptResolver(
      engine.getState(),
      pendingPrompt(engine, "effectCostChoice"),
    );

    expect(command).toMatchObject({ type: "resolvePrompt", optionId: "1" });
    expect(engine.exec(command!).accepted).toBe(true);
    expect(engine.getView("south").players.south).toMatchObject({ handCount: 1, activeDon: 2 });
  });

  test("rest 2 of your cards with one active field card and 2 DON!!: a DON!! completes it", () => {
    // OP14-029: "[Activate: Main] [Once Per Turn] You may rest 2 of your cards".
    const engine = OnePieceTestEngine.create(
      { character: [{ card: op14eb04Tashigi029, playedOnTurn: 0 }], activeDon: 2 },
      {},
    );
    const leaderId = engine.leader("south");
    const state = structuredClone(engine.getState());
    state.cards[leaderId]!.rested = true;
    const rested = OnePieceTestEngine.fromState(state);
    const sourceId = rested.findCardInZone("south", "character", op14eb04Tashigi029);
    rested.activateEffect(sourceId, "activateMain", "south");
    rested.resolveDecision("effectOptional", { optionId: "yes" }, "south");

    const prompt = pendingPrompt(rested, "effectCostRestCards");
    const command = heuristicPromptResolver(rested.getState(), prompt);

    expect(command).toMatchObject({ selectedIds: [sourceId, "active-don:0"] });
    expect(rested.exec(command!).accepted).toBe(true);
  });

  test("a disabled answer is never sent: a [Trigger] that cannot pay its cost is skipped", () => {
    // EB01-038 Oh Come My Way: "[Trigger] DON!! −1: Draw 2 cards." with no DON!!.
    const engine = OnePieceTestEngine.create(
      { life: [eb01OhComeMyWay038, "EB01-005"] },
      { character: [op16BennBeckman012], activeDon: 5 },
    );
    engine.endTurn("south");
    engine.asNorth().attack(op16BennBeckman012, engine.asSouth().leader());
    const prompt = pendingPrompt(engine, "lifeTrigger");

    for (const command of [
      heuristicPromptResolver(engine.getState(), prompt),
      resolveBotPromptCommand(engine.getState(), prompt),
    ]) {
      expect(command).toMatchObject({ optionId: "skip" });
    }
  });
});
