/**
 * `opbot meta-decks`: builds the current-meta deck pool from Limitless.
 *
 *   opbot meta-decks [--since 2026-08-28] [--top 9] [--games 20]
 *     [--out decks/meta-op17-postban] [--min-players 32] [--refresh] [--no-games]
 *
 * Pulls every One Piece tournament since `--since`, keeps the Standard events
 * that already reflect the OP14-020 ban (rules in meta.ts), ranks Leaders by
 * share of entries, writes one representative list per top Leader plus a
 * README with the numbers and the method, then checks the engine can play the
 * pool (catalog, legality, heuristic-vs-heuristic games).
 *
 * All API responses are cached under out/limitless-cache, so a rerun only
 * re-fetches the tournament list (6 h) and events from the last 3 days.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { getCard, hasCard } from "../engine/internals.ts";
import { catalogCoverage, engineSupport, type CatalogCoverage, type SupportRun } from "./coverage.ts";
import type { DeckList } from "./deck.ts";
import { checkStandardLegality } from "./legality.ts";
import { loadDeckPool } from "./pool.ts";
import { DEFAULT_CACHE_DIR, LimitlessClient, tournamentsSince, type Standing, type TournamentDetails } from "./limitless.ts";
import {
  BANNED_LEADER,
  BAN_ANNOUNCED,
  BAN_EFFECTIVE,
  LARGE_EVENT_PLAYERS,
  classifyEvent,
  consensusTable,
  isStandardEvent,
  listsOf,
  needsStandingsToClassify,
  percent,
  placementToDeckList,
  placementToDeckText,
  representativeList,
  slugify,
  summarizeMeta,
  tournamentUrl,
  type EventData,
  type LeaderStats,
  type MetaSummary,
  type Placement,
} from "./meta.ts";

type Args = Record<string, string | boolean>;

const REPO = resolve(import.meta.dir, "../../../..");
const HOUR = 3600_000;
/** Events this recent may still be running; their data is refetched after 6 h. */
const LIVE_WINDOW_MS = 3 * 24 * HOUR;

function str(args: Args, key: string, fallback: string): string {
  const v = args[key];
  return typeof v === "string" ? v : fallback;
}

function num(args: Args, key: string, fallback: number): number {
  const v = args[key];
  return typeof v === "string" ? Number(v) : fallback;
}

interface PoolDeck {
  readonly stats: LeaderStats;
  readonly placement: Placement;
  readonly deck: DeckList;
  readonly file: string;
  readonly coverage: CatalogCoverage;
}

const isPlayable = (p: PoolDeck) => p.coverage.missing.length === 0 && p.coverage.legal;

/**
 * The pool is for post-ban Standard, so a representative list must be legal
 * on the ban's effective date (block icons, exception lists, ban list). The
 * events are already Standard, but organizers do not check every list.
 */
const isStandardLegal = (p: Placement) => checkStandardLegality(placementToDeckList(p, "candidate"), BAN_EFFECTIVE).legal;

/** Why the engine cannot play a pool deck, or null. */
function unsupportedReason(p: PoolDeck): string | null {
  if (p.coverage.missing.length > 0) return `cards missing from the engine: ${p.coverage.missing.join(", ")}`;
  if (!p.coverage.legal) return `fails checkDeck: ${p.coverage.problems.join("; ")}`;
  return null;
}

