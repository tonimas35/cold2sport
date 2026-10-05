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
 * 8. DON!! as a resource (option `tempo`, on by default; see the section
 *    "DON!! as a resource" below): which DON!! pay a DON!! −X, which card gets
 *    "give up to N DON!!", when a DON!! −X is worth the DON!! it costs next
 *    turn, and in which order DON!! −X Events, attacks and DON!! refills go.
 *    The heuristic spent DON!! on every optional DON!! −X, so ramp decks
 *    (Kaido OP17-058) never reached their 9–10 cost finishers, and gave the
 *    Enel OP15-058 Leader's 4 DON!! to a Character that could not attack.
 *
 * `enginePolicyCommand` keeps the previous rollout policy (engine heuristic
 * plus the first two fixes) as a baseline: `search:...,rollout=engine`; the
 * policy without override 8 is `policy:tempo=0` (rollouts: `rollout=policy0`).
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
  canAttackWith,
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
  legalAttackTargets,
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
  /**
   * The DON!! rules (override 8, "DON!! as a resource" below). Default true;
   * false (`policy:tempo=0`, rollouts `rollout=policy0`) restores the policy
   * exactly as it was before them, so the arena can compare the two.
   */
  readonly tempo?: boolean;
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
  return mainPhaseCommand(state, seat, context, options.tempo !== false);
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
    id: `${honest ? "policy-honest" : "policy"}${policyOptions.tempo === false ? ":tempo=0" : ""}`,
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
 *
 * With `tempo`, the DON!! rules C and D (below) also drop DON!! −X Events and
 * [Activate: Main] effects that cost DON!! the next turn needs, or that would
 * strip DON!! from a card that has yet to attack.
 */
