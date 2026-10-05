/**
 * `opbot catalog-check`: the engine's card catalog against the official EN
 * card list (official-catalog.ts), as a Markdown report and a JSON file.
 *
 *   opbot catalog-check [--out out/catalog-check.md] [--json out/catalog-check.json]
 *     [--fixes <file>] [--decks decks/meta-op17-postban] [--cache out/official-cache]
 *     [--series OP-17,569116] [--refresh] [--offline]
 *
 * Series pages are cached forever (the list rarely changes; --refresh refetches
 * everything, e.g. after an errata). The series selector is refetched once a
 * day so a new set (EB-05, OP-18) is picked up on the next run. --offline
 * uses only the cache. --fixes writes the safe mechanical data fixes alone.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { allCards, ENGINE_PACKAGES_DIR, hasCard } from "../engine/internals.ts";
import { cardNumber, DEFAULT_LEGALITY_DATE, isStandardCard } from "./legality.ts";
import {
  applySiteCorrections,
  buildCatalogJson,
  buildCatalogReport,
  compareCatalog,
  countByCategory,
  deriveFixes,
  mergePrintings,
  parseCardListHtml,
  type CardFileLookup,
  type EngineCardData,
  type OfficialPrinting,
  type SeriesOption,
} from "./official-catalog.ts";
import { DEFAULT_OFFICIAL_CACHE_DIR, OfficialCardListClient } from "./official-fetch.ts";

type Args = Record<string, string | boolean>;

const REPO = resolve(import.meta.dir, "../../../..");
const CARD_SOURCES = resolve(import.meta.dir, "../engine", ENGINE_PACKAGES_DIR, "cards/src/cards");
const DAY = 24 * 3600_000;

function str(args: Args, key: string, fallback: string): string {
  const v = args[key];
  return typeof v === "string" ? v : fallback;
}

/** Card number -> deck names, from the deck text files of a directory. */
export function readMetaPool(dir: string): Map<string, string[]> {
  const pool = new Map<string, string[]>();
  if (!existsSync(dir)) return pool;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()) {
    const deck = basename(file, ".txt");
    for (const line of readFileSync(join(dir, file), "utf8").split(/\r?\n/)) {
      // Same formats as decks/deck.ts ("4xOP01-016", "4 OP01-016", "OP01-016 x4"),
      // without its catalog check: a card missing from the engine still counts.
      const id = /([A-Z0-9]+-\d{3})/.exec(line.replace(/^\s*(#|\/\/).*/, ""))?.[1];
      const number = id ? cardNumber(id) : null;
      if (number === null) continue;
      const decks = pool.get(number) ?? [];
      if (!decks.includes(deck)) decks.push(deck);
      pool.set(number, decks);
    }
  }
  return pool;
}

/** Card id -> its definition file and i18n file (repository-relative), by scanning the card sources. */
export function cardFileIndex(root: string = CARD_SOURCES): CardFileLookup {
  const index = new Map<string, { card: string; i18n: string }>();
  for (const kind of ["characters", "events", "leaders", "stages", "don"]) {
    const dir = join(root, kind);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".ts") || file.endsWith(".i18n.ts") || file.endsWith(".test.ts")) continue;
      const path = join(dir, file);
      const id = /\bid: "([^"]+)"/.exec(readFileSync(path, "utf8"))?.[1];
      if (!id || index.has(id)) continue;
      const i18n = path.replace(/\.ts$/, ".i18n.ts");
      index.set(id, { card: relative(REPO, path), i18n: existsSync(i18n) ? relative(REPO, i18n) : "" });
    }
  }
  return (id) => index.get(id) ?? null;
}

function selectSeries(all: SeriesOption[], spec: string | undefined): SeriesOption[] {
  if (!spec) return all;
  const wanted = spec.split(",").map((s) => s.trim().toUpperCase());
  const picked = all.filter((s) => wanted.includes(s.id) || (s.code !== null && wanted.includes(s.code.toUpperCase())));
  if (picked.length === 0) throw new Error(`catalog-check: no series matches --series ${spec}`);
  return picked;
}