export async function runMetaDecksCommand(args: Args): Promise<void> {
  const since = new Date(`${str(args, "since", "2026-08-28")}T00:00:00Z`);
  const top = num(args, "top", 9);
  const gamesPerPairing = num(args, "games", 20);
  const minPlayers = num(args, "min-players", 32);
  const outDir = resolve(REPO, str(args, "out", "decks/meta-op17-postban"));
  const client = new LimitlessClient({ cacheDir: resolve(REPO, str(args, "cache", DEFAULT_CACHE_DIR)), log: console.log });
  const now = Date.now();
  const maxAge = (date: string) => (args.refresh === true ? 0 : now - Date.parse(date) < LIVE_WINDOW_MS ? 6 * HOUR : Infinity);

  // 1. Tournament list and Standard filter.
  const listed = await tournamentsSince(client, "OP", since, { maxAgeMs: args.refresh === true ? 0 : 6 * HOUR });
  const standard = listed.filter(isStandardEvent);
  console.log(`meta-decks: ${listed.length} OP tournaments since ${since.toISOString().slice(0, 10)}, ${standard.length} Standard`);

  // 2. Ban classification; standings are fetched only where the rule needs them.
  const classified: Array<{ details: TournamentDetails; standings: Standing[] | null; postBan: boolean; reason: string }> = [];
  for (const t of standard) {
    const details = await client.details(t.id, maxAge(t.date));
    const standings = needsStandingsToClassify(details) ? await client.standings(t.id, maxAge(t.date)) : null;
    classified.push({ details, standings, ...classifyEvent(details, standings) });
  }

  // 3. Full data for the post-ban events.
  const events: EventData[] = [];
  for (const c of classified.filter((x) => x.postBan)) {
    const id = c.details.id;
    events.push({
      details: c.details,
      standings: c.standings ?? (await client.standings(id, maxAge(c.details.date))),
      pairings: await client.pairings(id, maxAge(c.details.date)),
    });
  }
  console.log(`meta-decks: ${events.length} post-ban events (${client.counts.network} requests, ${client.counts.cached} cached)`);
  if (events.length === 0) throw new Error("meta-decks: no post-ban events found");
  const meta = summarizeMeta(events);

  // 4. Leader choice: most played first. A Leader the engine lacks, or one
  // without a qualifying list, gives its slot to the next one. A list with
  // cards the engine lacks keeps its slot (it is part of the meta) but is
  // written aside, never patched: a substitute card would make it a different
  // deck, and the pool folder must stay loadable.
  const pool: PoolDeck[] = [];
  const skipped: Array<{ stats: LeaderStats; reason: string }> = [];
  for (const stats of meta.leaders) {
    if (pool.length >= top) break;
    if (!hasCard(stats.leader)) {
      skipped.push({ stats, reason: "Leader not in the engine catalog" });
      continue;
    }
    const placement = representativeList(events, stats.leader, minPlayers, isStandardLegal);
    if (!placement) {
      skipped.push({ stats, reason: `no complete Standard-legal decklist in a post-ban event with >= ${minPlayers} players` });
      continue;
    }
    const name = `${stats.leader}-${slugify(getCard(stats.leader).name)}`;
    const deck = placementToDeckList(placement, name);
    const coverage = catalogCoverage(deck);
    const supported = coverage.missing.length === 0 && coverage.legal;
    const file = supported ? join(outDir, `${name}.txt`) : join(outDir, "unsupported", `${name}.txt`);
    pool.push({ stats, placement, deck, file, coverage });
  }
  const playable = pool.filter(isPlayable);

  // 5. Files. Old lists are removed first: the folder is a deck pool and a
  // stale list from an earlier run would silently join it.
  mkdirSync(outDir, { recursive: true });
  for (const dir of [outDir, join(outDir, "unsupported")]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) if (f.endsWith(".txt")) rmSync(join(dir, f));
  }
  for (const p of pool) {
    mkdirSync(dirname(p.file), { recursive: true });
    writeFileSync(p.file, placementToDeckText(p.placement, p.stats));
  }

  // The pool must load the way the arena will load it.
  const loaded = playable.length > 0 ? loadDeckPool(outDir) : [];
  if (loaded.length !== playable.length) throw new Error(`meta-decks: ${outDir} loads ${loaded.length} decks, expected ${playable.length}`);

  // 6. Engine support.
  let support: SupportRun | null = null;
  if (args["no-games"] !== true && playable.length >= 2) {
    const started = performance.now();
    support = engineSupport(
      playable.map((p) => p.deck),
      gamesPerPairing,
      "meta-decks",
      (done, total) => {
        if (done % 50 === 0 || done === total) console.log(`meta-decks: engine games ${done}/${total}`);
      },
    );
    console.log(`meta-decks: ${support.games} games in ${((performance.now() - started) / 1000).toFixed(0)} s`);
  }

  const readme = renderReadme({ since, listed: listed.length, classified, events, meta, pool, playable, skipped, support, top, minPlayers, gamesPerPairing, outDir });
  writeFileSync(join(outDir, "README.md"), readme);
  console.log(`meta-decks: wrote ${pool.length} decks (${playable.length} playable) and README.md to ${relative(REPO, outDir)}`);
  for (const p of pool) console.log(`  ${p.stats.leader} ${percent(p.stats.share)} ${relative(REPO, p.file)}${isPlayable(p) ? "" : ` (${unsupportedReason(p)})`}`);
  for (const s of skipped) console.log(`  skipped ${s.stats.leader} (${s.stats.name}): ${s.reason}`);
}

