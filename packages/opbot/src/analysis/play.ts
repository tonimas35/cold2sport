/**
 * Terminal game: you against a bot (or bot against bot), recorded to a JSON
 * file that `opbot review` can analyze afterwards.
 *
 * At each of your decisions you can type:
 *   <number>   play that action
 *   ?          analyze every option (win % with confidence intervals)
 *   h          what the bot would play here
 *   v          show the board again
 *   q          stop (the partial game is still saved)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createMatch, type EngineCommand, type GameLogEntry, type MatchSeat } from "@tcg/op-engine";
import { Knowledge } from "../engine/knowledge.ts";
import { actingSeat, enumerateActions, pendingJudgePrompt } from "../engine/actions.ts";
import { applyInPlace, cloneState } from "../engine/sim.ts";
import { matchConfig } from "../arena/game.ts";
import { createAgent, loadValueModel } from "../agents/factory.ts";
import type { Agent } from "../agents/types.ts";
import type { DeckList } from "../decks/deck.ts";
import { createRng } from "../util/rng.ts";
import { analyzePosition, describeAction, formatAnalysis } from "./analyze.ts";
import { cardName, renderView } from "./render.ts";
import type { GameRecord } from "./review.ts";

export interface PlayOptions {
  readonly decks: Record<MatchSeat, DeckList>;
  /** "human" or an agent spec, per seat. */
  readonly players: Record<MatchSeat, string>;
  readonly firstSeat: MatchSeat;
  readonly seed: string;
  readonly out: string;
  readonly hintAgent: string;
  readonly analysisWorlds: number;
  /** Line reader; defaults to the global prompt() (Bun). */
  readonly ask?: (question: string) => string | null;
  readonly print?: (text: string) => void;
}

const OTHER: Record<MatchSeat, MatchSeat> = { north: "south", south: "north" };

export function playInTerminal(options: PlayOptions): GameRecord {
  const ask = options.ask ?? ((q: string) => prompt(q));
  const print = options.print ?? ((t: string) => console.log(t));
  let state = cloneState(createMatch(matchConfig({ seed: options.seed, decks: options.decks, firstSeat: options.firstSeat })));
  const knowledge = new Knowledge();
  const log: EngineCommand[] = [];
  const bots: Partial<Record<MatchSeat, Agent>> = {};
  for (const seat of ["south", "north"] as const) {
    if (options.players[seat] !== "human") bots[seat] = createAgent(options.players[seat]);
  }
  const hint = createAgent(options.hintAgent);
  const model = loadValueModel();
  const rng = createRng(`${options.seed}:play`);
  const apply = (command: EngineCommand) => {
    const next = cloneState(state);
    const logs: GameLogEntry[] = [];
    if (!applyInPlace(next, command, logs)) throw new Error(`engine rejected ${JSON.stringify(command)}`);
    knowledge.observe(state, next, logs);
    state = next;
    log.push(command);
  };
  const save = (): GameRecord => {
    const record: GameRecord = {
      version: 1,
      date: new Date().toISOString(),
      seed: options.seed,
      decks: options.decks,
      firstSeat: options.firstSeat,
      players: options.players,
      commandLog: log,
      winner: state.status === "finished" ? state.winner : null,
    };
    mkdirSync(dirname(options.out), { recursive: true });
    writeFileSync(options.out, `${JSON.stringify(record, null, 1)}\n`);
    return record;
  };

  apply({ type: "chooseJoKenPo", seat: "south", choice: "rock" });
  apply({ type: "chooseJoKenPo", seat: "north", choice: "scissors" });
  apply({ type: "chooseFirstPlayer", seat: "south", firstPlayer: options.firstSeat });
  for (const seat of [options.firstSeat, OTHER[options.firstSeat]]) {
    let mulligan: boolean;
    const bot = bots[seat];
    if (bot) {
      mulligan = bot.mulligan({ state, seat, rng, knowledge: knowledge.knownBy(seat) });
    } else {
      print(`\nYour opening hand (${seat}):\n${renderView(state, seat).split("\n").filter((l) => l.includes("Hand:")).join("\n")}`);
      mulligan = (ask("Mulligan? [y/N] ") ?? "").trim().toLowerCase().startsWith("y");
    }
    apply(mulligan ? { type: "mulligan", seat } : { type: "keepHand", seat });
  }
  apply({ type: "startGame", seat: options.firstSeat });

  let lastTurnShown = -1;
  while (state.status === "active") {
    const judge = pendingJudgePrompt(state);
    if (judge) {
      apply({ type: "judgeResolvePrompt", seat: "judge", promptId: judge.id, note: "auto" });
      continue;
    }
    const seat = actingSeat(state);
    if (!seat) break;
    const actions = enumerateActions(state, seat);
    const bot = bots[seat];
    if (bot) {
      const command = bot.decide({ state, seat, rng, knowledge: knowledge.knownBy(seat) });
      const action = actions.find((a) => JSON.stringify(a.command) === JSON.stringify(command));
      print(`  ${seat} (bot): ${describeAction(state, action ?? { key: "?", command }, cardName)}`);
      apply(command);
      continue;
    }
    if (state.turnNumber !== lastTurnShown) {
      print(`\n${renderView(state, seat)}`);
      lastTurnShown = state.turnNumber;
    }
    if (actions.length === 1) {
      print(`  (only option) ${describeAction(state, actions[0]!, cardName)}`);
      apply(actions[0]!.command);
      continue;
    }
    print(`\nYour options (${seat}):`);
    actions.forEach((a, i) => print(`  ${i + 1}. ${describeAction(state, a, cardName)}`));
    for (;;) {
      const answer = (ask("> ") ?? "q").trim().toLowerCase();
      if (answer === "q") return save();
      if (answer === "v") {
        print(renderView(state, seat));
        continue;
      }
      if (answer === "?") {
        print(
          formatAnalysis(
            analyzePosition(state, { worlds: options.analysisWorlds, horizonTurns: 1, model, knowledge: knowledge.knownBy(seat) }, cardName, seat),
          ),
        );
        continue;
      }
      if (answer === "h") {
        const command = hint.decide({ state, seat, rng, knowledge: knowledge.knownBy(seat) });
        const action = actions.find((a) => JSON.stringify(a.command) === JSON.stringify(command));
        print(`  hint: ${describeAction(state, action ?? { key: "?", command }, cardName)}`);
        continue;
      }
      const n = Number(answer);
      if (Number.isInteger(n) && n >= 1 && n <= actions.length) {
        apply(actions[n - 1]!.command);
        break;
      }
      print("  type a number, ?, h, v or q");
    }
  }
  print(`\nGame over: ${state.winner ?? "no winner"} (${state.finishReason ?? "unfinished"}). Saved to ${options.out}`);
  return save();
}
