/**
 * The fast simulator must be observationally identical to the engine's own
 * applyCommand: same acceptance, same state (minus histories) and same legal
 * commands after every command of full bot games.
 *
 * Default: a handful of games (fast). Heavy run:
 *   SIM_DIFF_GAMES=300 bun test test/sim-differential.test.ts
 */
import { expect, test } from "bun:test";
import {
  applyCommand,
  createMatch,
  getLegalCommands,
  heuristicAgent,
  runBotMatch,
  TEST_DECKS,
  type MatchConfig,
  type TestDeckId,
} from "@tcg/op-engine";
import { applyInPlace, cloneState, freezeCardCatalog, stateFingerprint } from "../src/engine/sim.ts";

const DECK_IDS = Object.keys(TEST_DECKS) as TestDeckId[];
const GAMES = Number(process.env.SIM_DIFF_GAMES ?? 6);

function config(i: number): MatchConfig {
  const a = TEST_DECKS[DECK_IDS[i % DECK_IDS.length]!];
  const b = TEST_DECKS[DECK_IDS[(i + 1 + Math.floor(i / DECK_IDS.length)) % DECK_IDS.length]!];
  return {
    firstPlayer: i % 2 === 0 ? "south" : "north",
    seed: `sim-diff-${i}`,
    shuffleDecks: true,
    players: {
      south: { leaderCardId: a.leaderId, mainDeck: [...a.mainDeck] },
      north: { leaderCardId: b.leaderId, mainDeck: [...b.mainDeck] },
    },
  };
}

test(
  `fast simulator matches applyCommand on ${GAMES} full games`,
  () => {
    freezeCardCatalog();
    let commands = 0;
    for (let i = 0; i < GAMES; i++) {
      const cfg = config(i);
      const played = runBotMatch(cfg, { south: heuristicAgent, north: heuristicAgent }, { seed: cfg.seed });
      let reference = createMatch(cfg);
      const fast = cloneState(reference);
      for (const [step, command] of played.commandHistory.entries()) {
        const label = `game ${i} step ${step} ${command.type}`;
        const result = applyCommand(reference, command);
        const accepted = applyInPlace(fast, command);
        expect(accepted, label).toBe(result.accepted);
        reference = result.state;
        const ref = stateFingerprint(reference);
        const got = stateFingerprint(fast);
        if (ref !== got) expect(got, label).toBe(ref);
        expect(JSON.stringify(getLegalCommands(fast)), label).toBe(
          JSON.stringify(getLegalCommands(reference)),
        );
        commands++;
      }
      expect(fast.status).toBe(reference.status);
    }
    expect(commands).toBeGreaterThan(GAMES * 20);
  },
  { timeout: 600_000 },
);
