/**
 * Agent specs for the command line:
 *
 *   heuristic | heuristic-honest | aggressive | random
 *   search:sims=200,h=1,cands=12,model=packages/opbot/models/value.json
 *   ismcts:iters=300,h=1,ms=2000,c=0.7,own=24,opp=4
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAggressiveAgent, createHeuristicAgent, createHonestHeuristicAgent } from "./heuristic.ts";
import { createRandomAgent } from "./random.ts";
import { createSearchAgent } from "./search.ts";
import { createIsmctsAgent } from "./ismcts.ts";
import type { Agent } from "./types.ts";
import { checkModel, HANDCRAFTED_MODEL, type ValueModel } from "../eval/value.ts";

export const DEFAULT_MODEL_PATH = resolve(import.meta.dir, "../../models/value.json");

export function loadValueModel(path?: string): ValueModel {
  const p = path ?? DEFAULT_MODEL_PATH;
  if (path === "handcrafted") return HANDCRAFTED_MODEL;
  try {
    const model = JSON.parse(readFileSync(resolve(p), "utf8")) as ValueModel;
    checkModel(model);
    return model;
  } catch (e) {
    if (path) throw e;
    return HANDCRAFTED_MODEL;
  }
}

export function createAgent(spec: string): Agent {
  const [kind = "", rest = ""] = spec.split(":", 2);
  const params = Object.fromEntries(
    rest
      .split(",")
      .filter(Boolean)
      .map((kv) => kv.split("=", 2) as [string, string]),
  );
  switch (kind) {
    case "heuristic":
      return createHeuristicAgent();
    case "heuristic-honest":
      return createHonestHeuristicAgent();
    case "aggressive":
      return createAggressiveAgent();
    case "random":
      return createRandomAgent();
    case "search": {
      const model = loadValueModel(params.model);
      return createSearchAgent({
        id: `search(${rest || "default"})`,
        simulations: Number(params.sims ?? 200),
        horizonTurns: Number(params.h ?? 1),
        maxCandidates: Number(params.cands ?? 12),
        model,
      });
    }
    case "ismcts": {
      const model = loadValueModel(params.model);
      return createIsmctsAgent({
        id: `ismcts(${rest || "default"})`,
        iterations: Number(params.iters ?? 300),
        horizonTurns: Number(params.h ?? 1),
        model,
        ...(params.ms !== undefined && { timeMs: Number(params.ms) }),
        ...(params.c !== undefined && { exploration: Number(params.c) }),
        ...(params.own !== undefined && { maxOwnActions: Number(params.own) }),
        ...(params.opp !== undefined && { maxOpponentActions: Number(params.opp) }),
      });
    }
    default:
      throw new Error(`unknown agent spec "${spec}"`);
  }
}
