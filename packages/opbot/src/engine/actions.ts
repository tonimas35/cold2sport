/**
 * Turns the engine's legal-move *descriptors* and pending prompts into a list of
 * concrete, distinct actions for one seat.
 *
 * `getLegalCommands` lists main-phase actions exactly, but it does not expand
 * them (attack targets, DON amounts) and it exposes a prompt only as its raw
 * options: which subset, order or option to pick has to be built from the
 * `PromptState`. See docs/NOTAS_MOTOR.md.
 *
 * Every action carries a `key` that identifies it *semantically*, using public
 * instance ids for cards in play and catalog card ids for cards in hidden zones.
 * Keys are what the search tree branches on, so the same key must mean the
 * same decision in every determinization of an information set.
 */
import {
  getLegalCommands,
  type EngineCommand,
  type LegalCommandDescriptor,
  type MatchSeat,
  type MatchState,
  type PromptState,
} from "@tcg/op-engine";
import {
  counterSelectionIsPayable,
  getCard,
  getCardForInstance,
  selectionSatisfiesTotalConstraint,
} from "./internals.ts";

export interface Action {
  readonly key: string;
  readonly command: EngineCommand;
}

export interface ActionOptions {
  /** Upper bound on subsets offered for one selection prompt. */
  readonly maxSubsets?: number;
  /** Upper bound on orderings offered for one ordering prompt. */
  readonly maxOrderings?: number;
}

const DEFAULTS: Required<ActionOptions> = { maxSubsets: 40, maxOrderings: 4 };

/** Structural equality of two commands (ignoring undefined fields and selection order). */
export function sameCommand(a: EngineCommand, b: EngineCommand): boolean {
  const norm = (c: EngineCommand) =>
    JSON.stringify(
      Object.entries(c)
        .filter(([, v]) => v !== undefined)
        .sort(([x], [y]) => (x < y ? -1 : 1))
        .map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v]),
    );
  return norm(a) === norm(b);
}

export function pendingPrompt(state: MatchState): PromptState | undefined {
  return state.promptQueue.find((p) => p.status === "pending" && p.seat !== "judge");
}

export function pendingJudgePrompt(state: MatchState): PromptState | undefined {
  return state.promptQueue.find((p) => p.status === "pending" && p.seat === "judge");
}

/**
 * Who has to act now: the owner of the pending prompt (blocker, counter and
 * life-trigger prompts belong to the defender), otherwise the active seat in
 * its main phase. Returns null when the game is over or nobody can act.
 * Setup is not handled here (the arena scripts it).
 */
export function actingSeat(state: MatchState): MatchSeat | null {
  if (state.status !== "active") return null;
  const prompt = pendingPrompt(state);
  if (prompt) return prompt.seat as MatchSeat;
  return state.phase === "main" ? state.activeSeat : null;
}

function cardIdOf(state: MatchState, instanceId: string): string {
  return state.cards[instanceId]?.cardId ?? instanceId;
}

/** A card in play is public: its instance id is a stable key. */
function isPublicInstance(state: MatchState, instanceId: string): boolean {
  const zone = state.cards[instanceId]?.zone;
  return zone === "leader" || zone === "character" || zone === "stage" || zone === "trash";
}

/** Key for a card reference: instance id if public, card id otherwise. */
function cardKey(state: MatchState, id: string): string {
  if (!state.cards[id]) return id; // option ids such as "skip", "hidden-card:2", "active-don:0"
  return isPublicInstance(state, id) ? id : cardIdOf(state, id);
}

export function enumerateActions(
  state: MatchState,
  seat: MatchSeat,
  options: ActionOptions = {},
): Action[] {
  const opts = { ...DEFAULTS, ...options };
  const prompt = pendingPrompt(state);
  if (prompt) {
    return prompt.seat === seat ? promptActions(state, prompt, opts) : [];
  }
  if (state.status !== "active" || state.phase !== "main" || state.activeSeat !== seat) return [];
  return mainPhaseActions(state, seat, getLegalCommands(state, seat));
}

