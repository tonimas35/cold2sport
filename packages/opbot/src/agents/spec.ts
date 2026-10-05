/**
 * Agent specs, shared by the command line and the web app:
 *
 *   heuristic | heuristic-honest | aggressive | random
 *   policy[:model=...,tempo=0] | policy-honest[:model=...,tempo=0]
 *   search:sims=200,h=1,cands=12,model=packages/opbot/models/value.json,rollout=policy
 *   ismcts:iters=300,h=1,ms=2000,c=0.7,own=24,opp=4,rollout=policy
 *
 * `heuristic` is the unmodified engine bot (our "existing bot" baseline).
 * `policy` is the engine bot with the overrides of agents/policy.ts (oracle,
 * like `heuristic`); `policy-honest` decides on a determinized copy. Their
 * `model` (default: the handcrafted model) scores "choose one" effects, and
 * `tempo=0` turns off the DON!! rules (override 8), giving back the policy as
 * it was before them.
 * `rollout=policy0` makes the search use that policy without the DON!! rules
 * and answer "up to N DON!!" counts by rollouts again: the search exactly as
 * it was before them. `rollout=engine` uses the older rollout policy (engine
 * heuristic plus two fixes).
 *
 * This module has no file-system access, so it also runs in a browser: the
 * caller supplies how a `model=` value (or the default model, `undefined`) is
 * loaded. agents/factory.ts reads model files from disk; the web app passes
 * the bundled default model.
 */
import { createAggressiveAgent, createHeuristicAgent, createHonestHeuristicAgent } from "./heuristic.ts";
import { createRandomAgent } from "./random.ts";
import { createSearchAgent } from "./search.ts";
import { createIsmctsAgent } from "./ismcts.ts";
import { createPolicyAgent } from "./policy.ts";
import { parseRolloutPolicy } from "../search/rollout.ts";
import type { Agent } from "./types.ts";
import type { ValueModel } from "../eval/value.ts";

/** Loads the value model named by a spec's `model=` parameter; `undefined` means the default model. */
export type ModelLoader = (path?: string) => ValueModel;

export function parseAgentSpec(spec: string): { kind: string; rest: string; params: Record<string, string> } {
  const [kind = "", rest = ""] = spec.split(":", 2);
  const params = Object.fromEntries(
    rest
      .split(",")
      .filter(Boolean)
      .map((kv) => kv.split("=", 2) as [string, string]),
  );
  return { kind, rest, params };
}

export function createAgentFromSpec(spec: string, loadModel: ModelLoader): Agent {
  const { kind, rest, params } = parseAgentSpec(spec);
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
      if (params.tempo !== undefined && params.tempo !== "0" && params.tempo !== "1") {
        throw new Error(`bad tempo "${params.tempo}" in "${spec}" (expected 0 or 1)`);
      }
      return createPolicyAgent({
        ...(params.model !== undefined && { model: loadModel(params.model) }),
        ...(params.tempo === "0" && { tempo: false }),
        honest: kind === "policy-honest",
      });
    case "search": {
      const model = loadModel(params.model);
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
      const model = loadModel(params.model);
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