export async function runCatalogCheckCommand(args: Args): Promise<void> {
  const refresh = args.refresh === true;
  const offline = args.offline === true;
  const client = new OfficialCardListClient({
    cacheDir: resolve(REPO, str(args, "cache", DEFAULT_OFFICIAL_CACHE_DIR)),
    log: (m) => console.log(m),
  });
  if (offline && refresh) throw new Error("catalog-check: --offline and --refresh exclude each other");
  if (offline && !existsSync(client.cachePath(null))) throw new Error("catalog-check: --offline but the series list is not cached");

  // 1. Official list.
  const available = await client.seriesOptions(offline ? Infinity : refresh ? 0 : DAY);
  const series = selectSeries(available, typeof args.series === "string" ? args.series : undefined);
  const printings: OfficialPrinting[] = [];
  const perSeries: Array<SeriesOption & { printings: number }> = [];
  for (const s of series) {
    const cached = existsSync(client.cachePath(s.id));
    if (offline && !cached) throw new Error(`catalog-check: --offline but series ${s.id} (${s.label}) is not cached`);
    const parsed = parseCardListHtml(await client.page(s.id, refresh ? 0 : Infinity), s.id);
    if (parsed.skipped.length > 0) console.log(`catalog-check: ${s.code ?? s.id}: could not read ${parsed.skipped.join(", ")}`);
    if (parsed.printings.length === 0) throw new Error(`catalog-check: series ${s.id} (${s.label}) has no readable cards`);
    printings.push(...parsed.printings);
    perSeries.push({ ...s, printings: parsed.printings.length });
  }
  const official = mergePrintings(printings);
  const corrections = applySiteCorrections(official);
  console.log(
    `catalog-check: ${series.length} series, ${printings.length} printings, ${official.size} card numbers ` +
      `(${client.counts.network} downloaded, ${client.counts.cached} from cache)`,
  );

  // 2. Comparison. With --series, engine cards outside those series are not judged.
  const partial = series.length < available.length;
  const engineCards = (allCards as readonly EngineCardData[]).filter((c) => c.cardType !== "don" && (!partial || official.has(c.id)));
  const mismatches = compareCatalog(engineCards, official);
  const metaDir = resolve(REPO, str(args, "decks", "decks/meta-op17-postban"));
  const metaDecks = readMetaPool(metaDir);
  const isStandard = (id: string) => isStandardCard(id, DEFAULT_LEGALITY_DATE);
  const missingFromEngine = [...official.keys()].filter((id) => !hasCard(id));
  const fixes = deriveFixes(mismatches, official, engineCards, cardFileIndex());

  // 3. Output.
  const input = {
    date: new Date().toISOString().slice(0, 10),
    series: perSeries,
    printings: printings.length,
    official,
    engineCards: engineCards.length,
    mismatches,
    metaDecks,
    isStandard,
    missingFromEngine,
    fixes,
    corrections,
    command: `pnpm opbot catalog-check ${process.argv.slice(3).join(" ")}`.trim(),
  };
  const out = resolve(REPO, str(args, "out", "out/catalog-check.md"));
  const json = resolve(REPO, str(args, "json", out.replace(/\.md$/, ".json")));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buildCatalogReport(input));
  mkdirSync(dirname(json), { recursive: true });
  writeFileSync(json, `${JSON.stringify(buildCatalogJson(input), null, 2)}\n`);
  if (typeof args.fixes === "string") {
    const file = resolve(REPO, args.fixes);
    mkdirSync(dirname(file), { recursive: true });
    const safe = fixes.filter((f) => f.safe);
    // One fix per line: the file is meant to be diffed and applied by a script.
    const header = {
      generatedAt: input.date,
      source: `${input.command} (official EN card list, ${official.size} card numbers)`,
      fields: "file: card source; field: property path; new: null = delete the property; needsBlock: apply only with that effect block",
    };
    const body = safe.map((f) => `    ${JSON.stringify(f)}`).join(",\n");
    writeFileSync(file, `${JSON.stringify(header, null, 2).replace(/\n}$/, "")},\n  "fixes": [\n${body}\n  ]\n}\n`);
    console.log(`catalog-check: ${safe.length} safe fixes -> ${relative(REPO, file)}`);
  }

  for (const [category, c] of countByCategory(input)) {
    console.log(`  ${category.padEnd(28)} ${String(c.total).padStart(5)}  (meta ${c.meta}, standard ${c.standard})`);
  }
  console.log(`catalog-check: wrote ${relative(REPO, out)} and ${relative(REPO, json)}`);
}