function mainPhaseActions(
  state: MatchState,
  seat: MatchSeat,
  legal: LegalCommandDescriptor[],
): Action[] {
  const actions: Action[] = [];
  const seen = new Set<string>();
  const push = (key: string, command: EngineCommand) => {
    if (seen.has(key)) return;
    seen.add(key);
    actions.push({ key, command });
  };
  const activeDon = state.players[seat].activeDon;
  for (const d of legal) {
    if (d.seat !== seat) continue;
    switch (d.type) {
      case "endTurn":
        push("end", { type: "endTurn", seat });
        break;
      case "playCard": {
        if (!d.sourceId) break;
        // The slot index has no strategic meaning. An empty slotChoices list
        // means a full board: the engine then asks which Character to replace.
        const slotIndex = d.slotChoices?.[0];
        push(`play:${cardIdOf(state, d.sourceId)}`, {
          type: "playCard",
          seat,
          instanceId: d.sourceId,
          ...(slotIndex !== undefined && { slotIndex }),
        });
        break;
      }
      case "attachDon": {
        if (!d.sourceId) break;
        for (const amount of new Set([1, 2, activeDon])) {
          if (amount < 1 || amount > activeDon) continue;
          push(`don:${d.sourceId}:${amount}`, {
            type: "attachDon",
            seat,
            targetId: d.sourceId,
            amount,
          });
        }
        break;
      }
      case "declareAttack": {
        if (!d.sourceId) break;
        for (const targetId of d.targetIds ?? []) {
          push(`atk:${d.sourceId}>${targetId}`, {
            type: "declareAttack",
            seat,
            attackerId: d.sourceId,
            targetId,
          });
        }
        break;
      }
      case "activateEffect":
        if (!d.sourceId) break;
        push(`act:${d.sourceId}`, {
          type: "activateEffect",
          seat,
          sourceInstanceId: d.sourceId,
          trigger: "activateMain",
        });
        break;
      default:
        // concede is never offered; setup commands are scripted by the arena.
        break;
    }
  }
  return actions;
}

function resolve(
  prompt: PromptState,
  extra: { optionId?: string; selectedIds?: string[] },
): EngineCommand {
  return {
    type: "resolvePrompt",
    seat: prompt.seat as MatchSeat,
    promptId: prompt.id,
    ...extra,
  };
}

type TotalConstraint = Parameters<typeof selectionSatisfiesTotalConstraint>[2];

interface SelectionContext {
  intent?: string;
  action?: {
    target?: { totalConstraint?: TotalConstraint };
    // "Play" actions (e.g. OP17-118) carry their constraints on the action itself.
    totalConstraint?: TotalConstraint;
    differentNames?: boolean;
  };
}

/**
 * Hidden constraints of a selection prompt that the engine validates but does
 * not express through min/max (e.g. "K.O. opponent Characters with a total
 * cost of 4 or less", or "play up to 2 cards with different names and a total
 * cost of 9 or less").
 */
export function promptSelectionIsValid(state: MatchState, prompt: PromptState, selectedIds: readonly string[]): boolean {
  const ctx = prompt.resolutionContext as SelectionContext | null;
  const action = ctx?.action;
  const isPlay = ctx?.intent === "effectPlaySelection";
  const constraint = action?.target?.totalConstraint ?? (isPlay ? action?.totalConstraint : undefined);
  const differentNames = isPlay && action?.differentNames === true;
  if (!constraint && !differentNames) return true;
  if (selectedIds.some((id) => !state.cards[id])) return true; // opaque ids: let the engine decide
  if (differentNames) {
    const names = selectedIds.map((id) => getCardForInstance(state, id).name);
    if (new Set(names).size !== names.length) return false;
  }
  return !constraint || selectionSatisfiesTotalConstraint(state, [...selectedIds], constraint);
}

