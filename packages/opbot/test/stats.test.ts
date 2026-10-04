import { describe, expect, test } from "bun:test";
import { addPair, emptyTally, eloToScore, estimate, scoreToElo, sprt } from "../src/arena/stats.ts";

function tallyOf(pairs: Array<[number, number]>) {
  return pairs.reduce((t, p) => addPair(t, p), emptyTally());
}

describe("stats", () => {
  test("elo <-> score round trip", () => {
    for (const elo of [-300, -50, 0, 35, 200]) expect(scoreToElo(eloToScore(elo))).toBeCloseTo(elo, 6);
    expect(eloToScore(0)).toBe(0.5);
  });

  test("estimate of a balanced tally is 50% with symmetric CI", () => {
    const t = tallyOf([[1, 0], [0, 1], [1, 1], [0, 0]]);
    const e = estimate(t);
    expect(e.pairs).toBe(4);
    expect(e.score).toBeCloseTo(0.5, 9);
    expect(e.ci95[0]).toBeCloseTo(1 - e.ci95[1], 9);
  });

  test("SPRT accepts H1 for a clearly stronger candidate and H0 for an equal one", () => {
    const strong = tallyOf(Array.from({ length: 300 }, (_, i) => (i % 4 === 0 ? [1, 0] : [1, 1]) as [number, number]));
    expect(sprt(strong, { elo0: 0, elo1: 30, alpha: 0.05, beta: 0.05 }).decision).toBe("H1");
    const equal = tallyOf(Array.from({ length: 2000 }, (_, i) => (i % 2 === 0 ? [1, 0] : i % 4 === 1 ? [1, 1] : [0, 0]) as [number, number]));
    expect(sprt(equal, { elo0: 0, elo1: 30, alpha: 0.05, beta: 0.05 }).decision).toBe("H0");
  });

  test("rejects impossible pair scores", () => {
    expect(() => addPair(emptyTally(), [2, 0])).toThrow();
  });
});
