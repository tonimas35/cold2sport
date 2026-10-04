/** Speed of the official engine path vs the fast simulator, on heuristic games. */
import { applyCommand, createMatch, getLegalCommands } from "@tcg/op-engine";
import { playGame, matchConfig } from "./arena/game.ts";
import { createHeuristicAgent } from "./agents/heuristic.ts";
import { engineTestDecks } from "./decks/deck.ts";
import { applyInPlace, cloneState } from "./engine/sim.ts";
import { determinize } from "./engine/determinize.ts";
import { createRng } from "./util/rng.ts";

export function runBench(games: number): void {
  const decks = engineTestDecks();
  const logs = [];
  let t = performance.now();
  for (let g = 0; g < games; g++) {
    const spec = { seed: `bench-${g}`, decks: { south: decks[g % 6]!, north: decks[(g + 1) % 6]! }, firstSeat: "south" as const, engine: "fast" as const };
    const r = playGame(spec, { south: createHeuristicAgent(), north: createHeuristicAgent() }, { keepLog: true });
    logs.push({ spec, log: r.commandLog! });
  }
  const heurGames = (performance.now() - t) / 1000;
  const commands = logs.reduce((n, l) => n + l.log.length, 0);
  let official = 0, fast = 0, legalOfficial = 0, legalFast = 0, clone = 0, det = 0;
  const rng = createRng("bench");
  for (const { spec, log } of logs) {
    let s = createMatch(matchConfig(spec));
    const f = cloneState(s);
    for (const c of log) {
      t = performance.now(); s = applyCommand(s, c).state; official += performance.now() - t;
      t = performance.now(); applyInPlace(f, c); fast += performance.now() - t;
      t = performance.now(); getLegalCommands(s); legalOfficial += performance.now() - t;
      t = performance.now(); getLegalCommands(f); legalFast += performance.now() - t;
    }
    t = performance.now(); for (let i = 0; i < 20; i++) cloneState(f); clone += (performance.now() - t) / 20;
    t = performance.now(); for (let i = 0; i < 20; i++) determinize(f, "south", rng); det += (performance.now() - t) / 20;
  }
  const per = (x: number) => `${(x / commands).toFixed(3)} ms`;
  console.log(`games: ${games}, commands: ${commands} (${(commands / games).toFixed(0)}/game)`);
  console.log(`heuristic-vs-heuristic full games (fast engine): ${(games / heurGames).toFixed(1)} games/s`);
  console.log(`applyCommand (official): ${per(official)} | applyInPlace (fast): ${per(fast)} | speed-up x${(official / fast).toFixed(1)}`);
  console.log(`getLegalCommands on official states: ${per(legalOfficial)} | on fast states: ${per(legalFast)}`);
  console.log(`cloneState (end of game): ${(clone / logs.length).toFixed(3)} ms | determinize: ${(det / logs.length).toFixed(3)} ms`);
}