function mainPhaseCommand(
  state: MatchState,
  seat: MatchSeat,
  context: { random: () => number },
  tempo: boolean,
): EngineCommand {
  let legal: LegalCommandDescriptor[] = getLegalCommands(state, seat).filter((d) => d.type !== "concede");
  // The tempo filter drops all refused Events at once, but it can still cost
  // two re-choices (an Event and an activation) on top of the useless plays.
  const retries = tempo ? MAX_MAIN_RETRIES + 2 : MAX_MAIN_RETRIES;
  for (let attempt = 0; attempt < retries; attempt++) {
    const command = heuristicAgent.choose(state, seat, legal, context) ?? { type: "endTurn", seat };
    const drop = uselessMainCommand(state, seat, command) ?? (tempo ? tempoMainCommand(state, seat, command) : null);
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
  const tempo = options.tempo !== false;
  return (
    battleBuffTarget(state, prompt) ??
    lifeTriggerChoice(state, prompt) ??
    optionalCostChoice(state, prompt) ??
    (tempo ? donCostTempoChoice(state, prompt) : null) ??
    (tempo ? donReturnOrder(state, prompt) : null) ??
    countChoice(state, prompt) ??
    actionChoice(state, prompt, rng, options) ??
    (tempo ? giveDonTarget(state, prompt) : null) ??
    targetSelection(state, prompt)
  );
}

function optionCommand(prompt: PromptState, optionId: string): EngineCommand {
  return { type: "resolvePrompt", seat: prompt.seat as MatchSeat, promptId: prompt.id, optionId };
}

function confirm(prompt: PromptState, accept: boolean): EngineCommand | null {
  // A disabled answer is rejected by the engine: e.g. "activate" on a [Trigger]
  // whose mandatory cost cannot be paid (8-3-1-3).
  const option = prompt.options.find(
    (o) =>
      o.enabled !== false &&
      (accept ? o.id === "yes" || o.id === "activate" : o.id === "no" || o.id === "skip"),
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
  // The follow-up prompts are answered by this same policy (same DON!! rules).
  const inner: PolicyOptions & { model: ValueModel } = {
    model,
    lookahead: false,
    ...(options.tempo === false && { tempo: false }),
  };
  let best: string | null = null;
  let bestValue = -Infinity;
  for (const option of enabled) {
    const value = lookaheadValue(state, optionCommand(prompt, option.id), chooser, inner, seed);
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
  options: PolicyOptions & { model: ValueModel },
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
      const reply = policyCommand(world, next.seat as MatchSeat, rng, options);
      if (!applyInPlace(world, reply)) return null;
    }
  } catch {
    return null;
  }
  return evaluate(options.model, world, perspective);
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

// ─────────────────────────────────────────────────────────────────────────────
// DON!! as a resource (override 8, option `tempo`)
// ─────────────────────────────────────────────────────────────────────────────
//
// DON!! cards are the game's mana and most of its attack power: each one given
// to a Leader or Character adds +1000 during our turn only, and the DON!! on
// our field when our turn starts (after the DON!! phase adds 2) are what that
// turn can spend. "DON!! −X" returns X of them to the DON!! deck. The engine
// heuristic treats them as free: it accepts every optional DON!! −X, pays it
// with active DON!! first (its resolver skips DON!! options and the harness
// fallback takes them in prompt order: active, rested, given) and gives "up to
// N DON!!" to its strongest card even when that card cannot attack. In the
// meta decks (diagnosis of 2026-10-05) Kaido OP17-058 paid its Leader's
// DON!! −1 in 160 of 160 chances and had 6.9 DON!! at its fifth turn instead
// of ~9, so its 9–10 cost finishers rarely came down; the Enel OP15-058
// Leader gave its 4 DON!! to a card that could attack in 53 of 173 prompts.
//
// A. Return order: rested DON!!, then DON!! given to cards that will not
//    attack again this turn, then DON!! given to cards that still will (or
//    are attacking now), active DON!! last.
// B. "Give up to N DON!! to 1 of your Leader or Characters" in our turn: to a
//    card that will still attack and reaches its target's power with them,
//    Double Attack first, then one that needs them to reach it, then the
//    strongest.
// C. Tempo: a DON!! −X we can refuse (an optional cost, a DON!! −X Event, an
//    [Activate: Main] with DON!! −X) is paid only when it does not lower the
//    DON!! on our field at the start of our next turn, counting what our
//    cards in play can still give back this turn. Exceptions: it makes an
//    attack on us fail, it adds Life while we have 2 or less, or we may win
//    this turn.
// D. Sequencing: a DON!! −X Event that would take DON!! from a card that has
//    yet to attack waits until after the attacks; DON!! −X Events go before an
//    [Activate: Main] that adds DON!! from the DON!! deck, which gives back
//    what they returned.
//
// Limits: next turn's DON!! count is the only currency of rule C. It does not
// weigh what the effect does (a DON!! −1 draw counts the same as a DON!! −1
// removal), nor what the returned DON!! could still do this turn (rule A pays
// with spent ones first), nor the turns after the next (for example the Enel
// Leader's refill next turn); the lethal check ignores counters and assumes
// that every attacker at or above the opponent's Leader's power can hit it.

/** A DON!! deck holds at most 10 cards (6 for the Enel OP15-058 Leader). */
const MAX_DON = 10;
/** DON!! our next DON!! phase adds. */
const DON_PHASE_DON = 2;

/** Prompts where `prompt.seat` picks which of its own DON!! return to the DON!! deck. */
const DON_RETURN_INTENTS = new Set(["effectCostReturnDon", "effectReturnDon", "effectOpponentReturnDon"]);
const DON_TOKEN = /^(active-don|rested-don|attached-don:.+):\d+$/;

/**
 * Triggers whose optional DON!! −X was decided before its prompt: when the
 * Event was played or the effect activated (rule C in the main phase), or by
 * the counter choice. Declining at the prompt would only waste the card.
 */
const COMMITTED_TRIGGERS = new Set(["main", "counter", "activateMain", "trigger"]);

function isOurAttackTurn(state: MatchState, seat: MatchSeat): boolean {
  return state.activeSeat === seat && (state.phase === "main" || state.phase === "battle");
}

/** Our card attacking in a battle that is not decided yet: DON!! on it still count. */
function isAttackingNow(state: MatchState, seat: MatchSeat, id: string): boolean {
  const battle = state.battle;
  return (
    !!battle && battle.attackerId === id && state.activeSeat === seat && battle.step !== "damage" && battle.step !== "complete"
  );
}

/** Whether our card can still declare an attack this turn (the engine's rules: rested, Rush, first turn, "cannot attack"). */
function canStillAttack(state: MatchState, seat: MatchSeat, id: string): boolean {
  const instance = state.cards[id];
  if (!instance || instance.controller !== seat || !isOurAttackTurn(state, seat)) return false;
  if (instance.zone !== "leader" && instance.zone !== "character") return false;
  return canAttackWith(state, seat, id) && legalAttackTargets(state, seat, id).length > 0;
}

/** DON!! given to this card still add power this turn. */
function attackStillToCome(state: MatchState, seat: MatchSeat, id: string): boolean {
  return isAttackingNow(state, seat, id) || canStillAttack(state, seat, id);
}

// A. Return order ─────────────────────────────────────────────────────────────

/** Rule A: lower ranks are returned first. */
function donReturnRank(state: MatchState, seat: MatchSeat, optionId: string): number {
  if (optionId.startsWith("rested-don:")) return 0;
  if (optionId.startsWith("attached-don:")) {
    const holder = optionId.slice("attached-don:".length, optionId.lastIndexOf(":"));
    return attackStillToCome(state, seat, holder) ? 2 : 1;
  }
  return optionId.startsWith("active-don:") ? 3 : 4;
}

/**
 * Rule A at DON!! −X payments and forced DON!! returns: rested DON!! are
 * spent already, DON!! on a card that will not attack again add nothing more
 * this turn, while active DON!! can still pay for cards or be given to an
 * attacker. Same number of DON!! as the fallback it replaces; only the order
 * changes.
 */
function donReturnOrder(state: MatchState, prompt: PromptState): EngineCommand | null {
  const intent = prompt.resolutionContext?.intent;
  if (prompt.choiceKind !== "costPayment" || !intent || !DON_RETURN_INTENTS.has(intent)) return null;
  const ids = prompt.options.map((o) => o.id);
  if (ids.length === 0 || !ids.every((id) => DON_TOKEN.test(id))) return null;
  const seat = prompt.seat as MatchSeat;
  const rank = new Map(ids.map((id) => [id, donReturnRank(state, seat, id)]));
  const ordered = [...ids].sort((a, b) => rank.get(a)! - rank.get(b)!); // stable: prompt order within a rank
  const count = Math.min(Math.max(prompt.minSelections, 1), ordered.length);
  return { type: "resolvePrompt", seat, promptId: prompt.id, selectedIds: ordered.slice(0, count) };
}

// B. Giving DON!! ─────────────────────────────────────────────────────────────

/**
 * The power our card has and must reach in the attack it still has to make
 * this turn: its battle's defender if it is attacking now, else the
 * opponent's Leader, else its weakest legal target. Null if it will not attack.
 */
function attackOutlook(
  state: MatchState,
  seat: MatchSeat,
  id: string,
): { power: number; needed: number; doubleAttack: boolean } | null {
  if (state.cards[id]?.controller !== seat) return null;
  let needed: number;
  const battle = state.battle;
  if (battle && isAttackingNow(state, seat, id)) {
    needed = getCardPower(state, battle.targetId) + battle.counterTotal;
  } else if (canStillAttack(state, seat, id)) {
    const leader = state.players[OTHER[seat]].leaderInstanceId;
    const targets = legalAttackTargets(state, seat, id);
    needed = targets.includes(leader) ? getCardPower(state, leader) : Math.min(...targets.map((t) => getCardPower(state, t)));
  } else {
    return null;
  }
  return { power: getCardPower(state, id), needed, doubleAttack: getKeywords(state, id).has("doubleAttack") };
}

/**
 * Rule B: "give up to N DON!! to 1 of your Leader or Characters" during our
 * turn (the Enel OP15-058 Leader, Brook ST01-011, Luffy ST21-014). Given DON!!
 * add power only during our turn, so they belong on a card that will still
 * attack (or is attacking now), preferably one that reaches its target's power
 * with them; among those, Double Attack first (2 damage), then one that needs
 * them to reach it (an extra hit rather than a bigger one), then the
 * strongest. The heuristic gives them to its strongest card, often the
 * Character just played. Off-turn, or when no card will attack, the heuristic
 * keeps the choice.
 */
function giveDonTarget(state: MatchState, prompt: PromptState): EngineCommand | null {
  const ctx = prompt.resolutionContext;
  if ((prompt.choiceKind !== "selectTargets" && prompt.choiceKind !== "selectCards") || ctx?.intent !== "effectTargetSelection") {
    return null;
  }
  const action = ctx.action as { action: string; count?: { amount?: number | "all" } };
  if (action.action !== "giveDon" || prompt.maxSelections !== 1) return null;
  const seat = prompt.seat as MatchSeat;
  if (!isOurAttackTurn(state, seat)) return null;
  const amount = typeof action.count?.amount === "number" ? action.count.amount : 1;
  const ranked = prompt.options
    .filter((o) => o.enabled !== false)
    .map((o) => o.targetId ?? o.id)
    .flatMap((id) => {
      const outlook = attackOutlook(state, seat, id);
      if (!outlook) return [];
      const reaches = outlook.power + 1000 * amount >= outlook.needed;
      const key = [
        reaches ? 1 : 0,
        reaches && outlook.doubleAttack ? 1 : 0,
        reaches && outlook.power < outlook.needed ? 1 : 0,
        outlook.power,
      ];
      return [{ id, key }];
    });
  if (ranked.length === 0) return null;
  ranked.sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return b.key[i]! - a.key[i]!;
    return 0;
  });
  return pick(state, prompt, ranked.map((r) => r.id));
}