// ---------------------------------------------------------------------------
// README.

interface ReadmeInput {
  since: Date;
  listed: number;
  classified: Array<{ details: TournamentDetails; postBan: boolean; reason: string }>;
  events: EventData[];
  meta: MetaSummary;
  pool: PoolDeck[];
  playable: PoolDeck[];
  skipped: Array<{ stats: LeaderStats; reason: string }>;
  support: SupportRun | null;
  top: number;
  minPlayers: number;
  gamesPerPairing: number;
  outDir: string;
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const engineName = (id: string) => (hasCard(id) ? getCard(id).name : "");

function renderReadme(r: ReadmeInput): string {
  const dates = r.events.map((e) => e.details.date.slice(0, 10)).sort();
  const reasons = new Map<string, number>();
  for (const c of r.classified) reasons.set(`${c.postBan ? "used" : "excluded"}: ${c.reason}`, (reasons.get(`${c.postBan ? "used" : "excluded"}: ${c.reason}`) ?? 0) + 1);
  const inPool = new Map(r.pool.map((p) => [p.stats.leader, p]));
  const skippedBy = new Map(r.skipped.map((s) => [s.stats.leader, s]));
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push(
    "# Post-ban OP-17 meta deck pool",
    "",
    `Generated ${new Date().toISOString().slice(0, 10)} by \`bun packages/opbot/src/cli.ts meta-decks\` from the Limitless Tournament Platform API (https://play.limitlesstcg.com/api). Rerunning it rewrites this folder; the raw API responses are cached in \`out/limitless-cache/\`.`,
    "",
    `- One deck per file, in the text format of \`packages/opbot/src/decks/deck.ts\`; load the folder with \`loadDeckPool("decks/meta-op17-postban")\` or \`--decks decks/meta-op17-postban\`.`,
    `- Decks the engine cannot play are kept in \`unsupported/\` (not part of the pool).`,
    "",
    "## Data",
    "",
    `- Window: One Piece tournaments on Limitless dated ${r.since.toISOString().slice(0, 10)} (OP-17 EN release) or later: ${r.listed} listed, ${r.classified.length} Standard.`,
    `- Post-ban events used: **${r.events.length}**, dated ${dates[0]} to ${dates.at(-1)}.`,
    `- Entries: **${r.meta.entries}** with a known Leader (${r.meta.unknownLeader} more without decklist or deck id, left out of the shares); ${r.meta.matches} non-mirror matches with a result.`,
    `- Sample size: with ${r.meta.entries} entries a 10% share is known to about ±${(196 * Math.sqrt(0.09 / Math.max(1, r.meta.entries))).toFixed(1)} points (95%), and the entries of one event are not independent; win rates over fewer than ~100 games are noise. Rerun after ${BAN_EFFECTIVE} for a sturdier pool.`,
    "",
    "| Events | Classification |",
    "|---:|---|",
    ...[...reasons].sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => `| ${n} | ${cell(k)} |`),
    "",
    "Events used:",
    "",
    "| Date | Event | Players | Decklists | Why it counts |",
    "|---|---|---:|---|---|",
    ...r.classified
      .filter((c) => c.postBan)
      .map((c) => `| ${c.details.date.slice(0, 10)} | [${cell(c.details.name)}](${tournamentUrl(c.details.id)}) | ${c.details.players} | ${c.details.decklists ? "yes" : "no"} | ${cell(c.reason)} |`),
    "",
    "## Leader frequency (post-ban events)",
    "",
    "| # | Leader | Name | Entries | Share | Win rate | Games | Pool |",
    "|---:|---|---|---:|---:|---:|---:|---|",
    ...r.meta.leaders.map((l, i) => {
      const p = inPool.get(l.leader);
      const status = p ? (isPlayable(p) ? "yes" : `yes, unsupported: ${unsupportedReason(p)}`) : skippedBy.has(l.leader) ? `skipped: ${skippedBy.get(l.leader)!.reason}` : "";
      return `| ${i + 1} | ${l.leader} | ${cell(engineName(l.leader) || l.name)} | ${l.entries} | ${percent(l.share)} | ${l.winRate === null ? "n/a" : percent(l.winRate)} | ${l.games} | ${cell(status)} |`;
    }),
    "",
    "## Pool",
    "",
    `The ${r.pool.length} most played Leaders that have a representative list; ${r.playable.length} of them are playable by the engine and form the pool, the others are in \`unsupported/\`.`,
    "",
    "| File | Leader | Share | Win rate (games) | Representative list | Engine |",
    "|---|---|---:|---|---|---|",
    ...r.pool.map((p) => {
      const d = p.placement.event.details;
      const s = p.placement.standing;
      return `| \`${relative(r.outDir, p.file)}\` | ${p.stats.leader} ${cell(engineName(p.stats.leader))} | ${percent(p.stats.share)} | ${p.stats.winRate === null ? "n/a" : percent(p.stats.winRate)} (${p.stats.games}) | ${cell(s.name)} (${s.player}), ${s.placing}/${d.players} at [${cell(d.name)}](${tournamentUrl(d.id)}) ${d.date.slice(0, 10)} | ${cell(unsupportedReason(p) ?? "playable")} |`;
    }),
    "",
  );
  if (r.skipped.length > 0) {
    push("Skipped Leaders (the next most played Leader takes the slot):", "");
    for (const s of r.skipped) push(`- ${s.stats.leader} ${cell(engineName(s.stats.leader) || s.stats.name)} (${percent(s.stats.share)}): ${s.reason}.`);
    push("");
  }