/**
 * Makes a prompt command acceptable when another policy (the engine heuristic)
 * picked a selection that breaks a hidden constraint: falls back to the largest
 * valid selection among our enumerated actions.
 */
export function repairPromptCommand(state: MatchState, command: EngineCommand): EngineCommand {
  if (command.type !== "resolvePrompt" || !command.selectedIds) return command;
  const prompt = state.promptQueue.find((p) => p.id === command.promptId && p.status === "pending");
  if (!prompt || promptSelectionIsValid(state, prompt, command.selectedIds)) return command;
  const valid = enumerateActions(state, prompt.seat as MatchSeat)
    .map((a) => a.command)
    .filter((c): c is EngineCommand & { selectedIds?: string[] } => c.type === "resolvePrompt");
  valid.sort((a, b) => (b.selectedIds?.length ?? 0) - (a.selectedIds?.length ?? 0));
  return valid[0] ?? command;
}

function intentOf(prompt: PromptState): string {
  const ctx = prompt.resolutionContext as { intent?: string } | null;
  return ctx?.intent ?? "unknown";
}

function promptActions(
  state: MatchState,
  prompt: PromptState,
  opts: Required<ActionOptions>,
): Action[] {
  const intent = intentOf(prompt);
  const enabled = prompt.options.filter((o) => o.enabled !== false);
  switch (prompt.choiceKind) {
    case "confirm":
    case "chooseOption":
    case null: {
      const list = enabled.length > 0 ? enabled : prompt.options;
      return list.map((o) => ({ key: `opt:${o.id}`, command: resolve(prompt, { optionId: o.id }) }));
    }
    case "orderCards":
      return orderingActions(state, prompt, opts);
    case "selectCards":
    case "selectTargets":
    case "costPayment": {
      if (intent === "battleBlocker") return blockerActions(state, prompt);
      if (intent === "battleCounter") return counterActions(state, prompt, opts);
      return subsetActions(state, prompt, enabled, opts);
    }
  }
}

function blockerActions(state: MatchState, prompt: PromptState): Action[] {
  const actions: Action[] = [{ key: "block:none", command: resolve(prompt, { selectedIds: [] }) }];
  for (const o of prompt.options) {
    if (o.id === "skip" || o.enabled === false || !state.cards[o.id]) continue;
    actions.push({ key: `block:${o.id}`, command: resolve(prompt, { selectedIds: [o.id] }) });
  }
  return actions;
}

interface Group {
  key: string;
  ids: string[];
}

/** Groups interchangeable options (same catalog card in a hidden zone, fungible DON tokens). */
function groupOptions(state: MatchState, ids: string[]): Group[] {
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    let key = cardKey(state, id);
    // DON token ids look like "active-don:3" / "attached-don:<instance>:1".
    const don = /^(active-don|rested-don|attached-don:[^:]+):\d+$/.exec(id);
    if (don) key = don[1]!;
    const list = groups.get(key);
    if (list) list.push(id);
    else groups.set(key, [id]);
  }
  return [...groups.entries()].map(([key, list]) => ({ key, ids: list }));
}

/**
 * All multisets of size [min, max] drawn from the groups, smallest first,
 * stopping after `limit`. Each multiset is returned as concrete option ids.
 */
function multisets(groups: Group[], min: number, max: number, limit: number): Group[][] {
  const out: Array<Array<{ group: Group; count: number }>> = [];
  const totalAvailable = groups.reduce((n, g) => n + g.ids.length, 0);
  const hi = Math.min(max, totalAvailable);
  for (let size = Math.max(0, min); size <= hi && out.length < limit; size++) {
    const pick: Array<{ group: Group; count: number }> = [];
    const rec = (index: number, remaining: number) => {
      if (out.length >= limit) return;
      if (remaining === 0) {
        out.push(pick.filter((p) => p.count > 0).map((p) => ({ ...p })));
        return;
      }
      if (index >= groups.length) return;
      const g = groups[index]!;
      for (let c = Math.min(remaining, g.ids.length); c >= 0; c--) {
        pick.push({ group: g, count: c });
        rec(index + 1, remaining - c);
        pick.pop();
        if (out.length >= limit) return;
      }
    };
    rec(0, size);
  }
  return out.map((sel) => sel.map(({ group, count }) => ({ key: group.key, ids: group.ids.slice(0, count) })));
}

