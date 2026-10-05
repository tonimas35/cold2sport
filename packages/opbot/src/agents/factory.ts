/**
 * Agent specs for the command line:
 *
 *   heuristic | heuristic-honest | aggressive | random
 *   policy[:model=...] | policy-honest[:model=...]
 *   search:sims=200,h=1,cands=12,model=packages/opbot/models/value.json,rollout=policy
 *   ismcts:iters=300,h=1,ms=2000,c=0.7,own=24,opp=4,rollout=policy
 *
 * `heuristic` is the unmodified engine bot (our "existing bot" baseline).
 * `policy` is the engine bot with the overrides of agents/policy.ts (oracle,
 * like `heuristic`); `policy-honest` decides on a determinized copy. Their
 * `model` (default: the handcrafted model) scores "choose one" effects.
 * `rollout=engine` makes the search use the previous rollout policy (engine
 * heuristic plus two fixes) instead of `policy`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAggressiveAgent, createHeuristicAgent, createHonestHeuristicAgent } from "./heuristic.ts";
import { createRandomAgent } from "./random.ts";
import { createSearchAgent } from "./search.ts";
import { createIsmctsAgent } from "./ismcts.ts";
import { createPolicyAgent } from "./policy.ts";
import { parseRolloutPolicy } from "../search/rollout.ts";
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
    case "policy":
    case "policy-honest":
      // Without model=..., the policy's own default (the handcrafted model).
      return createPolicyAgent({
        ...(params.model !== undefined && { model: loadValueModel(params.model) }),
        honest: kind === "policy-honest",
      });
    case "search": {
      const model = loadValueModel(params.model);
      return createSearchAgent({
        id: `search(${rest || "default"})`,
        simulations: Number(params.sims ?? 200),
        horizonTurns: Number(params.h ?? 1),
        maxCandidates: Number(params.cands ?? 12),
        model,
        rolloutPolicy: parseRolloutPolicy(params.rollout),
      });
    }
    case "ismcts": {
      const model = loadValueModel(params.model);
      return createIsmctsAgent({
        id: `ismcts(${rest || "default"})`,
        iterations: Number(params.iters ?? 300),
        horizonTurns: Number(params.h ?? 1),
        model,
        rolloutPolicy: parseRolloutPolicy(params.rollout),
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
