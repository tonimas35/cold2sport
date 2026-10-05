/**
 * Downloads the card art of some decks into out/card-image-cache/ (gitignored)
 * so the end-to-end screenshots show real cards. Optional: without it the
 * tests use placeholders. Usage: bun e2e/fetch-card-images.ts [deck-file...]
 * (default: the Luffy and Rocks meta decks).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { getCard, parseDeckFile } from "@opbot/core/web";
import { CACHE_DIR, cacheFileFor } from "./card-images.ts";

const repo = resolve(import.meta.dir, "../../..");
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["decks/meta-op17-postban/OP17-079-monkey-d-luffy.txt", "decks/meta-op17-postban/OP17-039-rocks-d-xebec.txt"];

mkdirSync(CACHE_DIR, { recursive: true });
const ids = new Set<string>();
for (const file of files) {
  const path = resolve(repo, file);
  const deck = parseDeckFile(basename(path), readFileSync(path, "utf8"));
  for (const id of [deck.leader, ...deck.main]) ids.add(id);
}
let downloaded = 0;
for (const id of ids) {
  const url = (getCard(id) as { printings: ReadonlyArray<{ imageUrl?: string }> }).printings[0]?.imageUrl;
  if (!url) continue;
  const target = cacheFileFor(url);
  if (existsSync(target)) continue;
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`${id}: HTTP ${response.status}`);
    continue;
  }
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  downloaded++;
}
console.log(`${ids.size} cards, ${downloaded} images downloaded to ${CACHE_DIR}`);
