/**
 * The worker protocol end to end, without a browser: the page's messages go
 * to the same handler the game worker runs (src/game/host.ts), a scripted
 * human answers every decision, and the game must finish with a winner and a
 * record that `pnpm opbot review` can replay.
 */
import { describe, expect, test } from "bun:test";
import { applyCommand, createMatch } from "@tcg/op-engine";
import { matchConfig } from "@opbot/core/web";
import { createGameHost } from "../src/game/host.ts";
import type { ClientMessage, GameView, StartConfig, WorkerMessage } from "../src/game/protocol.ts";
import { catalog, firstLegalCommand, model } from "./helpers.ts";

function harness() {
  const messages: WorkerMessage[] = [];
  const host = createGameHost({
    catalog,
    model,
    post: (message) => messages.push(structuredClone(message)),
    yieldToEvents: () => Promise.resolve(),
  });
  const send = (message: ClientMessage) => host.handle(structuredClone(message));
  const views = () => messages.filter((m): m is Extract<WorkerMessage, { type: "view" }> => m.type === "view").map((m) => m.view);
  return { messages, host, send, views };
}

/** Plays a whole game as the scripted human. */
async function playToTheEnd(config: StartConfig, maxHumanMoves = 3000) {
  const h = harness();
  await h.send({ type: "start", config });
  let moves = 0;
  let movesThisTurn = 0;
  let lastTurn = -1;
  for (; moves < maxHumanMoves; moves++) {
    if (h.messages.some((m) => m.type === "gameOver" || m.type === "error")) break;
    const view = h.views().at(-1)!;
    expect(view.acting).toBe("human");
    if (view.turn !== lastTurn) {
      lastTurn = view.turn;
      movesThisTurn = 0;
    }
    const before = h.messages.length;
    await h.send({ type: "act", version: view.version, command: firstLegalCommand(view, movesThisTurn) });
    const rejected = h.messages.slice(before).find((m) => m.type === "rejected");
    expect(rejected).toBeUndefined();
    if (view.status === "active" && !view.prompt) movesThisTurn++;
  }
  return { ...h, moves };
}

