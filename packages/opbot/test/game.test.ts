import { expect, test } from "bun:test";
import { playGame } from "../src/arena/game.ts";
import { createHeuristicAgent } from "../src/agents/heuristic.ts";
import { createRandomAgent } from "../src/agents/random.ts";
import { engineTestDecks } from "../src/decks/deck.ts";

test("heuristic beats random and games finish by the rules", () => {
  const decks = engineTestDecks();
  let heuristicWins = 0;
  const games = 6;
  for (let g = 0; g < games; g++) {
    for (const engine of ["fast", "official"] as const) {
      const result = playGame(
        { seed: `game-${g}`, decks: { south: decks[g % 6]!, north: decks[(g + 1) % 6]! }, firstSeat: g % 2 === 0 ? "south" : "north", engine },
        { south: createHeuristicAgent(), north: createRandomAgent() },
      );
      expect(result.termination, result.error).toBe("rules");
      expect(result.illegal.south + result.illegal.north).toBe(0);
      if (engine === "fast" && result.winner === "south") heuristicWins++;
    }
  }
  expect(heuristicWins).toBeGreaterThanOrEqual(5);
}, 600_000);

test("fast and official engines produce the same game", () => {
  const decks = engineTestDecks();
  for (let g = 0; g < 3; g++) {
    const spec = { seed: `same-${g}`, decks: { south: decks[g]!, north: decks[g + 3]! }, firstSeat: "north" as const };
    const a = playGame({ ...spec, engine: "fast" }, { south: createHeuristicAgent(), north: createHeuristicAgent() }, { keepLog: true });
    const b = playGame({ ...spec, engine: "official" }, { south: createHeuristicAgent(), north: createHeuristicAgent() }, { keepLog: true });
    expect(a.winner).toBe(b.winner);
    expect(JSON.stringify(a.commandLog)).toBe(JSON.stringify(b.commandLog));
  }
}, 600_000);
