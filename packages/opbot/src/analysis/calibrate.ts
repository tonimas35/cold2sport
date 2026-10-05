/**
 * Calibration of matchup simulations against real tournament results.
 *
 * Simulated: deck A vs deck B with the same agent on both sides (see
 * matchup.ts). Real: head-to-head results between the two Leaders in the
 * cached Limitless pairings (any list with that Leader). The comparison tells
 * how far simulated matchup numbers can be trusted, per agent.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isStandardEvent, leaderOf } from "../decks/meta.ts";
import type { DeckList } from "../decks/deck.ts";

export interface RealMatchup {
  wins: number;
  games: number;
}

/** Real results "leaderA vs leaderB" (from A's side) from the cached Limitless events. */
export function realMatchups(cacheDir: string, since: string, leaders: readonly string[]): Map<string, RealMatchup> {
  const out = new Map<string, RealMatchup>();
  const root = join(cacheDir, "tournaments");
  if (!existsSync(root)) return out;
  for (const id of readdirSync(root)) {
    const dir = join(root, id);
    const read = (prefix: string) => {
      const file = readdirSync(dir).find((f) => f.startsWith(prefix));
      return file ? JSON.parse(readFileSync(join(dir, file), "utf8")) : null;
    };
    const details = read("details");
    const standings = read("standings") as Array<Parameters<typeof leaderOf>[0] & { player: string }> | null;
    const pairings = read("pairings") as Array<{ player1: string; player2?: string | null; winner: string | number | null }> | null;
    if (!details || !standings || !pairings || !isStandardEvent(details) || String(details.date) < since) continue;
    const leaderBy = new Map(standings.map((s) => [s.player, leaderOf(s)]));
    for (const p of pairings) {
      if (!p.player2) continue;
      const a = leaderBy.get(p.player1);
      const b = leaderBy.get(p.player2);
      if (!a || !b || a === b || !leaders.includes(a) || !leaders.includes(b)) continue;
      const score = p.winner === p.player1 ? 1 : p.winner === p.player2 ? 0 : 0.5;
      for (const [x, y, s] of [
        [a, b, score],
        [b, a, 1 - score],
      ] as const) {
        const key = `${x} vs ${y}`;
        const r = out.get(key) ?? { wins: 0, games: 0 };
        r.wins += s;
        r.games++;
        out.set(key, r);
      }
    }
  }
  return out;
}

export interface CalibrationRow {
  a: string;
  b: string;
  simulated: number;
  simulatedGames: number;
  real: number | null;
  realGames: number;
}

export function formatCalibration(rows: readonly CalibrationRow[], agent: string): string {
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  const lines = [`Simulated (${agent}, both sides) vs real Limitless head-to-head results:`, ""];
  lines.push("deck A vs deck B".padEnd(58) + "simulated     real");
  for (const r of rows) {
    lines.push(
      `${r.a} vs ${r.b}`.padEnd(58) +
        `${pct(r.simulated)} (${r.simulatedGames})`.padEnd(14) +
        (r.real === null ? "-" : `${pct(r.real)} (${r.realGames})`),
    );
  }
  const paired = rows.filter((r) => r.real !== null && r.realGames >= 5);
  if (paired.length >= 3) {
    const xs = paired.map((r) => r.simulated);
    const ys = paired.map((r) => r.real!);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys[i]! - my), 0);
    const sx = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0));
    const sy = Math.sqrt(ys.reduce((a, y) => a + (y - my) ** 2, 0));
    const mae = paired.reduce((a, r) => a + Math.abs(r.simulated - r.real!), 0) / paired.length;
    const sameSide = paired.filter((r) => (r.simulated - 0.5) * (r.real! - 0.5) > 0).length;
    lines.push(
      "",
      `matchups with >= 5 real games: ${paired.length} | correlation ${(cov / (sx * sy)).toFixed(2)} | mean absolute error ${(mae * 100).toFixed(1)} points | same favourite in ${sameSide}/${paired.length}`,
    );
  } else {
    lines.push("", "not enough real games to compare (need >= 3 matchups with >= 5 games)");
  }
  return lines.join("\n");
}

export function deckPairs(decks: readonly DeckList[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < decks.length; i++) for (let j = i + 1; j < decks.length; j++) pairs.push([i, j]);
  return pairs;
}
