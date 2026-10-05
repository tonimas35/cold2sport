/**
 * The improved fast policy: the engine's heuristic bot plus small, targeted
 * overrides for decisions where it demonstrably wastes cards.
 *
 * A card-by-card audit of the meta decks (docs/NOTAS_MOTOR.md, §7) found that
 * the engine heuristic (vendor .../automation/heuristic-strategy.ts) plays many
 * cards so that they do nothing, which biases every simulated matchup and
 * every rollout of the search bots. Each override below fires only in the
 * situation it was written for and otherwise defers to the heuristic, so its
 * strengths (attack and DON!! scoring, blocking, counters) are kept:
 *
 * 1. "Up to N" amounts (`chooseOption` prompts): the heuristic has no resolver
 *    for them and the harness fallback picks the first option, "0".
 * 2. Negative power on the opponent's cards: picks the opponent's fighting card,
 *    then cards our attackers can then beat, up to the maximum (the heuristic
 *    only counts positive power as useful and picks nothing).
 * 3. Removal with mixed or multiple targets: up to the maximum, opponent's cards
 *    only (the heuristic caps optional picks at 1 and picks 0 when our own cards
 *    are also eligible).
 * 4. "Add a card from your trash to your hand": the heuristic treats
 *    returnToHand as removal and picks nothing.
 * 5. Life [Trigger] "Play this card.": always activated (the heuristic keeps 5+
 *    cost Characters in hand instead of playing them for free).
 * 6. Effects that would do nothing (an unpayable [Main] cost, no legal target,
 *    a failed condition, an empty DON!! deck): the Event is not played, the
 *    [Activate: Main] is not used, the optional cost is declined and a
 *    pointless [Trigger] goes to hand instead of the trash.
 * 7. "Choose one" effects: one-ply lookahead scored with the value model from
 *    the chooser's point of view (the heuristic always takes option 0).
 *
 * `enginePolicyCommand` keeps the previous rollout policy (engine heuristic
 * plus the first two fixes) as a baseline: `search:...,rollout=engine`.
 */
import { getLegalCommands, heuristicAgent, resolveBotPromptCommand } from "@tcg/op-engine";
import type {
  EngineCommand,
  LegalCommandDescriptor,
  MatchSeat,
  MatchState,
  PromptState,
} from "@tcg/op-engine";
import { pendingJudgePrompt, pendingPrompt, promptSelectionIsValid, repairPromptCommand } from "../engine/actions.ts";
import { determinize } from "../engine/determinize.ts";
import {
  candidatePoolForTarget,
  canPayCosts,
  effectBlocksFor,
  effectBlocksForInstance,
  evaluateConditions,
  getCard,
  getCardCost,
  getCardForInstance,
  getCardPower,
  getKeywords,
} from "../engine/internals.ts";
import { applyInPlace, cloneState } from "../engine/sim.ts";
import { evaluate, HANDCRAFTED_MODEL, type ValueModel } from "../eval/value.ts";
import { createRng, type Rng } from "../util/rng.ts";
import { createHeuristicAgent } from "./heuristic.ts";
import type { Agent, DecisionRequest } from "./types.ts";

type EffectBlock = ReturnType<typeof effectBlocksFor>[number];
type EffectAction = EffectBlock["actions"][number];
type Condition = NonNullable<Parameters<typeof evaluateConditions>[3]>[number];
type Target = Parameters<typeof candidatePoolForTarget>[3];

export interface PolicyOptions {
  /**
   * Value model for the lookahead of "choose one" effects. Defaults to the
   * handcrafted model; the search passes its own model so that rollouts and
   * leaf evaluations agree.
   */
  readonly model?: ValueModel;
  /** Internal: false inside a lookahead, so lookaheads never nest. */
  readonly lookahead?: boolean;
}

const OTHER: Record<MatchSeat, MatchSeat> = { north: "south", south: "north" };

/** Prompt steps followed after a "choose one" option before scoring it. */
const LOOKAHEAD_STEPS = 16;
/** Re-choices allowed when a main-phase choice is dropped as useless. */
const MAX_MAIN_RETRIES = 8;