// C. Tempo ────────────────────────────────────────────────────────────────────

/** X of a block's DON!! −X cost (the minimum for "DON!! −X or more"), 0 if it has none. */
function returnDonAmount(block: EffectBlock | undefined): number {
  const cost = block?.costs?.find((c) => c.cost === "returnDon") as { amount?: number; minimumAmount?: number } | undefined;
  return cost ? (cost.minimumAmount ?? cost.amount ?? 0) : 0;
}

/** DON!! on our field: active and rested in the cost area plus those given to our Leader and Characters. */
function donOnField(state: MatchState, seat: MatchSeat): number {
  const player = state.players[seat];
  let given = 0;
  for (const id of [player.leaderInstanceId, ...player.characterArea]) if (id) given += state.cards[id]?.attachedDon ?? 0;
  return player.activeDon + player.restedDon + given;
}

/** Blocks of `trigger` on our card that can still resolve this turn: not used up ([Once Per Turn]), conditions not failing. */
function liveBlocks(state: MatchState, seat: MatchSeat, sourceId: string, trigger: EffectBlock["trigger"]): EffectBlock[] {
  const source = state.cards[sourceId]!;
  return effectBlocksForInstance(state, sourceId, trigger).filter(
    (block, index) =>
      !(block.oncePerTurn && source.usedEffectKeys.includes(block.oncePerTurnKey ?? `${trigger}:${index}`)) &&
      !conditionsFail(state, seat, sourceId, block.conditions),
  );
}

