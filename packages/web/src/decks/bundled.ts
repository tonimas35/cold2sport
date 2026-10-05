/**
 * The deck files of the repository, bundled as text at build time (Vite
 * `import.meta.glob`): the post-ban meta pool and the engine's test decks.
 * Regenerating `decks/` (`pnpm opbot meta-decks`) and rebuilding updates the
 * app. Vite-only module; tests read the same files from disk.
 */
import type { DeckFiles } from "./catalog.ts";

const meta = import.meta.glob("../../../../decks/meta-op17-postban/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const test = import.meta.glob("../../../../decks/engine-test/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const bundledDeckFiles: DeckFiles = { meta, test };
