import { expect, test } from "bun:test";
import { createMatch, type MatchSeat, type MatchState } from "@tcg/op-engine";
import { actingSeat, enumerateActions } from "../src/engine/actions.ts";
import { canSee, determinize } from "../src/engine/determinize.ts";
import { applyInPlace, cloneState } from "../src/engine/sim.ts";
import { matchConfig } from "../src/arena/game.ts";
import { engineTestDecks } from "../src/decks/deck.ts";
import { createRng } from "../src/util/rng.ts";

function midGame(seed: string, steps: number): MatchState {
  const decks = engineTestDecks();
  const spec = { seed, decks: { south: decks[0]!, north: decks[4]! }, firstSeat: "south" as MatchSeat };
  const state = cloneState(createMatch(matchConfig(spec)));
  const setup = [
    { type: "chooseJoKenPo", seat: "south", choice: "rock" },
    { type: "chooseJoKenPo", seat: "north", choice: "scissors" },
    { type: "chooseFirstPlayer", seat: "south", firstPlayer: "south" },
    { type: "keepHand", seat: "south" },
    { type: "keepHand", seat: "north" },
    { type: "startGame", seat: "south" },
  ] as const;
  for (const c of setup) applyInPlace(state, c);
  const rng = createRng(seed);
  for (let i = 0; i < steps && state.status === "active"; i++) {
    const seat = actingSeat(state)!;
    applyInPlace(state, rng.pick(enumerateActions(state, seat)).command);
  }
  return state;
}

const multiset = (ids: string[]) => [...ids].sort().join(",");

test("determinize keeps everything the seat can see and re-deals the rest", () => {
  const state = midGame("det-1", 40);
  const seat: MatchSeat = "south";
  const rng = createRng("w");
  let changedOppHand = 0;
  for (let w = 0; w < 50; w++) {
    const world = determinize(state, seat, rng);
    for (const [id, inst] of Object.entries(state.cards)) {
      const after = world.cards[id]!;
      expect(after.zone).toBe(inst.zone);
      if (canSee(seat, inst)) expect(after.cardId).toBe(inst.cardId);
    }
    for (const owner of ["south", "north"] as const) {
      const all = (s: MatchState) => Object.values(s.cards).filter((c) => c.owner === owner).map((c) => c.cardId);
      expect(multiset(all(world))).toBe(multiset(all(state)));
    }
    const oppHand = (s: MatchState) => multiset(s.players.north.hand.map((id) => s.cards[id]!.cardId));
    if (oppHand(world) !== oppHand(state)) changedOppHand++;
    expect(world.config.seed).not.toBe(state.config.seed);
  }
  expect(changedOppHand).toBeGreaterThan(40);
});

test("games continue legally from determinized worlds", () => {
  for (let g = 0; g < 6; g++) {
    const state = midGame(`det-play-${g}`, 30 + g * 7);
    const world = determinize(state, g % 2 === 0 ? "south" : "north", createRng(`p${g}`));
    const rng = createRng(`r${g}`);
    for (let i = 0; i < 800 && world.status === "active"; i++) {
      const seat = actingSeat(world)!;
      const actions = enumerateActions(world, seat);
      expect(actions.length).toBeGreaterThan(0);
      expect(applyInPlace(world, rng.pick(actions).command)).toBe(true);
    }
    expect(world.status).toBe("finished");
  }
});
