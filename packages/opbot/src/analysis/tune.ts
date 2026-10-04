/**
 * Deck tuning: does a set of card swaps make a deck better against a field?
 *
 * The base list and the variant play the same games: same opponent deck, same
 * seed, same seat and same player going first. Only the swapped cards differ,
 * so most of the luck cancels out in the paired difference.
 *
 * Swap syntax: "-2xOP17-050,+2xOP16-012,-1xOP17-061,+1xOP17-062".
 */
import type { MatchSeat } from "@tcg/op-engine";
import { createAgent } from "../agents/factory.ts";
import { checkDeck, type DeckList } from "../decks/deck.ts";
import { playGame } from "../arena/game.ts";

export function applySwaps(deck: DeckList, swaps: string): DeckList {
  const main = [...deck.main];
  for (const raw of swaps.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = /^([+-])(\d+)x([A-Z0-9]+-\d{3}[A-Za-z0-9_-]*)$/.exec(raw);
    if (!m) throw new Error(`bad swap "${raw}" (expected e.g. -2xOP17-050 or +2xOP16-012)`);
    const [, sign, n, id] = m;
    for (let i = 0; i < Number(n); i++) {
      if (sign === "+") main.push(id!);
      else {
        const at = main.indexOf(id!);
        if (at < 0) throw new Error(`cannot remove ${id}: not enough copies in ${deck.name}`);
        main.splice(at, 1);
      }
    }
  }
  const variant: DeckList = { ...deck, name: `${deck.name}${swaps ? " (variant)" : ""}`, main };
  const check = checkDeck(variant);
  if (!check.valid) throw new Error(`variant is not a legal deck: ${check.problems.join("; ")}`);
  return variant;
}

export interface TuneGame {
  game: number;
  opponent: string;
  base: number;
  variant: number;
}

/** Plays games [from, to) of the schedule: game g = opponent g % n, seed g, seats and first player alternating. */
export function playTuneGames(
  base: DeckList,
  variant: DeckList,
  field: readonly DeckList[],
  agentSpec: string,
  from: number,
  to: number,
  seedBase: string,
  onGame: (g: TuneGame) => void,
): void {
  for (let g = from; g < to; g++) {
    const opponent = field[g % field.length]!;
    const mySeat: MatchSeat = Math.floor(g / field.length) % 2 === 0 ? "south" : "north";
    const oppSeat: MatchSeat = mySeat === "south" ? "north" : "south";
    const firstSeat: MatchSeat = Math.floor(g / (2 * field.length)) % 2 === 0 ? mySeat : oppSeat;
    const score = (deck: DeckList) => {
      const decks = { [mySeat]: deck, [oppSeat]: opponent } as Record<MatchSeat, DeckList>;
      const r = playGame(
        { seed: `${seedBase}-${g}`, decks, firstSeat, engine: "fast" },
        { south: createAgent(agentSpec), north: createAgent(agentSpec) },
      );
      return r.winner === null ? 0.5 : r.winner === mySeat ? 1 : 0;
    };
    onGame({ game: g, opponent: opponent.name, base: score(base), variant: score(variant) });
  }
}

export function formatTune(games: readonly TuneGame[], swaps: string, agent: string): string {
  const n = games.length;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const diffs = games.map((g) => g.variant - g.base);
  const d = mean(diffs);
  const sd = n > 1 ? Math.sqrt(diffs.reduce((a, x) => a + (x - d) ** 2, 0) / (n - 1)) : 1;
  const half = 1.96 * sd / Math.sqrt(Math.max(1, n));
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const lines = [
    `Swaps: ${swaps} | ${n} paired games | agent ${agent}`,
    `  base ${pct(mean(games.map((g) => g.base)))} -> variant ${pct(mean(games.map((g) => g.variant)))}`,
    `  difference ${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)} points [95% CI ${(100 * (d - half)).toFixed(1)}, ${(100 * (d + half)).toFixed(1)}]${d - half > 0 ? "  -> variant is better" : d + half < 0 ? "  -> variant is worse" : "  -> no significant difference"}`,
    "  per opponent:",
  ];
  const byOpp = new Map<string, TuneGame[]>();
  for (const g of games) byOpp.set(g.opponent, [...(byOpp.get(g.opponent) ?? []), g]);
  for (const [opp, gs] of byOpp) {
    lines.push(`    vs ${opp}: base ${pct(mean(gs.map((g) => g.base)))}, variant ${pct(mean(gs.map((g) => g.variant)))} (${gs.length} games)`);
  }
  return lines.join("\n");
}
