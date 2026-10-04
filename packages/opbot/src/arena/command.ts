/**
 * `opbot arena`: paired evaluation of a candidate agent against a baseline.
 *
 * A block is two games with the same seed, the same deck on each seat and the
 * same player going first; only the agents swap seats. Blocks cycle through
 * every ordered deck pairing and alternate who goes first. Games run in
 * parallel child processes, in batches; after each batch the parent updates
 * the pentanomial tally and stops early when the SPRT decides.
 *
 *   opbot arena --candidate search:sims=200 --baseline heuristic \
 *     --decks test --blocks 400 --workers 4 --sprt 0,35 --out out/arena.jsonl
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { MatchSeat } from "@tcg/op-engine";
import { createAgent } from "../agents/factory.ts";
import { loadDeckPool } from "../decks/pool.ts";
import type { DeckList } from "../decks/deck.ts";
import { playGame, type GameResult } from "./game.ts";
import { addPair, emptyTally, estimate, formatEstimate, sprt, type PairTally } from "./stats.ts";

type Args = Record<string, string | boolean>;

interface ShardRunner {
  isChild: boolean;
  workers: number;
  runShards(command: string, args: Args, shards: number): Promise<void>;
}

export interface BlockPlan {
  block: number;
  seed: string;
  southDeck: number;
  northDeck: number;
  firstSeat: MatchSeat;
}

export function planBlock(block: number, deckCount: number, seedBase: string, mirrors: boolean): BlockPlan {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < deckCount; i++) {
    for (let j = 0; j < deckCount; j++) if (mirrors || i !== j || deckCount === 1) pairs.push([i, j]);
  }
  const [southDeck, northDeck] = pairs[block % pairs.length]!;
  const firstSeat: MatchSeat = Math.floor(block / pairs.length) % 2 === 0 ? "south" : "north";
  return { block, seed: `${seedBase}-${block}`, southDeck, northDeck, firstSeat };
}

export interface GameLine {
  block: number;
  game: 0 | 1;
  candidateSeat: MatchSeat;
  decks: { south: string; north: string };
  firstSeat: MatchSeat;
  candidateScore: number;
  result: Omit<GameResult, "commandLog">;
}

function str(args: Args, key: string, fallback: string): string {
  const v = args[key];
  return typeof v === "string" ? v : fallback;
}

function num(args: Args, key: string, fallback: number): number {
  const v = args[key];
  return typeof v === "string" ? Number(v) : fallback;
}

function runBlocks(args: Args, decks: DeckList[], from: number, to: number, out: string): void {
  const candidateSpec = str(args, "candidate", "heuristic");
  const baselineSpec = str(args, "baseline", "heuristic");
  const seedBase = str(args, "seed", "arena");
  const mirrors = args["no-mirrors"] !== true;
  const engine = str(args, "engine", "official") === "fast" ? "fast" : "official";
  for (let block = from; block < to; block++) {
    const plan = planBlock(block, decks.length, seedBase, mirrors);
    for (const game of [0, 1] as const) {
      const candidateSeat: MatchSeat = game === 0 ? "south" : "north";
      const baselineSeat: MatchSeat = candidateSeat === "south" ? "north" : "south";
      const agents = {
        [candidateSeat]: createAgent(candidateSpec),
        [baselineSeat]: createAgent(baselineSpec),
      } as Record<MatchSeat, ReturnType<typeof createAgent>>;
      const result = playGame(
        {
          seed: plan.seed,
          decks: { south: decks[plan.southDeck]!, north: decks[plan.northDeck]! },
          firstSeat: plan.firstSeat,
          engine,
        },
        agents,
      );
      const candidateScore =
        result.winner === null ? 0.5 : result.winner === candidateSeat ? 1 : 0;
      const line: GameLine = {
        block,
        game,
        candidateSeat,
        decks: { south: decks[plan.southDeck]!.name, north: decks[plan.northDeck]!.name },
        firstSeat: plan.firstSeat,
        candidateScore,
        result,
      };
      appendFileSync(out, `${JSON.stringify(line)}\n`);
    }
  }
}

export function readTally(path: string): { tally: PairTally; lines: GameLine[] } {
  const lines = existsSync(path)
    ? readFileSync(path, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as GameLine)
    : [];
  const byBlock = new Map<number, GameLine[]>();
  for (const l of lines) byBlock.set(l.block, [...(byBlock.get(l.block) ?? []), l]);
  let tally = emptyTally();
  for (const games of byBlock.values()) {
    if (games.length !== 2) continue;
    tally = addPair(tally, [games[0]!.candidateScore, games[1]!.candidateScore]);
  }
  return { tally, lines };
}

export function summarize(lines: GameLine[]): string {
  const out: string[] = [];
  const problems = lines.filter((l) => l.result.termination !== "rules");
  if (problems.length > 0) {
    const kinds = new Map<string, number>();
    for (const p of problems) kinds.set(p.result.termination, (kinds.get(p.result.termination) ?? 0) + 1);
    out.push(`non-rules endings: ${[...kinds].map(([k, n]) => `${k}=${n}`).join(" ")}`);
  }
  const byMatchup = new Map<string, { score: number; n: number }>();
  for (const l of lines) {
    const candDeck = l.candidateSeat === "south" ? l.decks.south : l.decks.north;
    const baseDeck = l.candidateSeat === "south" ? l.decks.north : l.decks.south;
    const key = `${candDeck} vs ${baseDeck}`;
    const m = byMatchup.get(key) ?? { score: 0, n: 0 };
    m.score += l.candidateScore;
    m.n++;
    byMatchup.set(key, m);
  }
  const first = lines.filter((l) => l.firstSeat === l.candidateSeat);
  const second = lines.filter((l) => l.firstSeat !== l.candidateSeat);
  const avg = (ls: GameLine[]) => (ls.length ? ls.reduce((s, l) => s + l.candidateScore, 0) / ls.length : NaN);
  out.push(`candidate going first: ${(avg(first) * 100).toFixed(1)}% (${first.length}) | going second: ${(avg(second) * 100).toFixed(1)}% (${second.length})`);
  const think = (seatOf: (l: GameLine) => MatchSeat) => {
    let ms = 0, d = 0;
    for (const l of lines) {
      const s = seatOf(l);
      ms += l.result.thinkMillis[s];
      d += l.result.decisions[s];
    }
    return d ? ms / d : 0;
  };
  out.push(`think time per decision: candidate ${think((l) => l.candidateSeat).toFixed(1)} ms, baseline ${think((l) => (l.candidateSeat === "south" ? "north" : "south")).toFixed(1)} ms`);
  const worst = [...byMatchup].map(([k, m]) => [k, m.score / m.n, m.n] as const).sort((a, b) => a[1] - b[1]);
  out.push(`matchups (candidate deck vs baseline deck), worst first: ${worst.slice(0, 8).map(([k, s, n]) => `${k} ${(s * 100).toFixed(0)}% (${n})`).join(" | ")}`);
  return out.join("\n");
}

export async function runArenaCommand(args: Args, runner: ShardRunner): Promise<void> {
  const decks = loadDeckPool(str(args, "decks", "test"));
  const out = resolve(str(args, "out", "out/arena.jsonl"));
  if (runner.isChild) {
    runBlocks(args, decks, num(args, "from", 0), num(args, "to", 0), `${out}.part${num(args, "part", 0)}`);
    return;
  }
  mkdirSync(dirname(out), { recursive: true });
  if (args.resume !== true && existsSync(out)) rmSync(out);
  const maxBlocks = num(args, "blocks", 200);
  const batchPerWorker = num(args, "batch", 4);
  const [elo0, elo1] = str(args, "sprt", "0,35").split(",").map(Number) as [number, number];
  const sprtConfig = { elo0, elo1, alpha: 0.05, beta: 0.05 };
  let next = readTally(out).lines.reduce((m, l) => Math.max(m, l.block + 1), 0);
  console.log(
    `arena: ${str(args, "candidate", "heuristic")} vs ${str(args, "baseline", "heuristic")} | ${decks.length} decks | up to ${maxBlocks} blocks | SPRT elo0=${elo0} elo1=${elo1}`,
  );
  while (next < maxBlocks) {
    const shards = runner.workers;
    const perShard = Math.min(batchPerWorker, Math.ceil((maxBlocks - next) / shards));
    const ranges = Array.from({ length: shards }, (_, i) => [next + i * perShard, Math.min(maxBlocks, next + (i + 1) * perShard)] as const).filter(([a, b]) => b > a);
    await Promise.all(
      ranges.map(([from, to], shard) =>
        runner.runShards("arena", { ...args, out, from: String(from), to: String(to), part: String(shard) }, 1),
      ),
    );
    for (let shard = 0; shard < ranges.length; shard++) {
      const part = `${out}.part${shard}`;
      if (existsSync(part)) {
        appendFileSync(out, readFileSync(part, "utf8"));
        rmSync(part);
      }
    }
    next = ranges[ranges.length - 1]![1];
    const { tally, lines } = readTally(out);
    const est = estimate(tally);
    const test = sprt(tally, sprtConfig);
    console.log(`[${tally.counts.join("/")}] ${formatEstimate(est)} | LLR ${test.llr.toFixed(2)} [${test.lower.toFixed(2)}, ${test.upper.toFixed(2)}] ${test.decision}`);
    if (test.decision !== "continue" && args["no-stop"] !== true) {
      console.log(`SPRT decided ${test.decision} after ${est.pairs} blocks`);
      break;
    }
    if (next >= maxBlocks) console.log(summarize(lines));
  }
  const { tally, lines } = readTally(out);
  const summaryPath = out.replace(/\.jsonl$/, ".summary.txt");
  writeFileSync(summaryPath, `${formatEstimate(estimate(tally))}\n${summarize(lines)}\n`);
  console.log(summarize(lines));
}
