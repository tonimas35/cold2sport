import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const upstreamOnePiece = resolve(
  repoRoot,
  "vendor/tcg-engines/submodules/agnostic-simulator/apps/multi-game-simulator/src/games/one-piece",
);

export default defineConfig({
  // Relative asset URLs: the built folder works from any sub-path of any
  // static host (no rewrites, no base path to configure).
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@upstream\/one-piece\/(.*)$/, replacement: `${upstreamOnePiece}/$1` },
      // The upstream board's CSS paints a map image that is not vendored (see
      // vendor/tcg-engines/UPSTREAM.md): use our own neutral background.
      {
        find: /^\.\.\/assets\/one-piece-map-background\.jpeg$/,
        replacement: resolve(here, "src/assets/board-background.svg"),
      },
    ],
    // One React for our code and the vendored UI (both resolve to the copy
    // hoisted to the repository root; this is a safety net).
    dedupe: ["react", "react-dom"],
  },
  worker: { format: "es" },
  server: {
    host: "127.0.0.1",
    port: 5173,
    // The vendored UI and engine live outside packages/web.
    fs: { allow: [repoRoot] },
  },
  preview: { host: "127.0.0.1", port: 4173 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    // The worker carries the whole card catalog (~5 MB of source): one big chunk is expected.
    chunkSizeWarningLimit: 8000,
  },
});
