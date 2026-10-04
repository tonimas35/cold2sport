/**
 * Position files: describe a game situation by hand and turn it into a full
 * engine state for the analyzer.
 *
 *   {
 *     "toMove": "south",              // whose turn it is (main phase)
 *     "turn": 7,                      // optional, default 5
 *     "firstPlayer": "north",         // optional, default: the seat that did not move on even turns
 *     "south": {
 *       "deck": "decks/meta-op17-postban/OP17-039-rocks.txt",
 *       "life": 3,
 *       "hand": ["OP17-040", "OP17-045"],
 *       "characters": [{ "card": "OP17-041", "rested": true, "don": 1, "justPlayed": false }],
 *       "stage": null,
 *       "trash": ["OP17-050"],
 *       "leaderDon": 0, "leaderRested": false,
 *       "activeDon": 4, "restedDon": 2
 *     },
 *     "north": { "deck": "...", "life": 4, "handCount": 5, "characters": [], "activeDon": 0, "restedDon": 6 }
 *   }
 *
 * Paths are relative to the position file. Every card not listed (hidden hand
 * cards beyond `hand`, the decks, face-down Life) is drawn from the decklist
 * minus the cards that are listed; the analyzer re-deals them anyway.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createTestMatchState, type MatchSeat, type MatchState, type PlayerFixture } from "@tcg/op-engine";
import { loadDeckFile } from "../decks/pool.ts";
import type { DeckList } from "../decks/deck.ts";
import { createRng } from "../util/rng.ts";

interface CharacterSpec {
  card: string;
  rested?: boolean;
  don?: number;
  justPlayed?: boolean;
}

interface SideSpec {
  deck: string;
  life: number;
  hand?: string[];
  handCount?: number;
  characters?: CharacterSpec[];
  stage?: string | null;
  trash?: string[];
  leaderDon?: number;
  leaderRested?: boolean;
  activeDon?: number;
  restedDon?: number;
  donDeck?: number;
}

export interface PositionSpec {
  toMove: MatchSeat;
  turn?: number;
  firstPlayer?: MatchSeat;
  south: SideSpec;
  north: SideSpec;
}

function take(pool: string[], cardId: string, side: string): void {
  const i = pool.indexOf(cardId);
  if (i < 0) throw new Error(`${side}: ${cardId} is listed more times than the decklist has copies`);
  pool.splice(i, 1);
}

function buildSide(spec: SideSpec, deck: DeckList, side: string, turn: number, seed: string): PlayerFixture {
  const pool = [...deck.main];
  const hand = spec.hand ?? [];
  const characters = spec.characters ?? [];
  const trash = spec.trash ?? [];
  for (const id of [...hand, ...characters.map((c) => c.card), ...trash, ...(spec.stage ? [spec.stage] : [])]) {
    take(pool, id, side);
  }
  const rng = createRng(seed);
  rng.shuffle(pool);
  const handCount = Math.max(spec.handCount ?? hand.length, hand.length);
  const unknownHand = pool.splice(0, handCount - hand.length);
  const life = pool.splice(0, spec.life);
  if (life.length < spec.life) throw new Error(`${side}: not enough cards left for ${spec.life} Life`);
  const activeDon = spec.activeDon ?? 0;
  const restedDon = spec.restedDon ?? 0;
  const attached = (spec.leaderDon ?? 0) + characters.reduce((n, c) => n + (c.don ?? 0), 0);
  const donDeck = spec.donDeck ?? Math.max(0, 10 - activeDon - restedDon - attached);
  return {
    leaderCardId: deck.leader,
    hand: [...hand, ...unknownHand],
    deck: pool,
    life,
    character: characters.map((c) => ({
      cardId: c.card,
      rested: c.rested ?? false,
      attachedDon: c.don ?? 0,
      playedOnTurn: c.justPlayed ? turn : Math.max(0, turn - 2),
    })),
    stage: spec.stage ? { cardId: spec.stage } : null,
    trash,
    activeDon,
    restedDon,
    donDeckCount: donDeck,
  };
}

export function loadPosition(path: string): { state: MatchState; spec: PositionSpec } {
  const file = resolve(path);
  const spec = JSON.parse(readFileSync(file, "utf8")) as PositionSpec;
  const base = dirname(file);
  const turn = spec.turn ?? 5;
  const decks = {
    south: loadDeckFile(resolve(base, spec.south.deck)),
    north: loadDeckFile(resolve(base, spec.north.deck)),
  };
  const firstPlayer: MatchSeat =
    spec.firstPlayer ?? (turn % 2 === 1 ? spec.toMove : spec.toMove === "south" ? "north" : "south");
  const state = createTestMatchState(
    buildSide(spec.south, decks.south, "south", turn, `${file}:south`),
    buildSide(spec.north, decks.north, "north", turn, `${file}:north`),
    { firstPlayer, activeSeat: spec.toMove, turnNumber: turn, seed: `position:${file}` },
  );
  for (const seat of ["south", "north"] as const) {
    const side = spec[seat];
    const leader = state.cards[state.players[seat].leaderInstanceId]!;
    leader.attachedDon = side.leaderDon ?? 0;
    leader.rested = side.leaderRested ?? false;
  }
  return { state, spec };
}
