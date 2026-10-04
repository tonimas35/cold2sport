/**
 * Every action produced by enumerateActions must be accepted by the engine,
 * at every decision point of random games (all six test decks).
 */
import { expect, test } from "bun:test";
import { applyCommand, createMatch, type MatchSeat } from "@tcg/op-engine";
import { actingSeat, enumerateActions } from "../src/engine/actions.ts";
import { applyInPlace, cloneState } from "../src/engine/sim.ts";
import { matchConfig } from "../src/arena/game.ts";
import { engineTestDecks } from "../src/decks/deck.ts";
import { createRng } from "../src/util/rng.ts";

const GAMES = Number(process.env.ACTIONS_GAMES ?? 8);

test(`every enumerated action is legal (${GAMES} random games)`, () => {
  const decks = engineTestDecks();
  let checked = 0;
  for (let g = 0; g < GAMES; g++) {
    const rng = createRng(`actions-${g}`);
    const spec = {
      seed: `actions-${g}`,
      decks: { south: decks[g % decks.length]!, north: decks[(g + 2) % decks.length]! },
      firstSeat: (g % 2 === 0 ? "south" : "north") as MatchSeat,
    };
    const state = cloneState(createMatch(matchConfig(spec)));
    const setup = [
      { type: "chooseJoKenPo", seat: "south", choice: "rock" },
      { type: "chooseJoKenPo", seat: "north", choice: "scissors" },
      { type: "chooseFirstPlayer", seat: "south", firstPlayer: spec.firstSeat },
      { type: "keepHand", seat: "south" },
      { type: "keepHand", seat: "north" },
      { type: "startGame", seat: spec.firstSeat },
    ] as const;
    for (const c of setup) expect(applyInPlace(state, c)).toBe(true);
    for (let step = 0; step < 600 && state.status !== "finished"; step++) {
      const seat = actingSeat(state);
      expect(seat).not.toBeNull();
      const actions = enumerateActions(state, seat!);
      expect(actions.length).toBeGreaterThan(0);
      expect(new Set(actions.map((a) => a.key)).size).toBe(actions.length);
      // Check with the official engine (it validates the resulting state too).
      const frozenView = JSON.parse(JSON.stringify(state));
      for (const action of actions) {
        const result = applyCommand(frozenView, action.command);
        if (!result.accepted) {
          throw new Error(`rejected ${action.key}: ${result.reason} (game ${g} step ${step})`);
        }
        checked++;
      }
      expect(applyInPlace(state, rng.pick(actions).command)).toBe(true);
    }
  }
  expect(checked).toBeGreaterThan(GAMES * 50);
}, 600_000);