describe("game worker protocol", () => {
  test("init lists the meta pool, the engine test decks and the three levels", async () => {
    const h = harness();
    await h.send({ type: "init" });
    const ready = h.messages[0];
    if (ready?.type !== "ready") throw new Error("expected ready");
    expect(ready.decks.filter((d) => d.group === "meta")).toHaveLength(9);
    expect(ready.decks.filter((d) => d.group === "test")).toHaveLength(6);
    expect(ready.decks[0]?.leaderName).toBe("Rocks.D.Xebec"); // most played first
    expect(ready.levels.map((l) => [l.id, l.agentSpec])).toEqual([
      ["rapido", "policy-honest"],
      ["normal", "search:sims=16,h=1,cands=8"],
      ["fuerte", "search:sims=32,h=1,cands=12"],
    ]);
  });

  test("a pasted list is checked with the CLI parser and the construction rules", async () => {
    const h = harness();
    await h.send({ type: "checkDeck", requestId: 7, choice: { kind: "text", text: "1xOP17-079\n4xOP17-086\nfoo" } });
    const reply = h.messages[0];
    if (reply?.type !== "deckChecked") throw new Error("expected deckChecked");
    expect(reply.requestId).toBe(7);
    expect(reply.result.ok).toBe(false);
    expect(reply.result.errors.join(" ")).toContain("Línea 3");
  });

  test("a full game against the Rápido bot finishes, and the record replays", async () => {
    const config: StartConfig = {
      human: { kind: "catalog", id: "meta:OP17-079-monkey-d-luffy" },
      bot: { kind: "catalog", id: "meta:OP17-039-rocks-d-xebec" },
      first: "human",
      level: "rapido",
      seed: "protocol-test-1",
    };
    const h = await playToTheEnd(config);
    expect(h.messages.find((m) => m.type === "error")).toBeUndefined();
    const started = h.messages.find((m) => m.type === "started");
    if (started?.type !== "started") throw new Error("expected started");
    expect(started.summary.humanDeck.leaderName).toBe("Monkey.D.Luffy");
    expect(started.summary.botDeck.leaderName).toBe("Rocks.D.Xebec");
    expect(started.summary.firstSide).toBe("human");

    const over = h.messages.find((m) => m.type === "gameOver");
    if (over?.type !== "gameOver") throw new Error("the game did not finish");
    expect(over.result.winner === "human" || over.result.winner === "bot").toBe(true);
    expect(over.botDecisions.length).toBeGreaterThan(10);

    // Same format as `pnpm opbot play`, replayable command by command.
    const record = over.record;
    expect(record.version).toBe(1);
    expect(record.players).toEqual({ south: "human", north: "policy-honest" });
    expect(record.decks.south.name).toBe("OP17-079-monkey-d-luffy");
    expect(record.decks.south.source).toContain("limitlesstcg");
    let state = createMatch(matchConfig({ seed: record.seed, decks: record.decks, firstSeat: record.firstSeat }));
    for (const command of record.commandLog) {
      const result = applyCommand(state, command);
      expect(result.accepted).toBe(true);
      state = result.state;
    }
    expect(state.status).toBe("finished");
    expect(state.winner).toBe(record.winner!);
    expect(record.winner === "south" ? "human" : "bot").toBe(over.result.winner!);

    // Every view is newer than the previous one, so the page can animate them in order.
    const versions = h.views().map((v) => v.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
  }, 120_000);

  test("the bot can go first and a stale or illegal command is rejected without changing the game", async () => {
    const h = harness();
    await h.send({
      type: "start",
      config: {
        human: { kind: "catalog", id: "test:red-aggro" },
        bot: { kind: "catalog", id: "test:blue-control" },
        first: "bot",
        level: "rapido",
        seed: "protocol-test-2",
      },
    });
    const view = h.views().at(-1)!;
    // The bot (first player) already decided its mulligan; now the human does.
    expect(view.status).toBe("setup");
    expect(view.acting).toBe("human");
    expect(view.legal.map((d) => d.type).sort()).toEqual(["concede", "keepHand", "mulligan"]);

    await h.send({ type: "act", version: view.version - 1, command: { type: "keepHand", seat: "south" } });
    expect(h.messages.at(-1)).toEqual({ type: "rejected", reason: "La partida ya ha avanzado; vuelve a elegir." });

    await h.send({ type: "act", version: view.version, command: { type: "endTurn", seat: "south" } });
    expect(h.messages.at(-1)?.type).toBe("rejected");
    expect(h.views().at(-1)!.version).toBe(view.version);

    await h.send({ type: "act", version: view.version, command: { type: "keepHand", seat: "south" } });
    // Kept, the game started and the bot played its whole first turn.
    const after = h.views().at(-1)!;
    expect(after.status).toBe("active");
    expect(after.turn).toBe(2);
    expect(after.acting).toBe("human");
  }, 60_000);

  test("abandon stops the game; a new start begins a fresh one", async () => {
    const h = harness();
    const config: StartConfig = {
      human: { kind: "catalog", id: "test:green-midrange" },
      bot: { kind: "catalog", id: "test:yellow-trigger" },
      first: "random",
      level: "normal",
      seed: "protocol-test-3",
    };
    await h.send({ type: "start", config });
    await h.send({ type: "abandon" });
    expect(h.host.session).toBeNull();
    await h.send({ type: "act", version: 1, command: { type: "keepHand", seat: "south" } });
    expect(h.messages.at(-1)).toEqual({ type: "error", message: "No hay ninguna partida en curso." });
    await h.send({ type: "start", config: { ...config, seed: "protocol-test-4" } });
    const view: GameView = h.views().at(-1)!;
    expect(view.status === "setup" || view.status === "active").toBe(true);
    expect(view.acting).toBe("human");
  }, 60_000);
});
