/**
 * src/web.ts is the entry the web app bundles into a Web Worker. Walk its
 * import graph (our own sources; the vendored engine is checked by the web
 * build itself) and fail on anything that only exists in Node or Bun.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, relative, resolve } from "node:path";

const SRC = resolve(import.meta.dir, "../src");
const NODE_ONLY = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));
const transpiler = new Bun.Transpiler({ loader: "ts" });

function walk(file: string, seen: Map<string, string[]>): void {
  if (seen.has(file)) return;
  const source = readFileSync(file, "utf8");
  const problems: string[] = [];
  seen.set(file, problems);
  // Check the compiled code, not the comments that talk about these APIs.
  const code = transpiler.transformSync(source);
  if (/import\.meta\.dir\b/.test(code)) problems.push("uses import.meta.dir");
  if (/\bBun\./.test(code)) problems.push("uses the Bun global");
  if (/\bprocess\.(argv|env|exit|stdout|stderr|cwd)\b/.test(code)) problems.push("uses process");
  for (const { path } of transpiler.scanImports(source)) {
    if (NODE_ONLY.has(path) || path.startsWith("node:") || path.startsWith("bun:")) {
      problems.push(`imports ${path}`);
    } else if (path.startsWith(".")) {
      const target = resolve(dirname(file), path);
      if (target.startsWith(SRC)) walk(target, seen);
    }
  }
}

describe("web entry", () => {
  test("src/web.ts and everything it imports from src/ are browser-safe", () => {
    const seen = new Map<string, string[]>();
    walk(resolve(SRC, "web.ts"), seen);
    const problems = [...seen].flatMap(([file, list]) => list.map((p) => `${relative(SRC, file)}: ${p}`));
    expect(problems).toEqual([]);
    // Sanity: the walk reached the agents, the search and the review.
    const files = [...seen.keys()].map((f) => relative(SRC, f));
    expect(files).toContain("agents/search.ts");
    expect(files).toContain("analysis/review.ts");
    expect(files).not.toContain("agents/factory.ts");
  });

  test("the browser agent factory builds the same agents as the CLI factory", async () => {
    const { createAgentFromSpec, HANDCRAFTED_MODEL } = await import("../src/web.ts");
    const { createAgent } = await import("../src/agents/factory.ts");
    for (const spec of ["policy-honest", "search:sims=16,h=1,cands=8", "search:sims=32,h=1,cands=12", "heuristic-honest"]) {
      const web = createAgentFromSpec(spec, () => HANDCRAFTED_MODEL);
      const cli = createAgent(spec);
      expect(web.id).toBe(cli.id);
      expect(web.honest).toBe(cli.honest);
    }
  });
});