function selectionKey(prefix: string, sel: Group[]): string {
  const parts = sel.flatMap((g) => Array.from({ length: g.ids.length }, () => g.key)).sort();
  return `${prefix}:${parts.join(",")}`;
}

function subsetActions(
  state: MatchState,
  prompt: PromptState,
  enabled: PromptState["options"],
  opts: Required<ActionOptions>,
): Action[] {
  const ids = enabled.map((o) => o.id);
  const groups = groupOptions(state, ids);
  const sels = multisets(groups, prompt.minSelections, prompt.maxSelections, opts.maxSubsets * 4)
    .filter((sel) => promptSelectionIsValid(state, prompt, sel.flatMap((g) => g.ids)))
    .slice(0, opts.maxSubsets);
  if (sels.length === 0) {
    return [{ key: "sel:", command: resolve(prompt, { selectedIds: [] }) }];
  }
  return sels.map((sel) => ({
    key: selectionKey("sel", sel),
    command: resolve(prompt, { selectedIds: sel.flatMap((g) => g.ids) }),
  }));
}

function baseCostOf(cardId: string): number {
  const card = getCard(cardId) as { cost?: number };
  return card.cost ?? 0;
}

function counterActions(
  state: MatchState,
  prompt: PromptState,
  opts: Required<ActionOptions>,
): Action[] {
  const seat = prompt.seat as MatchSeat;
  const budget = state.players[seat].activeDon;
  const enabled = prompt.options.filter((o) => o.enabled !== false && state.cards[o.id]);
  const groups = groupOptions(state, enabled.map((o) => o.id));
  // Enumerate generously, then drop subsets whose [Counter] events cost more
  // DON than the defender has (the engine rejects those).
  const sels = multisets(groups, 0, enabled.length, opts.maxSubsets * 4);
  const actions: Action[] = [];
  for (const sel of sels) {
    const ids = sel.flatMap((g) => g.ids);
    let eventCost = 0;
    let events = 0;
    for (const id of ids) {
      const card = getCard(cardIdOf(state, id)) as { cardType: string };
      if (card.cardType === "event") {
        eventCost += baseCostOf(cardIdOf(state, id));
        events++;
      }
    }
    if (eventCost > budget) continue;
    // Several [Counter] Events together can need more DON!! cards for their
    // DON!! −X costs than the field holds; the engine rejects those subsets.
    if (events > 1 && !counterSelectionIsPayable(state, seat, ids)) continue;
    actions.push({ key: selectionKey("counter", sel), command: resolve(prompt, { selectedIds: ids }) });
    if (actions.length >= opts.maxSubsets) break;
  }
  return actions;
}

function orderingActions(
  state: MatchState,
  prompt: PromptState,
  opts: Required<ActionOptions>,
): Action[] {
  const ids = prompt.options.map((o) => o.id);
  const orders: string[][] = [ids, [...ids].reverse()];
  // Rotations give every card a chance to be first (top of deck), which is
  // what usually matters when rearranging the top of a deck.
  for (let r = 1; r < ids.length && orders.length < opts.maxOrderings; r++) {
    orders.push([...ids.slice(r), ...ids.slice(0, r)]);
  }
  const seen = new Set<string>();
  const actions: Action[] = [];
  for (const order of orders.slice(0, Math.max(1, opts.maxOrderings))) {
    const key = `ord:${order.map((id) => cardKey(state, id)).join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    actions.push({ key, command: resolve(prompt, { selectedIds: order }) });
  }
  return actions;
}
