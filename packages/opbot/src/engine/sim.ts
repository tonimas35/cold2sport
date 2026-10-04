/**
 * Fast in-place simulation on top of the vendored engine.
 *
 * The public `applyCommand` runs every command through immer's
 * `produceWithPatches`, validates the whole state and builds animations. That
 * is right for a game server and far too slow for tree search: almost all of
 * its time goes to proxy traps on the draft. Here we run the very same rules
 * code (`applyQueuedCommandMutation` + `drainResolutionQueue`, exactly as
 * `core.ts` does) directly on a plain, private, deep-cloned state.
 *
 * Differences with `applyCommand`, all deliberate:
 * - no patches, no `validateState`, no animations;
 * - `commandHistory`, `eventHistory` and `logHistory` are emptied after every
 *   command (no rules code reads them; they only grow). `capabilityHistory`
 *   (unsupported-effect records) is kept: legal-move generation reads it;
 * - after every command the state is "de-aliased": the engine sometimes stores
 *   a live array in two places (for example a prompt's `candidateIds` pointing
 *   at `player.hand`). Under immer that alias is broken by copy-on-write at the
 *   next command; on a plain object it would stay live and diverge. The
 *   de-alias pass copies any object reached twice, reproducing immer's
 *   semantics between commands.
 * - if the engine throws, the state is left partially mutated: callers must
 *   discard it.
 *
 * `test/sim-differential.test.ts` replays full games through both paths and
 * requires identical states after every command.
 */
import type { EngineCommand, MatchState } from "@tcg/op-engine";
import {
  allCards,
  applyQueuedCommandMutation,
  drainResolutionQueue,
  emitEvent,
  emitLog,
  privateChoicesForJoKenPo,
  rememberPrivateJoKenPoChoices,
} from "./internals.ts";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const n = value.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = deepClone(value[i]);
    return out as T;
  }
  const out: Record<string, unknown> = {};
  for (const key in value) out[key] = deepClone((value as Record<string, unknown>)[key]);
  return out as T;
}

/**
 * Independent, mutable copy of `state` for simulation. History arrays are
 * dropped. `config` is copied one level deep: the engine only reassigns its
 * top-level fields (e.g. `firstPlayer` during setup) and never mutates the
 * deck lists inside it.
 */
export function cloneState(state: MatchState): MatchState {
  const source = state as unknown as Record<string, unknown>;
  const copy: Record<string, unknown> = {};
  // Same key order as the source, so fingerprints compare equal.
  for (const key in source) {
    if (HISTORY_KEYS.has(key)) copy[key] = [];
    else if (key === "config") copy[key] = { ...(source[key] as object) };
    else copy[key] = deepClone(source[key]);
  }
  return copy as unknown as MatchState;
}

// `capabilityHistory` is NOT in this list: engine/legal.ts reads it (unsupported
// activation costs hide an activateEffect descriptor), so it is kept intact.
const HISTORY_KEYS = new Set(["eventHistory", "logHistory", "commandHistory"]);

function dealias(state: MatchState): void {
  const seen = new Set<object>();
  const visit = (value: object): object => {
    if (seen.has(value) || Object.isFrozen(value)) return deepClone(value);
    seen.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const child: unknown = value[i];
        if (child !== null && typeof child === "object") {
          const next = visit(child);
          if (next !== child) value[i] = next;
        }
      }
    } else {
      const record = value as Record<string, unknown>;
      for (const key in record) {
        const child = record[key];
        if (child !== null && typeof child === "object") {
          const next = visit(child);
          if (next !== child) record[key] = next;
        }
      }
    }
    return value;
  };
  const record = state as unknown as Record<string, unknown>;
  for (const key in record) {
    if (key === "config") continue;
    const child = record[key];
    if (child !== null && typeof child === "object") {
      const next = visit(child);
      if (next !== child) record[key] = next;
    }
  }
}

/**
 * Applies `command` to `state` in place. Returns whether the engine accepted
 * it. Mirrors `applyCommand` in vendor .../engine/src/core.ts, including the
 * events it emits, so that generated ids (prompt ids, ...) stay identical.
 */
export function applyInPlace(state: MatchState, input: EngineCommand): boolean {
  // The engine stores arrays from the command in the state (for example
  // `battle.counterCardIds = command.selectedIds`). Callers reuse command
  // objects across many simulated states, so give each state its own copy.
  const command = deepClone(input);
  const privateContext = privateChoicesForJoKenPo(state);
  const result = applyQueuedCommandMutation(state, command, privateContext);
  const visibility = command.seat === "judge" ? "judge" : "public";
  if (result.accepted) {
    drainResolutionQueue(state);
    rememberPrivateJoKenPoChoices(state, privateContext);
    emitEvent(state, "commandAccepted", command.seat, {
      visibility,
      data: { commandType: command.type },
    });
  } else {
    const reason = result.reason ?? "Command rejected.";
    emitEvent(state, "commandRejected", command.seat, {
      visibility,
      data: { commandType: command.type, reason },
    });
    emitLog(state, command.seat, reason, { visibility, judgeMessage: reason });
  }
  state.eventHistory.length = 0;
  state.logHistory.length = 0;
  dealias(state);
  return result.accepted;
}

let catalogFrozen = false;

/**
 * Deep-freezes every card definition, so that an engine code path that would
 * mutate catalog data through a plain (non-draft) state throws instead of
 * silently corrupting the catalog for every later game. Idempotent.
 */
export function freezeCardCatalog(): void {
  if (catalogFrozen) return;
  const freeze = (value: unknown): void => {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) return;
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  };
  for (const card of allCards) freeze(card);
  catalogFrozen = true;
}

/** JSON of `state` without the history arrays, for equality checks. */
export function stateFingerprint(state: MatchState): string {
  return JSON.stringify(state, (key, value: Json) => (HISTORY_KEYS.has(key) ? undefined : value));
}
