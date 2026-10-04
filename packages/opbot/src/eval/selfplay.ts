/**
 * Generates training positions for the value model: games between baseline
 * agents (with a little exploration for diversity), recording the position at
 * the start of every turn from both seats' points of view, labelled with the
 * final result.
 */
import type { MatchSeat } from "@tcg/op-engine";
import { playGame, OTHER } from "../arena/game.ts";
import type { DeckList } from "../decks/deck.ts";
import { createHeuristicAgent, createAggressiveAgent } from "../agents/heuristic.ts";
import { withExploration } from "../agents/epsilon.ts";
import { extractFeatures } from "./features.ts";
import { createRng } from "../util/rng.ts";

export interface SampleRow {
  game: string;
  turn: number;
  seat: MatchSeat;
  f: number[];
  y: number;
}

export function generateSelfPlay(
  decks: readonly DeckList[],
  games: number,
  seedBase: string,
  onRow: (row: SampleRow) => void,
): { games: number; finished: number } {
  let finished = 0;
  for (let g = 0; g < games; g++) {
    const rng = createRng(`${seedBase}:${g}`);
    const seed = `${seedBase}-${g}`;
    const south = decks[rng.int(decks.length)]!;
    const north = decks[rng.int(decks.length)]!;
    const make = () => {
      const base = rng.next() < 0.75 ? createHeuristicAgent() : createAggressiveAgent();
      return withExploration(base, [0, 0.03, 0.08][rng.int(3)]!);
    };
    const rows: Array<Omit<SampleRow, "y">> = [];
    let lastTurnRecorded = -1;
    const result = playGame(
      { seed, decks: { south, north }, firstSeat: rng.next() < 0.5 ? "south" : "north", engine: "fast" },
      { south: make(), north: make() },
      {
        onDecision: (state) => {
          if (state.phase !== "main" || state.turnNumber === lastTurnRecorded) return;
          if (state.promptQueue.some((p) => p.status === "pending")) return;
          lastTurnRecorded = state.turnNumber;
          for (const seat of [state.activeSeat, OTHER[state.activeSeat]]) {
            rows.push({ game: seed, turn: state.turnNumber, seat, f: Array.from(extractFeatures(state, seat)) });
          }
        },
      },
    );
    if (result.termination !== "rules" || result.winner === null) continue;
    finished++;
    for (const row of rows) onRow({ ...row, y: row.seat === result.winner ? 1 : 0 });
  }
  return { games, finished };
}