/** Actions that hurt the targeted card's controller (same set as the engine heuristic). */
const HARMFUL_ACTIONS = new Set([
  "ko",
  "rest",
  "freeze",
  "returnToHand",
  "returnToDeck",
  "trashFromField",
  "negateEffects",
  "cannotAttack",
  "removeFromLife",
  "turnLifeFaceDown",
]);

/** Buffs on our own cards where taking more targets is never worse. */
const STACKABLE_BUFFS = new Set(["setActive", "grantKeyword"]);

// ─────────────────────────────────────────────────────────────────────────────
// Entry points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The policy's command for `seat`, which must be the seat that has to act
 * (owner of the pending prompt, or the active seat in its main phase).
 * Deterministic given `rng`. Reads `state` without mutating it.
 */
export function policyCommand(state: MatchState, seat: MatchSeat, rng: Rng, options: PolicyOptions = {}): EngineCommand {
  const context = { random: () => rng.next() };
  const prompt = pendingPrompt(state);
  if (prompt && prompt.seat === seat) {
    return repairPromptCommand(
      state,
      promptOverride(state, prompt, rng, options) ??
        heuristicAgent.resolvePrompt?.(state, prompt, context) ??
        resolveBotPromptCommand(state, prompt) ?? { type: "endTurn", seat },
    );
  }
  return mainPhaseCommand(state, seat, context);
}

/**
 * The previous rollout policy, kept as a baseline: the engine heuristic plus
 * the "up to N DON!!" and battle-buff fixes only.
 */
export function enginePolicyCommand(state: MatchState, seat: MatchSeat, rng: Rng): EngineCommand {
  const context = { random: () => rng.next() };
  const prompt = pendingPrompt(state);
  if (prompt && prompt.seat === seat) {
    return repairPromptCommand(
      state,
      battleBuffTarget(state, prompt) ??
        heuristicAgent.resolvePrompt?.(state, prompt, context) ??
        takeMaxOption(prompt) ??
        resolveBotPromptCommand(state, prompt) ?? { type: "endTurn", seat },
    );
  }
  const legal = getLegalCommands(state, seat).filter((d) => d.type !== "concede");
  return heuristicAgent.choose(state, seat, legal, context) ?? { type: "endTurn", seat };
}

/**
 * `policy` (oracle, reads the state it is given like the engine bots) or
 * `policy-honest` (decides on a determinized copy, like `heuristic-honest`).
 * Mulligans are the engine heuristic's.
 */
