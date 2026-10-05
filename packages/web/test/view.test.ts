/**
 * The page must only learn what the human could know. For every view of real
 * games, re-deal the cards the human cannot see (opbot's determinization: the
 * bot's hand, both decks, the Life cards) and build the view again: anything
 * that changes would be leaking hidden information to the page.
 *
 * The event log is left out of the comparison: determinized copies drop the
 * log history, and which log lines south may read is the engine's own
 * projection (`projectStateForSeat`), which the board uses unchanged.
 */
import { describe, expect, test } from "bun:test";
import { projectStateForSeat } from "@tcg/op-engine";
import { cardName, createRng, determinize } from "@opbot/core/web";
import { GameSession } from "../src/game/session.ts";
import { buildView } from "../src/game/view.ts";
import type { GameView, StartConfig } from "../src/game/protocol.ts";
import { catalog, firstLegalCommand, model } from "./helpers.ts";

function withoutLog(view: GameView) {
  return { ...view, board: { ...view.board, eventLog: [] } };
}

function checkGame(config: StartConfig): { views: number; prompts: number } {
  const session = new GameSession(config, { catalog, model });
  const rng = createRng(`leak:${config.seed}`);
  let checked = 0;
  let prompts = 0;
  let movesThisTurn = 0;
  let lastTurn = -1;
  const check = (view: GameView) => {
    const context = { version: view.version, plan: view.plan, lastMove: view.lastMove, botLabel: "Bot · Rápido" };
    const truth = buildView(session.trueState, context);
    for (let i = 0; i < 2; i++) {
      const world = determinize(session.trueState, "south", rng, session.knownByHuman);
      expect(withoutLog(buildView(world, context))).toEqual(withoutLog(truth));
    }
    checked++;
    if (view.prompt) prompts++;
  };
  for (let steps = 0; steps < 4000 && !session.isOver; steps++) {
    if (session.botToAct) {
      check(session.botStep());
      continue;
    }
    const view = session.currentView;
    check(view);
    if (view.turn !== lastTurn) {
      lastTurn = view.turn;
      movesThisTurn = 0;
    }
    const result = session.humanAct(firstLegalCommand(view, movesThisTurn));
    expect(result.accepted).toBe(true);
    if (view.status === "active" && !view.prompt) movesThisTurn++;
  }
  expect(session.isOver).toBe(true);
  return { views: checked, prompts };
}

describe("views carry only the human's information", () => {
  test("the log the human reads never names the bot's opening hand", () => {
    const session = new GameSession(
      {
        human: { kind: "catalog", id: "meta:OP17-079-monkey-d-luffy" },
        bot: { kind: "catalog", id: "meta:OP17-039-rocks-d-xebec" },
        first: "human",
        level: "rapido",
        seed: "log-privacy",
      },
      { catalog, model },
    );
    session.humanAct({ type: "keepHand", seat: "south" });
    while (session.botToAct && session.trueState.status !== "active") session.botStep();
    const state = session.trueState;
    const humanNames = new Set([
      ...[state.players.south.leaderCardId, ...state.config.players.south.mainDeck].map((id) => cardName(id)),
    ]);
    const botHand = state.players.north.hand.map((id) => cardName(state.cards[id]!.cardId)).filter((name) => !humanNames.has(name));
    expect(botHand.length).toBeGreaterThan(0);
    const log = projectStateForSeat(state, "south").logs.map((l) => l.message).join("\n");
    for (const name of botHand) expect(log).not.toContain(name);
    // The same lines name the human's own opening hand (the projection is not just empty).
    const ownHand = state.players.south.hand.map((id) => cardName(state.cards[id]!.cardId));
    expect(ownHand.some((name) => log.includes(name))).toBe(true);
  });

  test("Luffy (human) against Rocks", () => {
    const stats = checkGame({
      human: { kind: "catalog", id: "meta:OP17-079-monkey-d-luffy" },
      bot: { kind: "catalog", id: "meta:OP17-039-rocks-d-xebec" },
      first: "bot",
      level: "rapido",
      seed: "leak-1",
    });
    expect(stats.views).toBeGreaterThan(50);
    expect(stats.prompts).toBeGreaterThan(3);
  }, 120_000);

  test("Enel (human, many cost prompts) against Kaido", () => {
    const stats = checkGame({
      human: { kind: "catalog", id: "meta:OP15-058-enel" },
      bot: { kind: "catalog", id: "meta:OP17-058-kaido" },
      first: "human",
      level: "rapido",
      seed: "leak-2",
    });
    expect(stats.views).toBeGreaterThan(50);
  }, 120_000);
});
