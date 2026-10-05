/**
 * Agents for the command line: `createAgent(spec)` with value models read from
 * disk. The spec syntax and the agent construction live in agents/spec.ts,
 * which has no file-system access so that the web app can reuse it
 * (packages/opbot/src/web.ts).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAgentFromSpec } from "./spec.ts";
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
  return createAgentFromSpec(spec, loadValueModel);
}