export function createPolicyAgent(options: PolicyOptions & { honest?: boolean } = {}): Agent {
  const { honest = false, ...policyOptions } = options;
  const heuristic = createHeuristicAgent();
  const view = (request: DecisionRequest): DecisionRequest =>
    honest ? { ...request, state: determinize(request.state, request.seat, request.rng, request.knowledge) } : request;
  return {
    id: honest ? "policy-honest" : "policy",
    honest,
    decide(request) {
      const { state, seat, rng } = view(request);
      return policyCommand(state, seat, rng, policyOptions);
    },
    mulligan: (request) => heuristic.mulligan(view(request)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main phase
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The heuristic's main-phase choice, re-asked without the plays it scores
 * blindly that would do nothing (override 6): it scores every Event at 900+
 * and every [Activate: Main] at 750 without looking at their costs or targets.
 * OP17-056 Rocks Pirates ("[Main] You may rest 5 DON!!") was played 24 times
 * out of 24 with fewer than 5 DON!!: the cost is declined, nothing happens and
 * a [Counter] card goes to the trash.
 */
function mainPhaseCommand(state: MatchState, seat: MatchSeat, context: { random: () => number }): EngineCommand {
  let legal: LegalCommandDescriptor[] = getLegalCommands(state, seat).filter((d) => d.type !== "concede");
  for (let attempt = 0; attempt < MAX_MAIN_RETRIES; attempt++) {
    const command = heuristicAgent.choose(state, seat, legal, context) ?? { type: "endTurn", seat };
    const drop = uselessMainCommand(state, seat, command);
    if (!drop) return command;
    const before = legal.length;
    legal = legal.filter((d) => !drop(d));
    if (legal.length === before) return command;
  }
  return { type: "endTurn", seat };
}

/** A filter for the descriptors to drop when `command` would do nothing, else null. */
function uselessMainCommand(
  state: MatchState,
  seat: MatchSeat,
  command: EngineCommand,
): ((d: LegalCommandDescriptor) => boolean) | null {
  if (command.type === "playCard") {
    const instance = state.cards[command.instanceId];
    if (!instance || !eventMainDoesNothing(state, seat, command.instanceId)) return null;
    // Every copy of the same Event is equally useless right now.
    return (d) => d.type === "playCard" && !!d.sourceId && state.cards[d.sourceId]?.cardId === instance.cardId;
  }
  if (command.type === "activateEffect") {
    const source = command.sourceInstanceId;
    if (!state.cards[source] || !activationDoesNothing(state, seat, source)) return null;
    return (d) => d.type === "activateEffect" && d.sourceId === source;
  }
  return null;
}

/**
 * Whether playing this Event now would do nothing: every [Main] block fails
 * its condition, cannot pay its cost or has no effect. Checked on the state the
 * engine resolves the block in (Event cost paid, card already in the trash),
 * built as a shallow read-only view.
 */
export function eventMainDoesNothing(state: MatchState, seat: MatchSeat, instanceId: string): boolean {
  const card = getCardForInstance(state, instanceId);
  if (card.cardType !== "event") return false;
  const blocks = effectBlocksFor(card, "main");
  if (blocks.length === 0) return false;
  const probe = afterPayingEvent(state, seat, instanceId);
  return blocks.every((block) => blockDoesNothing(probe, seat, instanceId, block, true));
}

function afterPayingEvent(state: MatchState, seat: MatchSeat, instanceId: string): MatchState {
  const player = state.players[seat];
  const cost = getCardCost(state, instanceId);
  return {
    ...state,
    players: {
      ...state.players,
      [seat]: {
        ...player,
        activeDon: player.activeDon - cost,
        restedDon: player.restedDon + cost,
        hand: player.hand.filter((id) => id !== instanceId),
        trash: [...player.trash, instanceId],
      },
    },
    cards: { ...state.cards, [instanceId]: { ...state.cards[instanceId]!, zone: "trash" } },
  };
}

/**
 * Whether no [Activate: Main] block of the source can do anything now (used up
 * this turn, condition or cost not met, or no effect). OP13-007 Ace & Sabo &
 * Luffy trashes itself to give −3000 to an opponent's Character even when the
 * opponent has none.
 */
function activationDoesNothing(state: MatchState, seat: MatchSeat, sourceId: string): boolean {
  const source = state.cards[sourceId]!;
  const blocks = effectBlocksForInstance(state, sourceId, "activateMain");
  if (blocks.length === 0) return false;
  return blocks.every((block, index) => {
    const used = block.oncePerTurn && source.usedEffectKeys.includes(block.oncePerTurnKey ?? `activateMain:${index}`);
    return used || blockDoesNothing(state, seat, sourceId, block, true);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// "Would this effect do anything?" — conservative static checks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True only when we are sure the block has no effect: its condition fails, its
 * cost cannot be paid, or every action is a no-op. Unknown shapes count as
 * doing something, so the heuristic keeps the decision.
 */
function blockDoesNothing(
  state: MatchState,
  controller: MatchSeat,
  sourceId: string,
  block: EffectBlock,
  checkConditionsAndCosts: boolean,
): boolean {
  if (checkConditionsAndCosts) {
    if (conditionsFail(state, controller, sourceId, block.conditions)) return true;
    if (block.costs?.length && !canPayCosts(state, controller, sourceId, block.costs, undefined)) return true;
  }
  return actionsDoNothing(state, controller, sourceId, block.actions);
}

function actionsDoNothing(state: MatchState, controller: MatchSeat, sourceId: string, actions: readonly EffectAction[]): boolean {
  return actions.length > 0 && actions.every((a) => actionDoesNothing(state, controller, sourceId, a));
}

function conditionsFail(state: MatchState, controller: MatchSeat, sourceId: string, conditions: readonly Condition[] | undefined): boolean {
  if (!conditions?.length) return false;
  // Conditions about the previous action's targets or the triggering event
  // cannot be judged before the effect runs.
  if (JSON.stringify(conditions).includes("previousActionTarget") || JSON.stringify(conditions).includes("triggerEvent")) {
    return false;
  }
  const result = evaluateConditions(state, controller, sourceId, [...conditions]);
  return result.supported && !result.matches;
}

/** Zones whose candidates the static check can count (cards in play). */
const FIELD_ZONES = new Set(["character", "leader", "stage", "field"]);

function lowersPower(action: EffectAction): boolean {
  const a = action as { action: string; value?: number };
  return (a.action === "modifyPower" && (a.value ?? 0) < 0) || a.action === "setBasePower";
}

function actionDoesNothing(state: MatchState, controller: MatchSeat, sourceId: string, action: EffectAction): boolean {
  const a = action as EffectAction & {
    condition?: Condition;
    target?: Target;
    previousActionTargets?: boolean;
    actions?: EffectAction[];
    options?: EffectAction[][];
  };
  if (a.condition && conditionsFail(state, controller, sourceId, [a.condition])) return true;
  switch (a.action) {
    case "sequence":
    case "optional":
      return actionsDoNothing(state, controller, sourceId, a.actions ?? []);
    case "choice":
      return (a.options ?? []).every((option) => actionsDoNothing(state, controller, sourceId, option));
    case "addDon":
      // Pudding OP08-058 turns 2 Life face-up to add a DON!! that is not there.
      return state.players[controller].donDeckCount === 0;
    default:
      break;
  }
  const target = a.target;
  if (!target || a.previousActionTargets || target.self) return false;
  if (!target.zones.every((zone) => FIELD_ZONES.has(zone))) return false;
  const pool = candidatePoolForTarget(state, controller, sourceId, target);
  if (!pool.supported) return false;
  // When either player's cards are eligible (OP17-056 "Return up to 1
  // Character"), removal and power cuts only count against the opponent's:
  // the policy never aims them at its own (see targetSelection).
  const mixed = target.player === "any" || target.player === "both";
  const harmful = HARMFUL_ACTIONS.has(a.action) || lowersPower(action);
  const useful =
    mixed && harmful ? pool.candidateIds.filter((id) => state.cards[id]?.controller !== controller) : pool.candidateIds;
  return useful.length === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────────────────

function promptOverride(state: MatchState, prompt: PromptState, rng: Rng, options: PolicyOptions): EngineCommand | null {
  return (
    battleBuffTarget(state, prompt) ??
    lifeTriggerChoice(state, prompt) ??
    optionalCostChoice(state, prompt) ??
    countChoice(state, prompt) ??
    actionChoice(state, prompt, rng, options) ??
    targetSelection(state, prompt)
  );
}

function optionCommand(prompt: PromptState, optionId: string): EngineCommand {
  return { type: "resolvePrompt", seat: prompt.seat as MatchSeat, promptId: prompt.id, optionId };
}

function confirm(prompt: PromptState, accept: boolean): EngineCommand | null {
  const option = prompt.options.find((o) =>
    accept ? o.id === "yes" || o.id === "activate" : o.id === "no" || o.id === "skip",
  );
  return option ? optionCommand(prompt, option.id) : null;
}

/**
 * During a battle, a "+X power" effect that targets one card should go to the
 * card that is fighting: the defender's target when the defending seat
 * chooses, the attacker when the attacking seat chooses. The engine heuristic
 * gives buffs to its strongest card instead, which wastes the effect (and the
 * card often trashed to pay for it); with Rocks lists this alone flips
 * matchups (see docs/RESULTADOS.md, calibration).
 */
function battleBuffTarget(world: MatchState, prompt: PromptState): EngineCommand | null {
  const battle = world.battle;
  if (!battle || prompt.choiceKind !== "selectTargets" || prompt.maxSelections !== 1) return null;
  const action = (prompt.resolutionContext as { action?: { action?: string; value?: number } } | null)?.action;
  if (action?.action !== "modifyPower" || (action.value ?? 0) <= 0) return null;
  const fighter = prompt.seat === battle.defendingSeat ? battle.targetId : battle.attackerId;
  if (world.cards[fighter]?.controller !== prompt.seat) return null;
  if (!prompt.options.some((o) => o.id === fighter && o.enabled !== false)) return null;
  return { type: "resolvePrompt", seat: prompt.seat as MatchSeat, promptId: prompt.id, selectedIds: [fighter] };
}

/**
 * "Up to N DON!!" prompts where more is better for the chooser. The engine's
 * heuristic does not handle `chooseOption` prompts and its fallback picks the
 * first option, "0", wasting the effect (and sometimes a cost already paid).
 * Only used by `enginePolicyCommand`; `countChoice` generalizes it.
 */
const TAKE_MAX_INTENTS = new Set(["effectSetActiveDon", "effectAddDon", "effectGiveDonCount"]);

function takeMaxOption(prompt: PromptState): EngineCommand | null {
  const intent = prompt.resolutionContext?.intent;
  if (prompt.choiceKind !== "chooseOption" || !intent || !TAKE_MAX_INTENTS.has(intent)) return null;
  let best: string | null = null;
  for (const option of prompt.options) {
    if (option.enabled === false || !/^\d+$/.test(option.id)) continue;
    if (best === null || Number(option.id) > Number(best)) best = option.id;
  }
  return best === null ? null : optionCommand(prompt, best);
}

/**
 * Life [Trigger] (override 5 and 6). The heuristic declines every Character
 * trigger with cost >= 5 to keep the card, but "[Trigger] Play this card." puts
 * a 5-7 cost Character into play for free (Smoothie OP17-106, Sweet 3 Generals
 * OP17-114, Katakuri OP17-103, Perospero OP17-110): almost always right. And a
 * trigger that would do nothing (failed condition, no target) only sends the
 * card to the trash, while declining adds it to the hand.
 */
function lifeTriggerChoice(state: MatchState, prompt: PromptState): EngineCommand | null {
  const ctx = prompt.resolutionContext;
  if (prompt.choiceKind !== "confirm" || ctx?.intent !== "lifeTrigger") return null;
  const sourceId = ctx.sourceInstanceId;
  if (!state.cards[sourceId]) return null;
  const card = getCardForInstance(state, sourceId);
  const blocks = effectBlocksFor(card, "trigger");
  if (blocks.length === 0) return null;
  const seat = prompt.seat as MatchSeat;
  if (blocks.every((block) => blockDoesNothing(state, seat, sourceId, block, true))) return confirm(prompt, false);
  if (card.cardType === "character" && blocks.some((block) => containsAction(block.actions, "playThisCard"))) {
    return confirm(prompt, true);
  }
  return null;
}

function containsAction(actions: readonly EffectAction[], name: string): boolean {
  return actions.some((action) => {
    const a = action as { action: string; actions?: EffectAction[]; options?: EffectAction[][] };
    return a.action === name || containsAction(a.actions ?? [], name) || (a.options ?? []).some((o) => containsAction(o, name));
  });
}

/**
 * "You may <cost>:" on our own effect (override 6): decline when the effect
 * would do nothing, instead of paying for it. The heuristic accepts every own
 * optional effect: Kaido OP17-058 paid DON!! −1 with no opponent Character to
 * target, Pudding OP08-058 turned 2 Life face-up with an empty DON!! deck.
 * The engine only asks after checking the block's condition and cost.
 */
function optionalCostChoice(state: MatchState, prompt: PromptState): EngineCommand | null {
  const ctx = prompt.resolutionContext;
  if (prompt.choiceKind !== "confirm" || ctx?.intent !== "effectOptional") return null;
  if (ctx.controller !== prompt.seat || !state.cards[ctx.sourceInstanceId]) return null;
  const block = effectBlocksForInstance(state, ctx.sourceInstanceId, ctx.trigger)[ctx.blockIndex];
  if (!block?.costs?.length) return null;
  return blockDoesNothing(state, ctx.controller, ctx.sourceInstanceId, block, false) ? confirm(prompt, false) : null;
}

/**
 * "Up to N" amounts (override 1). The heuristic has no resolver for
 * `chooseOption` prompts and the fallback takes option "0". Semantics checked
 * in vendor .../effects/actions.ts:
 * - add DON!! / give DON!! / set DON!! active: more is better;
 * - add cards from the deck to Life (Smoothie, Sweet 3 Generals, Borsalino
 *   EB04-058, Linlin OP17-112, Cracker OP17-104) and draw: as many as possible
 *   while leaving 1 card in the deck (0 cards in deck loses, rule 1-2-1-1-2);
 * - remove Life / rest DON!! / trash from deck: as many as possible when it hits
 *   the opponent (Linlin OP17-112 "opponent's top Life to their hand"); our own
 *   Life, DON!! or deck stay with the heuristic's default (0);
 * - rest DON!! for +power (Luffy OP13-001, on the opponent's attack): just
 *   enough to win the battle, else none.
 */
function countChoice(state: MatchState, prompt: PromptState): EngineCommand | null {
  const ctx = prompt.resolutionContext;
  if (prompt.choiceKind !== "chooseOption" || !ctx) return null;
  const counts = prompt.options.filter((o) => o.enabled !== false && /^\d+$/.test(o.id)).map((o) => Number(o.id));
  if (counts.length === 0) return null;
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const seat = prompt.seat as MatchSeat;
  const deckRoom = state.players[seat].deck.length - 1;
  let want: number | null = null;
  switch (ctx.intent) {
    case "effectAddDon":
    case "effectGiveDonCount":
    case "effectSetActiveDon":
      want = max;
      break;
    case "effectAddToLifeFromDeck": {
      const target = ctx.action.target.player === "self" ? ctx.controller : OTHER[ctx.controller];
      want = target === seat ? Math.min(max, deckRoom) : min;
      break;
    }
    case "effectDrawCount": {
      const drawer = ctx.action.player === "self" ? ctx.controller : OTHER[ctx.controller];
      want = drawer === seat ? Math.min(max, deckRoom) : min;
      break;
    }
    case "effectRemoveFromLifeCount":
      if ((ctx.action.player === "self" ? ctx.controller : OTHER[ctx.controller]) !== seat) want = max;
      break;
    case "effectRestDonCount":
      if (ctx.targetSeat !== seat) want = max;
      break;
    case "effectTrashFromDeckCount":
      if ((ctx.action.player === "self" ? ctx.controller : OTHER[ctx.controller]) !== seat) want = max;
      break;
    case "effectRestDonForPowerCount":
      want = restDonForPower(state, seat, ctx.action.valuePerDon, max);
      break;
    default:
      return null;
  }
  if (want === null) return null;
  const target = Math.max(want, min);
  const choice = counts.filter((c) => c <= target).reduce((a, b) => Math.max(a, b), min);
  return optionCommand(prompt, String(choice));
}

function restDonForPower(state: MatchState, seat: MatchSeat, valuePerDon: number, max: number): number | null {
  const battle = state.battle;
  if (!battle || battle.defendingSeat !== seat || valuePerDon <= 0) return null;
  const attack = getCardPower(state, battle.attackerId);
  const defense = getCardPower(state, battle.targetId) + battle.counterTotal;
  if (attack < defense) return 0;
  // Ties go to the attacker.
  const needed = Math.floor((attack - defense) / valuePerDon) + 1;
  return needed <= max ? needed : 0;
}

/**
 * "Choose one" effects (override 7): one-ply lookahead. Each option is applied
 * to a copy of the state, the follow-up prompts are answered by this policy
 * (without nested lookahead) for a bounded number of steps, and the result is
 * scored with the value model from the chooser's point of view. The heuristic
 * always takes option 0: Linlin OP17-112 adds a Life card to its own Life even
 * when taking the opponent's last Life card wins the race, and when the
 * opponent chooses for Linlin OP17-049 it always lets Linlin's controller draw 2.
 */
function actionChoice(state: MatchState, prompt: PromptState, rng: Rng, options: PolicyOptions): EngineCommand | null {
  if (prompt.choiceKind !== "chooseOption" || prompt.resolutionContext?.intent !== "effectActionChoice") return null;
  if (options.lookahead === false) return null;
  const enabled = prompt.options.filter((o) => o.enabled !== false);
  if (enabled.length < 2) return null;
  const chooser = prompt.seat as MatchSeat;
  const model = options.model ?? HANDCRAFTED_MODEL;
  // Same seed for every option (common random numbers): the options differ
  // only by the choice itself.
  const seed = rng.int(2 ** 31);
  let best: string | null = null;
  let bestValue = -Infinity;
  for (const option of enabled) {
    const value = lookaheadValue(state, optionCommand(prompt, option.id), chooser, model, seed);
    if (value !== null && value > bestValue) {
      bestValue = value;
      best = option.id;
    }
  }
  return best === null ? null : optionCommand(prompt, best);
}

/** Value for `perspective` after `command` and the prompts that follow it; null if the copy broke. */
function lookaheadValue(
  state: MatchState,
  command: EngineCommand,
  perspective: MatchSeat,
  model: ValueModel,
  seed: number,
): number | null {
  const world = cloneState(state);
  const rng = createRng(seed);
  try {
    // A rejected command can leave the copy corrupted: discard it.
    if (!applyInPlace(world, command)) return null;
    for (let step = 0; step < LOOKAHEAD_STEPS && world.status !== "finished"; step++) {
      const judge = pendingJudgePrompt(world);
      if (judge) {
        if (!applyInPlace(world, { type: "judgeResolvePrompt", seat: "judge", promptId: judge.id, note: "auto" })) return null;
        continue;
      }
      const next = pendingPrompt(world);
      if (!next) break; // the effect is over: the next decision is a free one
      const reply = policyCommand(world, next.seat as MatchSeat, rng, { model, lookahead: false });
      if (!applyInPlace(world, reply)) return null;
    }
  } catch {
    return null;
  }
  return evaluate(model, world, perspective);
}

/**
 * Target selection (overrides 2, 3 and 4). Only `effectTargetSelection`
 * prompts, where the engine tells us the action; everything else stays with
 * the heuristic.
 */
function targetSelection(state: MatchState, prompt: PromptState): EngineCommand | null {
  const ctx = prompt.resolutionContext;
  if ((prompt.choiceKind !== "selectTargets" && prompt.choiceKind !== "selectCards") || ctx?.intent !== "effectTargetSelection") {
    return null;
  }
  const action = ctx.action as EffectAction & { action: string; value?: number };
  const seat = prompt.seat as MatchSeat;
  const ids = prompt.options
    .filter((o) => o.enabled !== false)
    .map((o) => o.targetId ?? o.id)
    .filter((id) => state.cards[id] !== undefined);
  if (ids.length === 0) return null;
  const theirs = ids.filter((id) => state.cards[id]!.controller !== seat);
  const allMine = theirs.length === 0;

  // 2. Power cuts: never on our own cards; best opponent targets first.
  if (lowersPower(action)) {
    return theirs.length > 0 ? pick(state, prompt, powerCutOrder(state, seat, theirs, action)) : null;
  }
  // 4. "Add up to 1 card from your trash to your hand" (OP17-096 [Trigger]):
  // the heuristic lists returnToHand as removal and picks nothing.
  if (action.action === "returnToHand" && allMine && ids.every((id) => state.cards[id]!.zone === "trash")) {
    return pick(state, prompt, byValue(state, ids));
  }
  // 3. Removal: the heuristic picks 0 targets when our own cards are also
  // eligible (OP17-056 "Return up to 1 Character", any player) and at most 1
  // for "up to 2" (OP17-036, Conquest of the Sea OP08-077).
  if (HARMFUL_ACTIONS.has(action.action) && theirs.length > 0 && (theirs.length < ids.length || prompt.maxSelections > 1)) {
    return pick(state, prompt, byStrongest(state, theirs));
  }
  // "Up to N" buffs on our own cards (Katakuri OP11-067 sets up to 2 active):
  // the heuristic stops at 1.
  const ownBuff = STACKABLE_BUFFS.has(action.action) || (action.action === "modifyPower" && (action.value ?? 0) > 0);
  if (ownBuff && allMine && prompt.maxSelections > 1) {
    return pick(state, prompt, fighterFirst(state, seat, byStrongest(state, ids)));
  }
  return null;
}

/** Takes candidates in order, up to the maximum, skipping any that would break a hidden total constraint. */
function pick(state: MatchState, prompt: PromptState, ordered: readonly string[]): EngineCommand | null {
  const chosen: string[] = [];
  for (const id of ordered) {
    if (chosen.length >= prompt.maxSelections) break;
    if (promptSelectionIsValid(state, prompt, [...chosen, id])) chosen.push(id);
  }
  if (chosen.length < prompt.minSelections) return null;
  return { type: "resolvePrompt", seat: prompt.seat as MatchSeat, promptId: prompt.id, selectedIds: chosen };
}

function byStrongest(state: MatchState, ids: readonly string[]): string[] {
  return [...ids].sort((a, b) => getCardPower(state, b) - getCardPower(state, a));
}

/** Most valuable first: highest printed cost, then power. */
function byValue(state: MatchState, ids: readonly string[]): string[] {
  const value = (id: string) => {
    const card = getCard(state.cards[id]!.cardId) as { cost?: number; power?: number };
    return (card.cost ?? 0) * 100000 + (card.power ?? 0);
  };
  return [...ids].sort((a, b) => value(b) - value(a));
}

function fighterFirst(state: MatchState, seat: MatchSeat, ordered: string[]): string[] {
  const battle = state.battle;
  if (!battle || battle.step === "damage" || battle.step === "complete") return ordered;
  const fighter = seat === battle.defendingSeat ? battle.targetId : battle.attackerId;
  return ordered.includes(fighter) ? [fighter, ...ordered.filter((id) => id !== fighter)] : ordered;
}

/**
 * Order for "give up to N of your opponent's cards −X power" (Katakuri
 * OP17-103, Sweet 3 Generals OP17-114, Kaido OP17-058, ASL OP13-007, Divine
 * Departure OP13-076, Bad Manners Kick Course OP04-016):
 * 1. during a battle that is not decided yet, the opponent's card in it (their
 *    attacker when we defend, the attacked card when we attack);
 * 2. in our turn, cards our best ready attacker (plus the active DON!! it could
 *    still get) beats only after the cut: the opponent's Leader first (it opens
 *    hits), then rested Characters and Blockers (attackable or in the way);
 *    in their turn, their active cards first (they can still attack us);
 * 3. then the strongest, as the heuristic does for removal.
 */
function powerCutOrder(state: MatchState, seat: MatchSeat, theirs: readonly string[], action: EffectAction): string[] {
  const value = (action as { value?: number }).value ?? 0;
  const after = (id: string) =>
    (action as { action: string }).action === "setBasePower" ? Math.min(getCardPower(state, id), value) : getCardPower(state, id) + value;
  const opponentLeader = state.players[OTHER[seat]].leaderInstanceId;
  let rank: (id: string) => number;
  if (state.activeSeat === seat) {
    const reach = attackReach(state, seat);
    rank = (id) => {
      const power = getCardPower(state, id);
      const opens = power > reach && after(id) <= reach;
      if (!opens) return 3;
      if (id === opponentLeader) return 1;
      const instance = state.cards[id]!;
      return instance.rested || getKeywords(state, id).has("blocker") ? 2 : 3;
    };
  } else {
    rank = (id) => (state.cards[id]!.rested ? 3 : 2);
  }
  const ordered = [...theirs].sort((a, b) => rank(a) - rank(b) || getCardPower(state, b) - getCardPower(state, a));
  const battle = state.battle;
  if (battle && battle.step !== "damage" && battle.step !== "complete") {
    const fighter = battle.defendingSeat === seat ? battle.attackerId : battle.targetId;
    if (ordered.includes(fighter)) return [fighter, ...ordered.filter((id) => id !== fighter)];
  }
  return ordered;
}

/** Power of our best card that can still attack this turn, plus 1000 per active DON!! we could still give it. */
function attackReach(state: MatchState, seat: MatchSeat): number {
  const player = state.players[seat];
  let best = -Infinity;
  for (const id of [player.leaderInstanceId, ...player.characterArea]) {
    if (!id) continue;
    const instance = state.cards[id];
    if (!instance || instance.rested) continue;
    if (instance.zone === "character" && instance.playedOnTurn === state.turnNumber && !getKeywords(state, id).has("rush")) {
      continue;
    }
    best = Math.max(best, getCardPower(state, id));
  }
  return best + 1000 * player.activeDon;
}
