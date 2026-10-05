/**
 * Decks the player can pick: the post-ban meta pool and the engine's test
 * decks (bundled as the same text files the CLI reads), or a list pasted in
 * the OPTCGSim text format (`1xOP17-079`, `4xOP17-086`).
 *
 * Parsing and the construction rules are @opbot/core's (`parseDeckText`,
 * `checkDeck`), so a list the web accepts is a list `pnpm opbot` accepts, and
 * the deck stored in the game record has the same name and source as the one
 * `pnpm opbot play` would store. Pure module: the caller hands in the file
 * contents (a Vite glob in the worker, the file system in tests).
 */
import {
  checkDeck,
  checkStandardLegality,
  getCard,
  parseDeckFile,
  parseDeckText,
  type DeckList,
} from "@opbot/core/web";
import type { DeckCheckResult, DeckChoice, DeckOption, DeckSummary } from "../game/protocol.ts";

/** Deck files by path (only the file name is used), grouped like the `decks/` folder. */
export interface DeckFiles {
  readonly meta: Readonly<Record<string, string>>;
  readonly test: Readonly<Record<string, string>>;
}

export interface DeckCatalog {
  readonly options: readonly DeckOption[];
  /** The deck list for a choice, or the reasons it cannot be played. */
  resolve(choice: DeckChoice): { readonly deck: DeckList } | { readonly errors: readonly string[] };
  check(choice: DeckChoice): DeckCheckResult;
}

interface Entry {
  readonly option: DeckOption;
  readonly deck: DeckList;
}

const fileName = (path: string) => path.replace(/^.*[\\/]/, "");

export function leaderInfo(leaderId: string): { name: string; colors: string[]; imageUrl: string | null } {
  const card = getCard(leaderId) as {
    name: string;
    color?: readonly string[] | string;
    printings: ReadonlyArray<{ imageUrl?: string }>;
  };
  const colors = Array.isArray(card.color) ? [...card.color] : card.color ? [card.color as string] : [];
  return { name: card.name, colors, imageUrl: card.printings[0]?.imageUrl ?? null };
}

/** `# leader share: 11.3%, win rate: 57.1% (154 games)` in the meta deck files. */
export function metaStats(text: string): { share: number | null; winRate: number | null } {
  const share = /^#\s*leader share:\s*([\d.]+)%/m.exec(text)?.[1];
  const winRate = /win rate:\s*([\d.]+)%/m.exec(text)?.[1];
  // "11.3" -> 0.113 (rounded: 57.1 / 100 is 0.5710000000000001 in floating point).
  const fraction = (percent: string | undefined) => (percent === undefined ? null : Math.round(Number(percent) * 100) / 10000);
  return { share: fraction(share), winRate: fraction(winRate) };
}

export function summarize(deck: DeckList): DeckSummary {
  const leader = leaderInfo(deck.leader);
  return {
    name: deck.name,
    leaderId: deck.leader,
    leaderName: leader.name,
    colors: leader.colors,
    cards: deck.main.length,
  };
}

/**
 * Spanish messages for the parse errors of `parseDeckText` (which throws one
 * English message joining every problem with "; ") and the engine's
 * construction rules. Unknown messages are kept as they are.
 */
export function explainDeckProblem(problem: string): string {
  const line = /^line (\d+): cannot parse "(.*)"$/.exec(problem);
  if (line) return `Línea ${line[1]}: no se entiende «${line[2]}». Usa el formato 4xOP17-086.`;
  const unknown = /^line (\d+): unknown card (.+)$/.exec(problem);
  if (unknown) return `Línea ${unknown[1]}: el motor no tiene la carta ${unknown[2]}.`;
  const second = /^line (\d+): second leader (.+)$/.exec(problem);
  if (second) return `Línea ${second[1]}: segundo Líder (${second[2]}); solo puede haber uno.`;
  if (problem === "no leader found") return "Falta el Líder (una línea como 1xOP17-079).";
  return problem;
}

function parseErrors(error: unknown): string[] {
  const message = error instanceof Error ? error.message : String(error);
  // `deck "name": problem; problem; ...`
  const body = message.replace(/^deck "[^"]*":\s*/, "");
  return body.split("; ").filter(Boolean).map(explainDeckProblem);
}

export function createDeckCatalog(files: DeckFiles): DeckCatalog {
  const entries = new Map<string, Entry>();
  const add = (group: "meta" | "test", path: string, text: string) => {
    const deck = parseDeckFile(fileName(path), text);
    const leader = leaderInfo(deck.leader);
    const stats = group === "meta" ? metaStats(text) : { share: null, winRate: null };
    const id = `${group}:${deck.name}`;
    entries.set(id, {
      deck,
      option: {
        id,
        group,
        name: deck.name,
        leaderId: deck.leader,
        leaderName: leader.name,
        leaderImageUrl: leader.imageUrl,
        colors: leader.colors,
        share: stats.share,
        winRate: stats.winRate,
        source: deck.source ?? null,
      },
    });
  };
  for (const [path, text] of Object.entries(files.meta)) add("meta", path, text);
  for (const [path, text] of Object.entries(files.test)) add("test", path, text);

  // Meta decks by share (most played first), then the test decks by name.
  const options = [...entries.values()]
    .map((e) => e.option)
    .sort((a, b) =>
      a.group !== b.group ? (a.group === "meta" ? -1 : 1) : (b.share ?? 0) - (a.share ?? 0) || a.name.localeCompare(b.name),
    );

  function resolve(choice: DeckChoice): { deck: DeckList } | { errors: string[] } {
    if (choice.kind === "catalog") {
      const entry = entries.get(choice.id);
      return entry ? { deck: entry.deck } : { errors: [`Mazo desconocido: ${choice.id}`] };
    }
    if (!choice.text.trim()) return { errors: ["La lista está vacía."] };
    let deck: DeckList;
    try {
      deck = parseDeckText(choice.name?.trim() || "pegado", choice.text);
    } catch (error) {
      return { errors: parseErrors(error) };
    }
    const check = checkDeck(deck);
    if (!check.valid) return { errors: check.problems };
    return { deck };
  }

  function check(choice: DeckChoice): DeckCheckResult {
    const resolved = resolve(choice);
    if ("errors" in resolved) return { ok: false, deck: null, errors: resolved.errors, warnings: [] };
    const warnings: string[] = [];
    if (choice.kind === "text") {
      const legality = checkStandardLegality(resolved.deck);
      if (!legality.legal) warnings.push(`No es legal en Standard: ${legality.problems.join("; ")}`);
      warnings.push(
        "Lista no auditada: el motor tiene todas sus cartas, pero solo los mazos del meta se han revisado carta a carta; algún efecto puede no funcionar bien.",
      );
    }
    return { ok: true, deck: summarize(resolved.deck), errors: [], warnings };
  }

  return { options, resolve, check };
}
