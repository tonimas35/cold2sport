/**
 * The game worker's message handler, kept free of Worker APIs so that the
 * unit tests drive it exactly as the page does (test/protocol.test.ts).
 *
 * Bot turns run as a loop of single decisions with a yield in between: the
 * page gets one `view` per bot move (and animates them in order), and an
 * `abandon` sent mid-turn is handled before the next decision.
 */
import { reviewGame, type ValueModel } from "@opbot/core/web";
import type { DeckCatalog } from "../decks/catalog.ts";
import { LEVELS } from "./levels.ts";
import type { ClientMessage, ReviewItem, WorkerMessage } from "./protocol.ts";
import { GameSession } from "./session.ts";

export interface HostDeps {
  readonly catalog: DeckCatalog;
  readonly model: ValueModel;
  readonly post: (message: WorkerMessage) => void;
  /** Lets other messages in between two bot decisions (a macrotask in the worker). */
  readonly yieldToEvents?: () => Promise<void>;
  readonly now?: () => number;
  readonly random?: () => number;
}

export interface GameHost {
  handle(message: ClientMessage): Promise<void>;
  /** For tests. */
  readonly session: GameSession | null;
}

export function createGameHost(deps: HostDeps): GameHost {
  const pause = deps.yieldToEvents ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  let session: GameSession | null = null;
  // Bumped by every new game and by "abandon": a bot loop of an older game
  // stops at its next yield instead of playing on a board nobody looks at.
  let generation = 0;
  // Generation whose bot loop is running, so that a second trigger for the
  // same game (a human move arriving mid-loop) does not start another loop.
  let loopGeneration = -1;

  const fail = (error: unknown) =>
    deps.post({ type: "error", message: error instanceof Error ? error.message : String(error) });

  function finishIfOver(current: GameSession) {
    if (!current.isOver) return;
    const result = current.result();
    if (!result) return;
    deps.post({ type: "gameOver", result, record: current.record(), botDecisions: [...current.botDecisions] });
  }

  async function runBot(): Promise<void> {
    const current = session;
    const mine = generation;
    if (!current || loopGeneration === mine) return;
    loopGeneration = mine;
    try {
      if (current.botToAct) deps.post({ type: "botThinking", thinking: true });
      while (current.botToAct) {
        await pause();
        if (mine !== generation) return;
        deps.post({ type: "view", view: current.botStep() });
      }
      deps.post({ type: "botThinking", thinking: false });
      finishIfOver(current);
    } catch (error) {
      if (mine === generation) {
        deps.post({ type: "botThinking", thinking: false });
        fail(error);
      }
    } finally {
      if (loopGeneration === mine) loopGeneration = -1;
    }
  }

  async function handle(message: ClientMessage): Promise<void> {
    switch (message.type) {
      case "init":
        deps.post({ type: "ready", decks: deps.catalog.options, levels: LEVELS });
        return;
      case "checkDeck":
        deps.post({ type: "deckChecked", requestId: message.requestId, result: deps.catalog.check(message.choice) });
        return;
      case "start": {
        generation++;
        try {
          session = new GameSession(message.config, {
            catalog: deps.catalog,
            model: deps.model,
            ...(deps.now && { now: deps.now }),
            ...(deps.random && { random: deps.random }),
          });
        } catch (error) {
          session = null;
          fail(error);
          return;
        }
        deps.post({ type: "started", summary: session.summary });
        deps.post({ type: "view", view: session.currentView });
        await runBot();
        return;
      }
      case "act": {
        const current = session;
        if (!current) return fail("No hay ninguna partida en curso.");
        // Conceding is allowed at any moment (1-2-3), even while the bot plays.
        if (message.command.type !== "concede" && message.version !== current.currentView.version) {
          deps.post({ type: "rejected", reason: "La partida ya ha avanzado; vuelve a elegir." });
          return;
        }
        const result = current.humanAct(message.command);
        if (!result.accepted) {
          deps.post({ type: "rejected", reason: result.reason });
          return;
        }
        deps.post({ type: "view", view: result.view });
        if (current.isOver) finishIfOver(current);
        else await runBot();
        return;
      }
      case "review": {
        const current = session;
        if (!current || !current.isOver) return fail("La revisión necesita una partida terminada.");
        const mine = generation;
        try {
          let total = 0;
          const record = current.record();
          const entries = reviewGame(record, "south", { worlds: message.worlds, horizonTurns: 1, model: deps.model }, (_entry, done, all) => {
            total = all;
            if (mine === generation) deps.post({ type: "reviewProgress", done, total: all });
          });
          if (mine !== generation) return;
          const items: ReviewItem[] = entries.map((e) => ({ ...e }));
          deps.post({ type: "reviewProgress", done: total, total });
          deps.post({ type: "reviewDone", items });
        } catch (error) {
          fail(error);
        }
        return;
      }
      case "abandon":
        generation++;
        session = null;
        return;
    }
  }

  return {
    handle,
    get session() {
      return session;
    },
  };
}
