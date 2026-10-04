/**
 * Deck-vs-deck simulation: how often deck A beats deck B when the same agent
 * plays both sides, with a confidence interval and the going-first/second split.
 *
 * Games come in pairs on the same seed: deck A goes first in one game and
 * second in the other, so the first-player advantage cancels out within a pair.
 * Decks alternate seats from pair to pair.
 */
import type { MatchSeat } from "@tcg/op-engine";
import { createAgent } from "../agents/factory.ts";
import type { DeckList } from "../decks/deck.ts";
import { playGame } from "../arena/game.ts";

export interface MatchupGame {
  pair: number;
  aSeat: MatchSeat;
  aFirst: boolean;
  aScore: number;
  turns: number;
  termination: string;
  capabilityIssues: number;
}

export function playMatchupPairs(
  deckA: DeckList,
  deckB: DeckList,
  agentSpec: string,
  fromPair: number,
  toPair: number,
  seedBase: string,
  onGame: (game: MatchupGame) => void,
): void {
  for (let pair = fromPair; pair < toPair; pair++) {
    const aSeat: MatchSeat = pair % 2 === 0 ? "south" : "north";
    const bSeat: MatchSeat = aSeat === "south" ? "north" : "south";
    for (const aFirst of [true, false]) {
      const decks = { [aSeat]: deckA, [bSeat]: deckB } as Record<MatchSeat, DeckList>;
      const result = playGame(
        { seed: `${seedBase}-${pair}`, decks, firstSeat: aFirst ? aSeat : bSeat, engine: "fast" },
        { south: createAgent(agentSpec), north: createAgent(agentSpec) },
      );
      onGame({
        pair,
        aSeat,
        aFirst,
        aScore: result.winner === null ? 0.5 : result.winner === aSeat ? 1 : 0,
        turns: result.turns,
        termination: result.termination,
        capabilityIssues: result.capabilityIssues,
      });
    }
  }
}

export interface MatchupSummary {
  games: number;
  aWinRate: number;
  ci95: [number, number];
  aFirstWinRate: number;
  aSecondWinRate: number;
  avgTurns: number;
  nonRulesEndings: number;
  gamesWithCapabilityIssues: number;
}

export function summarizeMatchup(games: MatchupGame[]): MatchupSummary {
  const byPair = new Map<number, number[]>();
  for (const g of games) byPair.set(g.pair, [...(byPair.get(g.pair) ?? []), g.aScore]);
  const pairMeans = [...byPair.values()].filter((v) => v.length === 2).map((v) => (v[0]! + v[1]!) / 2);
  const n = pairMeans.length;
  const mean = n ? pairMeans.reduce((a, b) => a + b, 0) / n : NaN;
  const sd = n > 1 ? Math.sqrt(pairMeans.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0.5;
  const half = 1.96 * (sd / Math.sqrt(Math.max(1, n)));
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  return {
    games: games.length,
    aWinRate: mean,
    ci95: [Math.max(0, mean - half), Math.min(1, mean + half)],
    aFirstWinRate: avg(games.filter((g) => g.aFirst).map((g) => g.aScore)),
    aSecondWinRate: avg(games.filter((g) => !g.aFirst).map((g) => g.aScore)),
    avgTurns: avg(games.map((g) => g.turns)),
    nonRulesEndings: games.filter((g) => g.termination !== "rules").length,
    gamesWithCapabilityIssues: games.filter((g) => g.capabilityIssues > 0).length,
  };
}

export function formatMatchup(a: DeckList, b: DeckList, s: MatchupSummary, agent: string): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  return [
    `${a.name} vs ${b.name} (${s.games} games, both sides played by ${agent})`,
    `  ${a.name} wins ${pct(s.aWinRate)}  [95% CI ${pct(s.ci95[0])} - ${pct(s.ci95[1])}]`,
    `  going first: ${pct(s.aFirstWinRate)} | going second: ${pct(s.aSecondWinRate)} | avg turns ${s.avgTurns.toFixed(1)}`,
    s.nonRulesEndings || s.gamesWithCapabilityIssues
      ? `  warnings: ${s.nonRulesEndings} games did not end by the rules; ${s.gamesWithCapabilityIssues} games hit card effects the engine cannot execute`
      : "  engine: every game ended by the rules, no unsupported card effects",
  ].join("\n");
}
