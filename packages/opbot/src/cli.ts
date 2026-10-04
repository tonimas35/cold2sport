#!/usr/bin/env bun
/**
 * opbot command line. Run from the repo root with `pnpm opbot <command>` or
 * `bun packages/opbot/src/cli.ts <command>`.
 *
 *   selfplay     generate value-model training positions
 *   train-value  fit the value model
 *   arena        paired evaluation of two agents (SPRT)
 *   bench        engine / simulator speed
 */
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { cpus } from "node:os";

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command: string; args: Args } {
  const [command = "help", ...rest] = argv;
  const args: Args = {};
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]!;
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return { command, args };
}

function str(args: Args, key: string, fallback?: string): string {
  const v = args[key];
  if (typeof v === "string") return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`missing --${key}`);
}

function num(args: Args, key: string, fallback: number): number {
  const v = args[key];
  return typeof v === "string" ? Number(v) : fallback;
}

const CLI = resolve(import.meta.dir, "cli.ts");

/** Runs `command` in `shards` child processes and waits for all of them. */
async function runShards(command: string, args: Args, shards: number): Promise<void> {
  const procs = Array.from({ length: shards }, (_, shard) => {
    const argv = [command, ...Object.entries(args).flatMap(([k, v]) => (v === true ? [`--${k}`] : [`--${k}`, String(v)]))];
    argv.push("--shard", String(shard), "--shards", String(shards), "--child");
    return Bun.spawn(["bun", CLI, ...argv], { stdout: "inherit", stderr: "inherit" });
  });
  const codes = await Promise.all(procs.map((p) => p.exited));
  if (codes.some((c) => c !== 0)) throw new Error(`shard failed: exit codes ${codes.join(",")}`);
}

async function main(): Promise<void> {
  const { command, args } = parseArgs(process.argv.slice(2));
  const workers = num(args, "workers", Math.max(1, cpus().length));
  const isChild = args.child === true;

  switch (command) {
    case "selfplay": {
      const out = resolve(str(args, "out", "out/selfplay.jsonl"));
      const games = num(args, "games", 200);
      if (!isChild && workers > 1) {
        mkdirSync(dirname(out), { recursive: true });
        await runShards("selfplay", { ...args, out }, workers);
        const parts = Array.from({ length: workers }, (_, i) => `${out}.part${i}`);
        writeFileSync(out, parts.map((p) => readFileSync(p, "utf8")).join(""));
        for (const p of parts) rmSync(p);
        console.log(`selfplay: wrote ${out}`);
        return;
      }
      const shard = num(args, "shard", 0);
      const shards = num(args, "shards", 1);
      const { engineTestDecks } = await import("./decks/deck.ts");
      const { loadDeckPool } = await import("./decks/pool.ts");
      const { generateSelfPlay } = await import("./eval/selfplay.ts");
      const decks = args.decks ? loadDeckPool(str(args, "decks")) : engineTestDecks();
      const target = isChild ? `${out}.part${shard}` : out;
      mkdirSync(dirname(target), { recursive: true });
      if (existsSync(target)) rmSync(target);
      const mine = Math.floor(games / shards) + (shard < games % shards ? 1 : 0);
      let buffer = "";
      const started = performance.now();
      const res = generateSelfPlay(decks, mine, `${str(args, "seed", "sp")}-s${shard}`, (row) => {
        buffer += `${JSON.stringify(row)}\n`;
        if (buffer.length > 1 << 20) {
          appendFileSync(target, buffer);
          buffer = "";
        }
      });
      appendFileSync(target, buffer);
      console.log(`selfplay shard ${shard}: ${res.finished}/${res.games} games in ${((performance.now() - started) / 1000).toFixed(1)}s`);
      return;
    }

    case "train-value": {
      const { fitLogistic, metrics } = await import("./eval/train.ts");
      const { FEATURE_NAMES } = await import("./eval/features.ts");
      const files = str(args, "data").split(",");
      const rows = files.flatMap((f) =>
        readFileSync(resolve(f), "utf8")
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l) as { game: string; f: number[]; y: number }),
      );
      // Split by game so positions of one game never sit on both sides.
      const isTest = (game: string) => {
        let h = 0;
        for (let i = 0; i < game.length; i++) h = (h * 31 + game.charCodeAt(i)) >>> 0;
        return h % 5 === 0;
      };
      const toSet = (rs: typeof rows) => ({
        x: rs.map((r) => Float64Array.from(r.f)),
        y: Float64Array.from(rs.map((r) => r.y)),
      });
      const train = toSet(rows.filter((r) => !isTest(r.game)));
      const test = toSet(rows.filter((r) => isTest(r.game)));
      const l2 = num(args, "l2", 1);
      const w = fitLogistic(train, l2);
      const mTrain = metrics(w, train);
      const mTest = metrics(w, test);
      const base = test.y.reduce((a, b) => a + b, 0) / test.y.length;
      console.log(`train: ${JSON.stringify(mTrain)}`);
      console.log(`test:  ${JSON.stringify(mTest)} (base rate ${base.toFixed(3)})`);
      const out = resolve(str(args, "out", "packages/opbot/models/value.json"));
      mkdirSync(dirname(out), { recursive: true });
      const model = {
        version: str(args, "version", `logreg-${new Date().toISOString().slice(0, 10)}`),
        featureNames: [...FEATURE_NAMES],
        weights: w.map((x) => Number(x.toFixed(6))),
        trainedOn: `${files.join(",")} (${rows.length} rows, l2=${l2})`,
        metrics: { testLogLoss: mTest.logLoss, testBrier: mTest.brier, testAccuracy: mTest.accuracy, testRows: mTest.n },
      };
      writeFileSync(out, `${JSON.stringify(model, null, 2)}\n`);
      const ranked = FEATURE_NAMES.map((n, i) => [n, w[i]!] as const).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      console.log(ranked.map(([n, x]) => `${n}=${x.toFixed(2)}`).join(" "));
      console.log(`wrote ${out}`);
      return;
    }

    case "arena": {
      const { runArenaCommand } = await import("./arena/command.ts");
      await runArenaCommand(args, { isChild, workers, runShards });
      return;
    }

    case "bench": {
      const { runBench } = await import("./bench.ts");
      runBench(num(args, "games", 20));
      return;
    }

    default:
      console.log(
        "usage: opbot <selfplay|train-value|arena|bench> [--options]\n" +
          "  see packages/opbot/README.md for every option",
      );
  }
}

await main();
