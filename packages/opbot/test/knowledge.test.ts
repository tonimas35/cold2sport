import { expect, test } from "bun:test";
import { createMatch, type GameLogEntry, type MatchSeat } from "@tcg/op-engine";
import { actingSeat, enumerateActions } from "../src/engine/actions.ts";
import { applyInPlace, cloneState } from "../src/engine/sim.ts";
import { canSee } from "../src/engine/determinize.ts";
import { Knowledge } from "../src/engine/knowledge.ts";
import { rolloutCommand } from "../src/search/rollout.ts";
import { matchConfig } from "../src/arena/game.ts";
import { engineTestDecks } from "../src/decks/deck.ts";
import { createRng } from "../src/util/rng.ts";

test("remembered cards are hidden, correct, and some get remembered", () => {
  const decks = engineTestDecks();
  let remembered = 0;
  for (let g = 0; g < 12; g++) {
    const spec = { seed: `kn-${g}`, decks: { south: decks[g % 6]!, north: decks[(g + 1) % 6]! }, firstSeat: "south" as MatchSeat };
    let state = cloneState(createMatch(matchConfig(spec)));
    const knowledge = new Knowledge();
    const rng = createRng(`kn-${g}`);
    const step = (command: Parameters<typeof applyInPlace>[1]) => {
      const next = cloneState(state);
      const logs: GameLogEntry[] = [];
      expect(applyInPlace(next, command, logs)).toBe(true);
      knowledge.observe(state, next, logs);
      state = next;
    };
    step({ type: "chooseJoKenPo", seat: "south", choice: "rock" });
    step({ type: "chooseJoKenPo", seat: "north", choice: "scissors" });
    step({ type: "chooseFirstPlayer", seat: "south", firstPlayer: "south" });
    step({ type: "keepHand", seat: "south" });
    step({ type: "keepHand", seat: "north" });
    step({ type: "startGame", seat: "south" });
    for (let i = 0; i < 400 && state.status === "active"; i++) {
      const seat = actingSeat(state)!;
      const command = rng.next() < 0.2 ? rng.pick(enumerateActions(state, seat)).command : rolloutCommand(state, seat, rng);
      step(command);
      for (const s of ["south", "north"] as const) {
        for (const [id, cardId] of knowledge.knownBy(s)) {
          expect(state.cards[id]!.cardId).toBe(cardId);
          expect(canSee(s, state.cards[id]!)).toBe(false);
          remembered++;
        }
      }
    }
  }
  expect(remembered).toBeGreaterThan(0);
}, 300_000);
