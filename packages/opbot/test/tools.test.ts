import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { applySwaps } from "../src/analysis/tune.ts";
import { categorize, formatReview, type ReviewEntry } from "../src/analysis/review.ts";
import { formatCalibration, deckPairs } from "../src/analysis/calibrate.ts";
import { loadPosition } from "../src/analysis/position.ts";
import { summarizeMatchup } from "../src/analysis/matchup.ts";
import { loadDeckFile } from "../src/decks/pool.ts";
import { canSee } from "../src/engine/determinize.ts";

const ROOT = resolve(import.meta.dir, "../../..");

test("applySwaps keeps 50 cards and enforces deck rules", () => {
  const deck = loadDeckFile(`${ROOT}/decks/engine-test/red-aggro.txt`);
  const variant = applySwaps(deck, "-4xOP01-029,+2xOP01-019,+2xOP03-014");
  expect(variant.main.length).toBe(50);
  expect(variant.main.filter((c) => c === "OP01-029").length).toBe(0);
  expect(() => applySwaps(deck, "+4xOP01-016,-4xOP01-029")).toThrow(/Copy limit|copies/);
  expect(() => applySwaps(deck, "-1xOP17-001")).toThrow(/not enough copies/);
  expect(() => applySwaps(deck, "2xOP01-019")).toThrow(/bad swap/);
});

test("review categories follow the chess convention", () => {
  expect(categorize(0)).toBe("best");
  expect(categorize(0.02)).toBe("good");
  expect(categorize(0.05)).toBe("inaccuracy");
  expect(categorize(0.1)).toBe("mistake");
  expect(categorize(0.2)).toBe("blunder");
  const entries: ReviewEntry[] = [
    { step: 10, turn: 3, options: 5, played: "End turn", playedWin: 0.4, best: "Attack", bestWin: 0.6, loss: 0.2, category: "blunder" },
    { step: 12, turn: 3, options: 2, played: "Attack", playedWin: 0.6, best: "Attack", bestWin: 0.6, loss: 0, category: "best" },
  ];
  const text = formatReview(entries, "south");
  expect(text).toContain("blunders 1");
  expect(text).toContain('BLUNDER -20.0: played "End turn"');
  expect(text).not.toContain("step 12");
});

test("matchup summary pairs games and splits first/second", () => {
  const s = summarizeMatchup([
    { pair: 0, aSeat: "south", aFirst: true, aScore: 1, turns: 9, termination: "rules", capabilityIssues: 0 },
    { pair: 0, aSeat: "south", aFirst: false, aScore: 0, turns: 10, termination: "rules", capabilityIssues: 0 },
    { pair: 1, aSeat: "north", aFirst: true, aScore: 1, turns: 8, termination: "rules", capabilityIssues: 2 },
    { pair: 1, aSeat: "north", aFirst: false, aScore: 1, turns: 9, termination: "rules", capabilityIssues: 0 },
  ]);
  expect(s.aWinRate).toBeCloseTo(0.75, 9);
  expect(s.aFirstWinRate).toBe(1);
  expect(s.aSecondWinRate).toBe(0.5);
  expect(s.gamesWithCapabilityIssues).toBe(1);
});

test("calibration report computes correlation over matchups with enough real games", () => {
  expect(deckPairs([{}, {}, {}] as never).length).toBe(3);
  const text = formatCalibration(
    [
      { a: "A", b: "B", simulated: 0.7, simulatedGames: 40, real: 0.65, realGames: 20 },
      { a: "A", b: "C", simulated: 0.3, simulatedGames: 40, real: 0.35, realGames: 12 },
      { a: "B", b: "C", simulated: 0.5, simulatedGames: 40, real: 0.55, realGames: 9 },
      { a: "C", b: "D", simulated: 0.5, simulatedGames: 40, real: null, realGames: 0 },
    ],
    "test",
  );
  expect(text).toContain("matchups with >= 5 real games: 3");
  expect(text).toContain("correlation 0.98");
  expect(text).toContain("same favourite in 2/3");
});

test("position files build a legal state from the visible facts", () => {
  const { state } = loadPosition(`${ROOT}/examples/positions/ejemplo-luffy-vs-rocks.json`);
  expect(state.activeSeat).toBe("south");
  expect(state.turnNumber).toBe(7);
  expect(state.players.south.life.length).toBe(3);
  expect(state.players.north.life.length).toBe(2);
  expect(state.players.north.hand.length).toBe(4);
  expect(state.players.south.activeDon).toBe(5);
  const southHand = state.players.south.hand.map((id) => state.cards[id]!.cardId).sort();
  expect(southHand).toEqual(["OP17-086", "OP17-119"]);
  // The opponent's hand is hidden from south; south's own hand is visible.
  for (const id of state.players.north.hand) expect(canSee("south", state.cards[id]!)).toBe(false);
  for (const owner of ["south", "north"] as const) {
    const count = Object.values(state.cards).filter((c) => c.owner === owner && c.zone !== "leader").length;
    expect(count).toBe(50);
  }
});