/** DON!! that `actions` add from our own DON!! deck (an action whose condition fails adds none). */
function donAdded(state: MatchState, seat: MatchSeat, sourceId: string, actions: readonly EffectAction[]): number {
  let total = 0;
  for (const action of actions) {
    const a = action as { action: string; player?: string; count?: { amount?: number | "all" }; condition?: Condition };
    if (a.action !== "addDon" || (a.player !== undefined && a.player !== "self")) continue;
    if (a.condition && conditionsFail(state, seat, sourceId, [a.condition])) continue;
    total += typeof a.count?.amount === "number" ? a.count.amount : 0;
  }
  return total;
}

/**
 * DON!! that the unused [Activate: Main] effects of our card add from the
 * DON!! deck for good this turn: up to 5 for the Enel OP15-058 Leader, 2 for
 * King EB04-031. The policy activates them anyway (the heuristic uses every
 * [Activate: Main]). Effects that give the DON!! back at the end of the turn
 * (Black Maria OP08-074) or cost DON!! −X themselves are not refills.
 */
function refillOf(state: MatchState, seat: MatchSeat, sourceId: string): number {
  if (!isOurAttackTurn(state, seat) || !state.cards[sourceId]) return 0;
  let total = 0;
  for (const block of liveBlocks(state, seat, sourceId, "activateMain")) {
    if (containsAction(block.actions, "returnDon") || returnDonAmount(block) > 0) continue;
    if (block.costs?.length && !canPayCosts(state, seat, sourceId, block.costs, undefined)) continue;
    total += donAdded(state, seat, sourceId, block.actions);
  }
  return total;
}

