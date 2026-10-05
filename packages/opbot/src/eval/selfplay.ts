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
import { createAgent } from "../agents/factory.ts";
import { withExploration } from "../agents/epsilon.ts";
import type { Agent } from "../agents/types.ts";
import { extractFeatures } from "./features.ts";
import { createRng } from "../util/rng.ts";

export interface SampleRow {
  game: string;
  turn: number;
  seat: MatchSeat;
  f: number[];
  y: number;
}

/** Agent spec (see agents/spec.ts) and its relative weight in the mix. */
export interface AgentMixEntry {
  readonly spec: string;
  readonly weight: number;
}

/** "policy:3,heuristic:1" -> [{spec: "policy", weight: 3}, ...]; the last ":" separates the weight. */
export function parseAgentMix(text: string): AgentMixEntry[] {
  return text.split(",").map((part) => {
    const at = part.lastIndexOf(":");
    const weight = at > 0 ? Number(part.slice(at + 1)) : Number.NaN;
    return Number.isFinite(weight) && weight > 0
      ? { spec: part.slice(0, at).trim(), weight }
      : { spec: part.trim(), weight: 1 };
  });
}

/**
 * `mix` chooses the agents of each seat. Default (no mix): 75% engine
 * heuristic, 25% aggressive, as the first models were trained. Positions from
 * stronger play (the improved policy) are closer to what the search sees, but
 * a share of weaker agents keeps the data varied.
 */
export function generateSelfPlay(
  decks: readonly DeckList[],
  games: number,
  seedBase: string,
  onRow: (row: SampleRow) => void,
  mix?: readonly AgentMixEntry[],
): { games: number; finished: number } {
  const total = mix?.reduce((a, m) => a + m.weight, 0) ?? 0;
  let finished = 0;
  for (let g = 0; g < games; g++) {
    const rng = createRng(`${seedBase}:${g}`);
    const seed = `${seedBase}-${g}`;
    const south = decks[rng.int(decks.length)]!;
    const north = decks[rng.int(decks.length)]!;
    const make = () => {
      let base: Agent;
      if (mix && total > 0) {
        let r = rng.next() * total;
        const entry = mix.find((m) => (r -= m.weight) < 0) ?? mix[mix.length - 1]!;
        base = createAgent(entry.spec);
      } else {
        base = rng.next() < 0.75 ? createHeuristicAgent() : createAggressiveAgent();
      }
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
