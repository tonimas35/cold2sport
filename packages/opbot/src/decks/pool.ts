/**
 * Deck pools: "test" (the engine's synthetic decks) or a directory of deck
 * text files (`*.txt`, one deck per file, see decks/deck.ts for the format).
 * The first line of a file may be a comment with the source: `# source: URL`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { checkDeck, engineTestDecks, parseDeckFile, type DeckList } from "./deck.ts";

export function loadDeckFile(path: string): DeckList {
  return parseDeckFile(basename(path), readFileSync(path, "utf8"));
}

export function loadDeckPool(spec: string): DeckList[] {
  if (spec === "test") return engineTestDecks();
  const decks: DeckList[] = [];
  for (const part of spec.split(",")) {
    const path = resolve(part);
    if (statSync(path).isDirectory()) {
      for (const f of readdirSync(path).sort()) {
        if (f.endsWith(".txt")) decks.push(loadDeckFile(join(path, f)));
      }
    } else {
      decks.push(loadDeckFile(path));
    }
  }
  for (const deck of decks) {
    const check = checkDeck(deck);
    if (!check.valid) throw new Error(`deck ${deck.name} is not legal: ${check.problems.join("; ")}`);
  }
  if (decks.length === 0) throw new Error(`no decks found in ${spec}`);
  return decks;
}