  push("## Consensus lists", "", "For each pool Leader, every complete post-ban list (all event sizes): the share of lists that play each card, the average and most common copy count among those lists, and the copies in the representative list.", "");
  for (const p of r.pool) {
    const lists = listsOf(r.events, p.stats.leader).map((x) => x.list);
    const rep = new Map<string, number>();
    for (const id of p.deck.main) rep.set(id, (rep.get(id) ?? 0) + 1);
    push(
      `### ${p.stats.leader} ${cell(engineName(p.stats.leader) || p.stats.name)} (${lists.length} lists)`,
      "",
      "| Card | Name | Lists | Avg copies | Most common | Representative |",
      "|---|---|---:|---:|---:|---:|",
      ...consensusTable(lists).map(
        (c) => `| ${c.card} | ${cell(c.name || engineName(c.card))} | ${percent(c.inclusion, 0)} | ${c.avgCopies.toFixed(1)} | ${c.modeCopies} | ${rep.get(c.card) ?? 0} |`,
      ),
      "",
    );
  }

  push("## Engine support", "");
  if (r.support) {
    const t = r.support.terminations;
    push(
      `${r.support.games} heuristic-vs-heuristic games on the fast simulator, ${r.gamesPerPairing} per pair of pool decks (seats and first player alternate). Overall: ${t.rules} finished by the rules, ${t["max-commands"]} hit the 1500-command cap, ${t["no-action"]} stalled, ${t.illegal} stopped on an illegal command with no legal fallback, ${t.error} crashed; ${r.support.rejected} commands rejected by the engine (each replaced by a legal fallback, the game went on); ${r.support.capabilityIssues} capability records in total (\`state.capabilityHistory\`: effects the engine could not execute).`,
      "",
      "Per deck: games it played and how they ended; rejected commands, illegal-command stops and capability records are those caused by the deck's own seat, with the cards behind them. \"Bot win %\" is heuristic vs heuristic and only flags decks the engine cannot really play.",
      "",
      "| Deck | Missing cards | checkDeck | Games | Rules end | Cmd cap / stall | Rejected cmds / illegal stops | Crashes | Capability records | Games with records | Bot win % | Cards behind stops and records |",
      "|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|---|",
    );
  } else {
    push("Games not run (`--no-games` or fewer than two playable decks).", "", "| Deck | Missing cards | checkDeck |", "|---|---|---|");
  }
  const named = (key: string) => {
    const [id = "-", ...rest] = key.split(" ");
    return `${id}${engineName(id) ? ` ${engineName(id)}` : ""} (${rest.join(" ")})`;
  };
  for (const p of r.pool) {
    const s = r.support?.decks.find((d) => d.deck === p.deck.name);
    const head = `| ${p.deck.name} | ${p.coverage.missing.join(", ") || "none"} | ${p.coverage.legal ? "pass" : cell(p.coverage.problems.join("; "))} |`;
    if (!r.support) push(head);
    else if (!s) push(`${head} not played | | | | | | | | |`);
    else {
      const causes = [
        ...[...s.rejectedByCard].sort((a, b) => b[1] - a[1]).map(([k, n]) => `rejected answer to ${named(k)} ×${n}`),
        ...[...s.illegalByCard].sort((a, b) => b[1] - a[1]).map(([k, n]) => `no legal fallback after ${named(k)} ×${n}`),
        ...[...s.issuesByCard].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${named(k)} ×${n}`),
      ].join("; ");
      push(
        `${head} ${s.games} | ${s.terminations.rules} | ${s.terminations["max-commands"]} / ${s.terminations["no-action"]} | ${s.rejected} / ${s.illegalStops} | ${s.terminations.error} | ${s.capabilityIssues} | ${s.gamesWithIssues} | ${percent(s.wins / Math.max(1, s.games), 0)} | ${cell(causes) || "none"} |`,
      );
    }
  }
  const crashes = r.support?.decks.flatMap((d) => d.errors.map((e) => `${d.deck}: ${e}`)) ?? [];
  if (crashes.length > 0) push("", "Crash messages:", "", ...crashes.map((c) => `- \`${cell(c).slice(0, 300)}\``));

  push(
    "",
    "## Methodology",
    "",
    `1. **Events.** \`GET /tournaments?game=OP\`, every page back to ${r.since.toISOString().slice(0, 10)} (OP-17 EN release). Standard only: format null or \`STANDARD\`; format \`EXTRA\` and names containing \`[EGB]\` are dropped.`,
    `2. **Post-ban filter** (the ${BANNED_LEADER} Dracule Mihawk Leader ban was announced ${BAN_ANNOUNCED}, effective ${BAN_EFFECTIVE}). An event is used only if (a) \`details.bannedCards\` contains ${BANNED_LEADER}, or (b) it is dated ${BAN_ANNOUNCED} or later, has >= ${LARGE_EVENT_PLAYERS} players and not a single ${BANNED_LEADER} entry in its standings, or (c) it is dated ${BAN_EFFECTIVE} or later. Dates are the scheduled start in UTC. Every other event is ignored for everything below.`,
    "3. **Leader of an entry**: the decklist Leader (`set-number`), else the standings' auto-assigned `deck.id` (the Leader id). Entries with neither are counted separately and left out.",
    "4. **Share** = entries with the Leader / entries with a known Leader, over all used events (each entry counts once, whatever the event size).",
    "5. **Win rate** from `/pairings`: matches between two entries with known, different Leaders (byes and mirrors skipped); wins + ties/2 over matches; a double loss (-1) is a loss for both. A best-of-three top-cut match counts as one game. \"games\" in the deck headers means these matches.",
    `6. **Pool**: the ${r.top} most played Leaders (ties: higher win rate). A Leader is skipped, and the next one takes its place, if it is not in the engine catalog (\`hasCard\`) or has no complete, Standard-legal 50-card list in a used event with >= ${r.minPlayers} players. A chosen Leader whose representative list uses cards missing from the engine, or fails \`checkDeck\`, keeps its slot but its list goes to \`unsupported/\` exactly as published (no substitute cards), so the pool folder only holds decks the engine can load.`,
    `7. **Representative list**: the decklist of the best-placed player with that Leader among used events with >= ${r.minPlayers} players, counting only lists legal in Standard on ${BAN_EFFECTIVE} (\`checkStandardLegality\` in \`legality.ts\`: block icons 2-5 plus the official exception lists, ban list and banned pairs); ties go to the larger event, then the later one, then the player id. Its header records the tournament URL, player, placing/players and date, and the Leader's share and win rate.`,
    "8. **Consensus table**: all complete lists of the Leader in used events of any size.",
    `9. **Engine support**: every card id must exist in the engine catalog and the deck must pass \`checkDeck\` (engine construction rules; Standard legality is already required in step 7). Then ${r.gamesPerPairing} games per pair of pool decks with the engine's heuristic bot on both seats (\`playGame\`, engine \`fast\`, 1500-command cap). Capability records are charged to the deck of the seat that produced them (or to the deck holding the source card for system records). A command the engine rejects does not end the game: the driver (\`arena/game.ts\`) counts it and plays the first legal action instead; the game stops as "illegal" only when no legal action is accepted. Each rejection is charged to the deck that sent it, keyed by the card whose prompt it answered (every decision is also tried on a copy of the state to find it); the bot picks among the options the engine offers, so a rejection points at the handling of that card by the engine or our action layer.`,
    "",
  );
  return out.join("\n");
}