interface DonRefunds {
  /** Unused "when a DON!! card on your field is returned to your DON!! deck, add ..." (Kaido OP17-062): only if we return some. */
  readonly onReturn: number;
  /** DON!! the unused [Activate: Main] refills add whether or not we return any (`refillOf`). */
  readonly refill: number;
}

function pendingDonRefunds(state: MatchState, seat: MatchSeat): DonRefunds {
  const player = state.players[seat];
  let onReturn = 0;
  let refill = 0;
  for (const id of [player.leaderInstanceId, ...player.characterArea, player.stageArea]) {
    if (!id || !state.cards[id]) continue;
    // OP17-062's conditions say [Your Turn]: nothing comes back during the opponent's turn.
    for (const block of liveBlocks(state, seat, id, "whenDonReturned")) onReturn += donAdded(state, seat, id, block.actions);
    refill += refillOf(state, seat, id);
  }
  return { onReturn, refill };
}

/**
 * DON!! on our field at the start of our next main phase if we return `x` now:
 * this turn's refunds, then the DON!! phase's +2, capped by the DON!! we own.
 */
function nextTurnDon(state: MatchState, seat: MatchSeat, x: number, refunds: DonRefunds): number {
  const field = donOnField(state, seat);
  const deck = state.players[seat].donDeckCount;
  const cap = Math.min(MAX_DON, field + deck);
  let f = field - x;
  let d = deck + x;
  if (x > 0) {
    const back = Math.min(refunds.onReturn, d);
    f += back;
    d -= back;
  }
  f += Math.min(refunds.refill, d);
  return Math.min(cap, f + DON_PHASE_DON);
}

/**
 * Rule C: how many DON!! fewer we start our next turn with if we pay DON!! −x
 * now. With f DON!! on the field and nothing to give them back, that is
 * min(cap, f + 2) − min(cap, f − x + 2), cap = min(10, f + DON!! deck): zero
 * only when the DON!! phase would have nothing to add anyway (Kaido at 9–10
 * DON!!, Enel's 6-card DON!! deck), or when a card of ours in play gives them
 * back this turn.
 */
export function donTempoLoss(state: MatchState, seat: MatchSeat, x: number): number {
  const refunds = pendingDonRefunds(state, seat);
  return nextTurnDon(state, seat, 0, refunds) - nextTurnDon(state, seat, x, refunds);
}

function baseCostOf(state: MatchState, id: string): number {
  return (getCard(state.cards[id]!.cardId) as { cost?: number }).cost ?? 0;
}

/**
 * Exception (i): during an attack on us, the block's power changes make the
 * attack fail (ties go to the attacker) on our Leader, or on a Character that
 * cost more than the DON!! paid; or the attack is lethal and they lower the
 * counters needed. The policy aims power cuts at the attacker and battle buffs
 * at the defender (powerCutOrder, battleBuffTarget), so being in the target
 * pool is enough.
 */
