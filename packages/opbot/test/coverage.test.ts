import { describe, expect, test } from "bun:test";
import type { MatchSeat } from "@tcg/op-engine";
import { createHeuristicAgent } from "../src/agents/heuristic.ts";
import type { Agent } from "../src/agents/types.ts";
import { catalogCoverage, engineSupport, missingCards } from "../src/decks/coverage.ts";
import { engineTestDecks } from "../src/decks/deck.ts";

describe("coverage", () => {
  test("missing cards are reported, never replaced", () => {
    const deck = engineTestDecks()[0]!;
    expect(missingCards(deck)).toEqual([]);
    const broken = { ...deck, main: [...deck.main.slice(0, 49), "ST99-001"] };
    expect(missingCards(broken)).toEqual(["ST99-001"]);
    const coverage = catalogCoverage(broken);
    expect(coverage.legal).toBe(false);
    expect(coverage.problems.join(" ")).toContain("ST99-001");
  });

  test("round robin plays every pair, both seats, and accounts for every game", () => {
    const decks = engineTestDecks().slice(0, 3);
    const run = engineSupport(decks, 2, "coverage-test");
    expect(run.games).toBe(6);
    expect(Object.values(run.terminations).reduce((a, b) => a + b, 0)).toBe(6);
    for (const d of run.decks) {
      expect(d.games).toBe(4);
      expect(Object.values(d.terminations).reduce((a, b) => a + b, 0)).toBe(4);
      expect(d.gamesWithIssues).toBeLessThanOrEqual(d.games);
    }
    // A record is charged to at most the two decks of its game.
    expect(run.decks.reduce((a, d) => a + d.capabilityIssues, 0)).toBeLessThanOrEqual(2 * run.capabilityIssues);
  });

  test("rejected commands are counted and tied to the deck and prompt, and the game goes on", () => {
    // Every 5th decision answers for the wrong seat, which the engine rejects.
    const sloppy = (): Agent => {
      const inner = createHeuristicAgent();
      let n = 0;
      return {
        ...inner,
        decide: (request) => {
          const command = inner.decide(request);
          const other: MatchSeat = request.seat === "south" ? "north" : "south";
          return ++n % 5 === 0 ? ({ ...command, seat: other } as typeof command) : command;
        },
        mulligan: (request) => inner.mulligan(request),
      };
    };
    const run = engineSupport(engineTestDecks().slice(0, 2), 2, "coverage-rejects", undefined, sloppy);
    expect(run.rejected).toBeGreaterThan(0);
    expect(run.decks.reduce((a, d) => a + d.rejected, 0)).toBe(run.rejected);
    for (const d of run.decks) {
      expect([...d.rejectedByCard.values()].reduce((a, b) => a + b, 0)).toBe(d.rejected);
    }
    expect(run.terminations.rules).toBe(run.games);
  });
});
