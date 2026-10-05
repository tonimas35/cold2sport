#!/usr/bin/env bun
/**
 * opbot command line. Run from the repo root with `pnpm opbot <command>` or
 * `bun packages/opbot/src/cli.ts <command>`.
 *
 *   selfplay     generate value-model training positions
 *   train-value  fit the value model
 *   arena        paired evaluation of two agents (SPRT)
 *   bench        engine / simulator speed
 *   meta-decks   build the post-ban meta deck pool from Limitless (decks/meta-command.ts)
 *   analyze      every action of a position with its win probability
 *   matchup      deck A vs deck B with the same agent on both sides
 *   play         play in the terminal against a bot (or watch bot vs bot), saved for review
 *   review       analyze every decision of one seat in a recorded game
 *   tune         base deck vs a variant with card swaps, against a field of decks
 *   calibrate    simulated matchup matrix vs real Limitless head-to-head results
 *   import       OPTCGSim / OPBounty combat log -> position file (list moments with --list)
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
      let mTrain = metrics(w, train);
      let mTest = metrics(w, test);
      let mlp: import("./eval/mlp.ts").MlpWeights | undefined;
      const hidden = num(args, "mlp", 0);
      if (hidden > 0) {
        const { trainMlp, mlpMetrics } = await import("./eval/mlp.ts");
        console.log(`logistic test: ${JSON.stringify(mTest)}`);
        mlp = trainMlp(train, { hidden, epochs: num(args, "epochs", 10), lr: num(args, "lr", 0.003), l2: num(args, "mlp-l2", 1e-5), seed: 7, batch: 256 }, (e, loss) =>
          process.stderr.write(`\r  mlp epoch ${e + 1}: train loss ${loss.toFixed(4)}   `),
        );
        process.stderr.write("\n");
        mTrain = mlpMetrics(mlp, train);
        mTest = mlpMetrics(mlp, test);
      }
      const base = test.y.reduce((a, b) => a + b, 0) / test.y.length;
      console.log(`train: ${JSON.stringify(mTrain)}`);
      console.log(`test:  ${JSON.stringify(mTest)} (base rate ${base.toFixed(3)})`);
      const out = resolve(str(args, "out", "packages/opbot/models/value.json"));
      mkdirSync(dirname(out), { recursive: true });
      const model = {
        version: str(args, "version", `logreg-${new Date().toISOString().slice(0, 10)}`),
        featureNames: [...FEATURE_NAMES],
        weights: w.map((x) => Number(x.toFixed(6))),
        ...(mlp && {
          mlp: { ...mlp, w1: mlp.w1.map((x) => Number(x.toFixed(6))), b1: mlp.b1.map((x) => Number(x.toFixed(6))), w2: mlp.w2.map((x) => Number(x.toFixed(6))) },
        }),
        trainedOn: `${files.join(",")} (${rows.length} rows, l2=${l2}${mlp ? `, mlp hidden=${mlp.hidden}` : ""})`,
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

    case "meta-decks": {
      const { runMetaDecksCommand } = await import("./decks/meta-command.ts");
      await runMetaDecksCommand(args);
      return;
    }

    case "analyze": {
      const { loadPosition } = await import("./analysis/position.ts");
      const { analyzePosition, formatAnalysis } = await import("./analysis/analyze.ts");
      const { loadValueModel } = await import("./agents/factory.ts");
      const { getCard } = await import("./engine/internals.ts");
      const { state } = loadPosition(str(args, "position"));
      const analysis = analyzePosition(
        state,
        {
          worlds: num(args, "worlds", 64),
          horizonTurns: num(args, "horizon", 1),
          model: loadValueModel(typeof args.model === "string" ? args.model : undefined),
          seed: str(args, "seed", "analysis"),
        },
        (id) => (getCard(id) as { i18n: { en: { name: string } } }).i18n.en.name,
      );
      if (args.json === true) console.log(JSON.stringify(analysis, null, 2));
      else console.log(formatAnalysis(analysis));
      return;
    }

    case "matchup": {
      const { loadDeckFile } = await import("./decks/pool.ts");
      const { playMatchupPairs, summarizeMatchup, formatMatchup } = await import("./analysis/matchup.ts");
      const a = loadDeckFile(resolve(str(args, "a")));
      const b = loadDeckFile(resolve(str(args, "b")));
      const agent = str(args, "agent", "heuristic");
      const pairs = Math.ceil(num(args, "games", 200) / 2);
      const out = resolve(str(args, "out", `out/matchup-${a.name}-vs-${b.name}.jsonl`));
      if (isChild) {
        const shard = num(args, "shard", 0);
        const shards = num(args, "shards", 1);
        const target = `${out}.part${shard}`;
        if (existsSync(target)) rmSync(target);
        const per = Math.ceil(pairs / shards);
        playMatchupPairs(a, b, agent, shard * per, Math.min(pairs, (shard + 1) * per), str(args, "seed", "matchup"), (g) =>
          appendFileSync(target, `${JSON.stringify(g)}\n`),
        );
        return;
      }
      mkdirSync(dirname(out), { recursive: true });
      await runShards("matchup", { ...args, out }, Math.min(workers, pairs));
      const parts = Array.from({ length: Math.min(workers, pairs) }, (_, i) => `${out}.part${i}`).filter(existsSync);
      const text = parts.map((p) => readFileSync(p, "utf8")).join("");
      writeFileSync(out, text);
      for (const p of parts) rmSync(p);
      const games = text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
      console.log(formatMatchup(a, b, summarizeMatchup(games), agent));
      return;
    }

    case "play": {
      const { loadDeckFile } = await import("./decks/pool.ts");
      const { playInTerminal } = await import("./analysis/play.ts");
      const seed = str(args, "seed", `play-${Date.now()}`);
      playInTerminal({
        decks: { south: loadDeckFile(resolve(str(args, "deck"))), north: loadDeckFile(resolve(str(args, "vs"))) },
        players: { south: str(args, "south", "human"), north: str(args, "north", str(args, "bot", "search:sims=64")) },
        firstSeat: str(args, "first", "south") === "north" ? "north" : "south",
        seed,
        out: resolve(str(args, "out", `out/games/${seed}.json`)),
        hintAgent: str(args, "hint", "search:sims=128"),
        analysisWorlds: num(args, "worlds", 32),
      });
      return;
    }

    case "review": {
      const { reviewGame, formatReview } = await import("./analysis/review.ts");
      const { loadValueModel } = await import("./agents/factory.ts");
      const record = JSON.parse(readFileSync(resolve(str(args, "game")), "utf8"));
      const seat = str(args, "seat", "south") === "north" ? "north" : "south";
      const entries = reviewGame(
        record,
        seat,
        { worlds: num(args, "worlds", 32), horizonTurns: num(args, "horizon", 1), model: loadValueModel(typeof args.model === "string" ? args.model : undefined) },
        (e, done, total) => process.stderr.write(`\r  reviewing ${done}/${total} decisions (turn ${e.turn})   `),
      );
      process.stderr.write("\n");
      console.log(formatReview(entries, seat));
      return;
    }

    case "tune": {
      const { loadDeckFile, loadDeckPool } = await import("./decks/pool.ts");
      const { applySwaps, playTuneGames, formatTune } = await import("./analysis/tune.ts");
      const base = loadDeckFile(resolve(str(args, "deck")));
      const swaps = str(args, "swaps");
      const variant = applySwaps(base, swaps);
      const field = loadDeckPool(str(args, "field"));
      const agent = str(args, "agent", "heuristic");
      const total = num(args, "games", 120);
      const out = resolve(str(args, "out", `out/tune-${base.name}.jsonl`));
      const parts = Math.min(workers, total);
      if (isChild) {
        const shard = num(args, "shard", 0);
        const per = Math.ceil(total / num(args, "shards", 1));
        const target = `${out}.part${shard}`;
        if (existsSync(target)) rmSync(target);
        playTuneGames(base, variant, field, agent, shard * per, Math.min(total, (shard + 1) * per), str(args, "seed", "tune"), (g) =>
          appendFileSync(target, `${JSON.stringify(g)}\n`),
        );
        return;
      }
      mkdirSync(dirname(out), { recursive: true });
      await runShards("tune", { ...args, out }, parts);
      const files = Array.from({ length: parts }, (_, i) => `${out}.part${i}`).filter(existsSync);
      const text = files.map((f) => readFileSync(f, "utf8")).join("");
      writeFileSync(out, text);
      for (const f of files) rmSync(f);
      console.log(formatTune(text.split("\n").filter(Boolean).map((l) => JSON.parse(l)), swaps, agent));
      return;
    }

    case "calibrate": {
      const { loadDeckPool } = await import("./decks/pool.ts");
      const { playMatchupPairs, summarizeMatchup } = await import("./analysis/matchup.ts");
      const { realMatchups, formatCalibration, deckPairs } = await import("./analysis/calibrate.ts");
      const decks = loadDeckPool(str(args, "decks", "decks/meta-op17-postban"));
      const agent = str(args, "agent", "heuristic");
      const pairsPerMatchup = Math.ceil(num(args, "games", 40) / 2);
      const out = resolve(str(args, "out", `out/calibrate-${agent.replace(/[^a-z0-9]+/gi, "_")}.jsonl`));
      const matchups = deckPairs(decks);
      if (isChild) {
        const shard = num(args, "shard", 0);
        const shards = num(args, "shards", 1);
        const target = `${out}.part${shard}`;
        if (existsSync(target)) rmSync(target);
        matchups.forEach(([i, j], m) => {
          if (m % shards !== shard) return;
          playMatchupPairs(decks[i]!, decks[j]!, agent, 0, pairsPerMatchup, str(args, "seed", "calibrate"), (g) =>
            appendFileSync(target, `${JSON.stringify({ a: i, b: j, ...g })}\n`),
          );
        });
        return;
      }
      mkdirSync(dirname(out), { recursive: true });
      const shards = Math.min(workers, matchups.length);
      await runShards("calibrate", { ...args, out }, shards);
      const files = Array.from({ length: shards }, (_, k) => `${out}.part${k}`).filter(existsSync);
      const text = files.map((f) => readFileSync(f, "utf8")).join("");
      writeFileSync(out, text);
      for (const f of files) rmSync(f);
      const games = text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
      const real = realMatchups(resolve(str(args, "cache", "out/limitless-cache")), str(args, "since", "2026-08-13"), decks.map((d) => d.leader));
      const rows = matchups.map(([i, j]) => {
        const s = summarizeMatchup(games.filter((g) => g.a === i && g.b === j));
        const r = real.get(`${decks[i]!.leader} vs ${decks[j]!.leader}`);
        return { a: decks[i]!.name, b: decks[j]!.name, simulated: s.aWinRate, simulatedGames: s.games, real: r ? r.wins / r.games : null, realGames: r?.games ?? 0 };
      });
      console.log(formatCalibration(rows, agent));
      return;
    }

    case "import": {
      const { parseOptcgsimLog, positionFromLog, observedDeckText } = await import("./analysis/import-optcgsim.ts");
      const game = parseOptcgsimLog(readFileSync(resolve(str(args, "log")), "utf8"));
      const perspective = typeof args.player === "string" ? (/^[12]$/.test(args.player) ? (Number(args.player) as 1 | 2) : args.player) : 1;
      if (args.list === true || typeof args.turn !== "string") {
        console.log(`OPTCGSim ${game.version ?? "?"}: ${game.players[1].name ?? "player 1"} (${game.players[1].leader}) vs ${game.players[2].name ?? "player 2"} (${game.players[2].leader}), ${game.turns} turns`);
        for (const c of game.checkpoints) console.log(`  --turn ${c.turn} --action ${c.action}  player ${c.player} | next: ${c.next}`);
        for (const w of game.warnings) console.log(`  warning: ${w}`);
        if (args.decks === true) for (const p of [1, 2] as const) console.log(`\nobserved cards, player ${p}:\n${observedDeckText(game, p)}`);
        return;
      }
      const out = resolve(str(args, "out", "out/positions/imported.json"));
      const imported = positionFromLog(game, { turn: num(args, "turn", 1), action: num(args, "action", 0) }, {
        perspective,
        decks: {
          ...(typeof args.deck === "string" && { south: args.deck }),
          ...(typeof args.vs === "string" && { north: args.vs }),
        },
        revealOpponentHand: args["reveal-opponent-hand"] === true,
      });
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(imported.position, null, 2)}\n`);
      for (const w of imported.warnings) console.log(`warning: ${w}`);
      console.log(`wrote ${out} (turn ${imported.checkpoint.turn}, before: ${imported.checkpoint.next})`);
      return;
    }

    default:
      console.log(
        "usage: opbot <selfplay|train-value|arena|bench|meta-decks|analyze|matchup|play|review|tune|calibrate|import> [--options]\n" +
          "  see packages/opbot/README.md for every option",
      );
  }
}

await main();