function turnsAttackAway(state: MatchState, seat: MatchSeat, sourceId: string, block: EffectBlock, x: number): boolean {
  const battle = state.battle;
  if (!battle || battle.defendingSeat !== seat || battle.step === "damage" || battle.step === "complete") return false;
  const attack = getCardPower(state, battle.attackerId);
  const defence = getCardPower(state, battle.targetId) + battle.counterTotal;
  if (attack < defence) return false;
  let swing = 0;
  for (const action of block.actions) {
    const a = action as { action: string; value?: number; target?: Target; previousActionTargets?: boolean; condition?: Condition };
    if (a.action !== "modifyPower" || !a.target || a.previousActionTargets) continue;
    if (a.condition && conditionsFail(state, seat, sourceId, [a.condition])) continue;
    const pool = candidatePoolForTarget(state, seat, sourceId, a.target);
    if (!pool.supported) continue;
    const value = a.value ?? 0;
    if (value < 0 && pool.candidateIds.includes(battle.attackerId)) swing -= value;
    else if (value > 0 && pool.candidateIds.includes(battle.targetId)) swing += value;
  }
  if (swing <= 0) return false;
  const me = state.players[seat];
  const onLeader = battle.targetId === me.leaderInstanceId;
  if (attack - swing < defence) return onLeader || baseCostOf(state, battle.targetId) > x;
  return onLeader && me.life.length === 0;
}

/** Exception (ii): the block adds a card to our own Life (Charlotte Linlin ST34-004, Lead Performers OP17-061). */
function addsOwnLife(state: MatchState, seat: MatchSeat, sourceId: string, block: EffectBlock): boolean {
  return block.actions.some((action) => {
    const a = action as { action: string; target?: Target; condition?: Condition };
    return (
      a.action === "addToLife" && a.target?.player === "self" && !(a.condition && conditionsFail(state, seat, sourceId, [a.condition]))
    );
  });
}

/**
 * Exception (iii), a cheap lethal check: our attacks still to come that reach
 * the opponent's Leader's power (Double Attack counts 2) outnumber their Life
 * plus their active [Blocker]s. Counters are ignored: next turn's DON!! only
 * matter if there is a next turn.
 */
function lethalWindow(state: MatchState, seat: MatchSeat): boolean {
  if (!isOurAttackTurn(state, seat)) return false;
  const opponent = state.players[OTHER[seat]];
  const leader = opponent.leaderInstanceId;
  const leaderPower = getCardPower(state, leader);
  const me = state.players[seat];
  let hits = 0;
  for (const id of [me.leaderInstanceId, ...me.characterArea]) {
    if (!id || getCardPower(state, id) < leaderPower) continue;
    const atLeader = isAttackingNow(state, seat, id)
      ? state.battle!.targetId === leader
      : canStillAttack(state, seat, id) && legalAttackTargets(state, seat, id).includes(leader);
    if (atLeader) hits += getKeywords(state, id).has("doubleAttack") ? 2 : 1;
  }
  const blockers = opponent.characterArea.filter(
    (id) => id && !state.cards[id]!.rested && getKeywords(state, id).has("blocker"),
  ).length;
  return hits >= opponent.life.length + 1 + blockers;
}

/** Rule C: whether paying DON!! −x for `blocks` (effects of `sourceId`) is worth it now. */
function donSpendAllowed(state: MatchState, seat: MatchSeat, x: number, sourceId: string, blocks: readonly EffectBlock[]): boolean {
  if (x <= 0 || donTempoLoss(state, seat, x) <= 0) return true;
  if (blocks.some((block) => turnsAttackAway(state, seat, sourceId, block, x))) return true;
  if (state.players[seat].life.length <= 2 && blocks.some((block) => addsOwnLife(state, seat, sourceId, block))) return true;
  return lethalWindow(state, seat);
}

/**
 * Rule C at "You may DON!! −X:" prompts of our own [On Play], [When
 * Attacking], [On Your Opponent's Attack]... effects: decline when the DON!!
 * are worth more next turn. It only ever declines; otherwise the earlier logic
 * decides. Kaido OP17-058 paid its Leader's DON!! −1 for −2000 on every attack.
 */
function donCostTempoChoice(state: MatchState, prompt: PromptState): EngineCommand | null {
  const ctx = prompt.resolutionContext;
  if (prompt.choiceKind !== "confirm" || ctx?.intent !== "effectOptional") return null;
  if (ctx.controller !== prompt.seat || !state.cards[ctx.sourceInstanceId] || COMMITTED_TRIGGERS.has(ctx.trigger)) return null;
  const block = effectBlocksForInstance(state, ctx.sourceInstanceId, ctx.trigger)[ctx.blockIndex];
  const x = returnDonAmount(block);
  if (!block || x === 0) return null;
  return donSpendAllowed(state, ctx.controller, x, ctx.sourceInstanceId, [block]) ? null : confirm(prompt, false);
}

