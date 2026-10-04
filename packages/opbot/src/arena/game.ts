/**
 * Plays one game between two agents.
 *
 * Setup is scripted instead of left to the bots, so that paired games are
 * really paired: Jo-Ken-Po is fixed (south wins round 1) and south then picks
 * the first player requested by the experiment. Each seat's shuffles depend
 * only on (seed, seat), so two games with the same seed deal the same cards to
 * each seat whichever agent sits there.
 */
import {
  applyCommand,
  createMatch,
  type EngineCommand,
  type GameLogEntry,
  type MatchConfig,
  type MatchSeat,
  type MatchState,
} from "@tcg/op-engine";
import type { DeckList } from "../decks/deck.ts";
import { actingSeat, enumerateActions, pendingJudgePrompt } from "../engine/actions.ts";
import { applyInPlace, cloneState } from "../engine/sim.ts";
import { Knowledge } from "../engine/knowledge.ts";
import { createRng, type Rng } from "../util/rng.ts";
import type { Agent } from "../agents/types.ts";

export type EngineMode = "official" | "fast";

export interface GameSpec {
  readonly seed: string;
  readonly decks: Record<MatchSeat, DeckList>;
  readonly firstSeat: MatchSeat;
  /** Safety cap on commands after setup (the engine itself has no turn limit). */
  readonly maxCommands?: number;
  readonly engine?: EngineMode;
}

export type Termination = "rules" | "max-commands" | "no-action" | "illegal" | "error";

export interface DecisionRecord {
  readonly seat: MatchSeat;
  readonly turn: number;
  readonly millis: number;
  readonly iterations?: number;
}

export interface GameResult {
  readonly seed: string;
  readonly winner: MatchSeat | null;
  readonly termination: Termination;
  readonly finishReason: string | null;
  readonly turns: number;
  readonly commands: number;
  readonly firstSeat: MatchSeat;
  readonly mulligans: Record<MatchSeat, boolean>;
  readonly illegal: Record<MatchSeat, number>;
  readonly thinkMillis: Record<MatchSeat, number>;
  readonly decisions: Record<MatchSeat, number>;
  readonly capabilityIssues: number;
  readonly error?: string;
  /** Present when requested: every command applied, setup included. */
  readonly commandLog?: EngineCommand[];
}

export const OTHER: Record<MatchSeat, MatchSeat> = { north: "south", south: "north" };

export function matchConfig(spec: GameSpec): MatchConfig {
  return {
    firstPlayer: spec.firstSeat,
    seed: spec.seed,
    shuffleDecks: true,
    players: {
      south: { leaderCardId: spec.decks.south.leader, mainDeck: [...spec.decks.south.main] },
      north: { leaderCardId: spec.decks.north.leader, mainDeck: [...spec.decks.north.main] },
    },
  };
}

/** Mutable wrapper over either the official engine or the fast simulator. */
class Driver {
  state: MatchState;
  readonly log: EngineCommand[] = [];
  readonly knowledge = new Knowledge();
  constructor(
    initial: MatchState,
    private readonly mode: EngineMode,
  ) {
    this.state = mode === "fast" ? cloneState(initial) : initial;
  }
  /** Applies `command`; on rejection the state is left exactly as it was. */
  apply(command: EngineCommand): boolean {
    if (this.mode === "fast") {
      // A rejected command can leave a half-mutated state: work on a copy.
      const next = cloneState(this.state);
      const logs: GameLogEntry[] = [];
      let accepted = false;
      try {
        accepted = applyInPlace(next, command, logs);
      } catch {
        accepted = false;
      }
      if (!accepted) return false;
      this.knowledge.observe(this.state, next, logs);
      this.state = next;
      this.log.push(command);
      return true;
    }
    const result = applyCommand(this.state, command);
    if (!result.accepted) return false;
    this.knowledge.observe(this.state, result.state, result.logs);
    this.state = result.state;
    this.log.push(command);
    return true;
  }
}

export interface PlayOptions {
  readonly keepLog?: boolean;
  /** Called before each agent decision (not for scripted setup or judge prompts). */
  readonly onDecision?: (state: MatchState, seat: MatchSeat) => void;
}

export function playGame(
  spec: GameSpec,
  agents: Record<MatchSeat, Agent>,
  options: PlayOptions = {},
): GameResult {
  const driver = new Driver(createMatch(matchConfig(spec)), spec.engine ?? "official");
  const rngs: Record<MatchSeat, Rng> = {
    south: createRng(`${spec.seed}:agent:south`),
    north: createRng(`${spec.seed}:agent:north`),
  };
  const illegal = { south: 0, north: 0 };
  const thinkMillis = { south: 0, north: 0 };
  const decisions = { south: 0, north: 0 };
  const mulligans = { south: false, north: false };
  let termination: Termination = "rules";
  let error: string | undefined;

  const must = (command: EngineCommand) => {
    if (!driver.apply(command)) throw new Error(`setup command rejected: ${JSON.stringify(command)}`);
  };

  try {
    // Jo-Ken-Po: rock beats scissors, so south wins and chooses who goes first.
    must({ type: "chooseJoKenPo", seat: "south", choice: "rock" });
    must({ type: "chooseJoKenPo", seat: "north", choice: "scissors" });
    must({ type: "chooseFirstPlayer", seat: "south", firstPlayer: spec.firstSeat });
    for (const seat of [spec.firstSeat, OTHER[spec.firstSeat]]) {
      const wants = agents[seat].mulligan({ state: driver.state, seat, rng: rngs[seat], knowledge: driver.knowledge.knownBy(seat) });
      mulligans[seat] = wants;
      must(wants ? { type: "mulligan", seat } : { type: "keepHand", seat });
    }
    must({ type: "startGame", seat: spec.firstSeat });

    const maxCommands = spec.maxCommands ?? 1500;
    for (let step = 0; ; step++) {
      const state = driver.state;
      if (state.status === "finished") break;
      if (step >= maxCommands) {
        termination = "max-commands";
        break;
      }
      const judge = pendingJudgePrompt(state);
      if (judge) {
        must({ type: "judgeResolvePrompt", seat: "judge", promptId: judge.id, note: "auto" });
        continue;
      }
      const seat = actingSeat(state);
      if (!seat) {
        termination = "no-action";
        break;
      }
      options.onDecision?.(state, seat);
      const started = performance.now();
      const command = agents[seat].decide({ state, seat, rng: rngs[seat], knowledge: driver.knowledge.knownBy(seat) });
      thinkMillis[seat] += performance.now() - started;
      decisions[seat]++;
      if (!driver.apply(command)) {
        // Record it and keep the game going with the first action the engine
        // accepts, so one bad prompt answer does not void the whole game.
        illegal[seat]++;
        error ??= `illegal command from ${agents[seat].id}: ${JSON.stringify(command)}`;
        const fallback = enumerateActions(driver.state, seat).find((a) => driver.apply(a.command));
        if (!fallback) {
          termination = "illegal";
          break;
        }
      }
    }
  } catch (e) {
    termination = "error";
    error = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
  }

  const final = driver.state;
  return {
    seed: spec.seed,
    winner: termination === "rules" ? final.winner : null,
    termination,
    finishReason: final.finishReason,
    turns: final.turnNumber,
    commands: driver.log.length,
    firstSeat: spec.firstSeat,
    mulligans,
    illegal,
    thinkMillis,
    decisions,
    capabilityIssues: final.capabilityHistory.length,
    ...(error !== undefined && { error }),
    ...(options.keepLog && { commandLog: driver.log }),
  };
}
