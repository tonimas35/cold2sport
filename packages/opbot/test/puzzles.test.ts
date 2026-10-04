/**
 * Positions with a known answer (examples/puzzles/*.json, field "_expect").
 * Regression guard for the analyzer: the search must find forced wins and
 * must flag the moves that throw them away.
 */
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPosition } from "../src/analysis/position.ts";
import { analyzePosition } from "../src/analysis/analyze.ts";
import { cardName } from "../src/analysis/render.ts";
import { loadValueModel } from "../src/agents/factory.ts";

const DIR = resolve(import.meta.dir, "../../../examples/puzzles");

interface Expectation {
  bestKeyPrefix?: string;
  minWinNow?: number;
  worstKey?: string;
  worseKeyPrefix?: string;
}

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  test(`puzzle ${file}`, () => {
    const expected = (JSON.parse(readFileSync(join(DIR, file), "utf8")) as { _expect: Expectation })._expect;
    const { state } = loadPosition(join(DIR, file));
    const a = analyzePosition(state, { worlds: 12, horizonTurns: 1, model: loadValueModel(), seed: "puzzle" }, cardName);
    const best = a.actions[0]!;
    if (expected.bestKeyPrefix) expect(best.key.startsWith(expected.bestKeyPrefix), `best was ${best.key}`).toBe(true);
    if (expected.minWinNow !== undefined) expect(best.winNowRate).toBeGreaterThanOrEqual(expected.minWinNow);
    if (expected.worstKey) expect(a.actions[a.actions.length - 1]!.key).toBe(expected.worstKey);
    if (expected.worseKeyPrefix) {
      const worse = a.actions.filter((x) => x.key.startsWith(expected.worseKeyPrefix!));
      expect(worse.length).toBeGreaterThan(0);
      for (const x of worse) expect(x.deltaCi95[1], x.key).toBeLessThan(0);
    }
  }, 120_000);
}