// D. Sequencing (and rule C in the main phase) ───────────────────────────────

function isEvent(state: MatchState, id: string): boolean {
  return !!state.cards[id] && getCardForInstance(state, id).cardType === "event";
}

/** [Main] blocks of an Event that cost DON!! −X. */
function eventDonBlocks(state: MatchState, id: string): EffectBlock[] {
  return effectBlocksFor(getCardForInstance(state, id), "main").filter((block) => returnDonAmount(block) > 0);
}

/** Rule D(1): whether paying DON!! −x in rule A's order would take DON!! from a card that has yet to attack. */
function wouldStripAttacker(state: MatchState, seat: MatchSeat, x: number): boolean {
  const player = state.players[seat];
  let spare = player.restedDon;
  let holder = false;
  for (const id of [player.leaderInstanceId, ...player.characterArea]) {
    const given = id ? (state.cards[id]?.attachedDon ?? 0) : 0;
    if (given === 0) continue;
    if (attackStillToCome(state, seat, id!)) holder = true;
    else spare += given;
  }
  return holder && spare < x;
}

/**
 * Rules C and D(1) for playing a DON!! −X Event now. Its DON!! −X (optional or
 * not) is the reason to play it, so it is judged here, not at its prompt.
 * D(1) is checked after the Event's own cost is paid: the active DON!! that
 * pay it are rested by then and pay the DON!! −X first.
 */
function eventPlayAllowed(state: MatchState, seat: MatchSeat, id: string): boolean {
  const blocks = eventDonBlocks(state, id);
  if (blocks.length === 0) return true;
  const x = Math.max(...blocks.map(returnDonAmount));
  if (wouldStripAttacker(afterPayingEvent(state, seat, id), seat, x)) return false;
  return donSpendAllowed(state, seat, x, id, blocks);
}

/** Rules C and D(1) in the main phase: a filter for the descriptors to drop, or null. */
function tempoMainCommand(
  state: MatchState,
  seat: MatchSeat,
  command: EngineCommand,
): ((d: LegalCommandDescriptor) => boolean) | null {
  if (command.type === "playCard") {
    if (!isEvent(state, command.instanceId) || eventPlayAllowed(state, seat, command.instanceId)) return null;
    // Drop every Event refused now in one go, so that they cannot use up the
    // re-choices one card at a time.
    const refused = new Map<string, boolean>();
    return (d) => {
      if (d.type !== "playCard" || !d.sourceId || !isEvent(state, d.sourceId)) return false;
      const cardId = state.cards[d.sourceId]!.cardId;
      if (!refused.has(cardId)) refused.set(cardId, !eventPlayAllowed(state, seat, d.sourceId));
      return refused.get(cardId)!;
    };
  }
  if (command.type === "activateEffect") {
    const source = command.sourceInstanceId;
    if (!state.cards[source]) return null;
    const blocks = liveBlocks(state, seat, source, "activateMain");
    if (blocks.length === 0 || blocks.some((block) => returnDonAmount(block) === 0)) return null;
    const x = Math.max(...blocks.map(returnDonAmount));
    if (donSpendAllowed(state, seat, x, source, blocks)) return null;
    return (d) => d.type === "activateEffect" && d.sourceId === source;
  }
  return null;
}

// Rule D(2) needs no override of its own. The heuristic already plays Events
// (score 900+) before [Activate: Main] effects (750), and rule C counts an
// unused refill (`refillOf`) as DON!! that come straight back, so DON!! −X
// Events are allowed before the Enel OP15-058 Leader's refill; once it is used,
// the same rules judge them without it (at most the 2 DON!! the next DON!!
// phase gives back, and never with the DON!! it just gave to an attacker).
// In 48 Enel games no Event was held back past the refill by these rules: the
// only DON!! −X Events still in hand at that point were ones the heuristic
// keeps because the opponent had no Character to hit.
