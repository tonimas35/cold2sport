import { attackHandTrashCost, canAttackWith, legalAttackTargets } from "../battle.ts";
import { canPayCosts, eventActivationCostsPayable } from "../effects/actions.ts";
import { evaluateConditions } from "../effects/conditions.ts";
import { isCardPlayRestricted } from "../effects/permanent.ts";
import {
  effectBlocksFor,
  effectBlocksForInstance,
  getCardCost,
  getCardForInstance,
  getInstance,
  getPlayer,
} from "../shared.ts";
import { getOpenCharacterSlots } from "../state.ts";
import type { MatchSeat, MatchState } from "../types.ts";
import { hasPendingNonJudgePrompt } from "./shared.ts";

/**
 * Single source of truth for command legality. Command handlers
 * (engine/commands.ts) call these predicates and reject with their reason;
 * the descriptor builder (engine/legal.ts) calls the same predicates to
 * include or exclude commands, so a command is projected as legal exactly
 * when the handler would accept it.
 */
export interface LegalityResult {
  ok: boolean;
  reason: string | null;
}

function allow(): LegalityResult {
  return { ok: true, reason: null };
}

function deny(reason: string): LegalityResult {
  return { ok: false, reason };
}

function isMainPhaseTurnOf(state: MatchState, seat: MatchSeat): boolean {
  return state.status === "active" && state.activeSeat === seat && state.phase === "main";
}

// 1-2-3: a player may concede at any point — during setup or while the game
// is active, in any phase, mid-battle, or mid-prompt. The only illegal moment
// is after the game has already finished.
export function canConcede(state: MatchState): LegalityResult {
  if (state.status === "finished") {
    return deny("The match is already finished.");
  }
  return allow();
}

export function canChooseFirstPlayer(state: MatchState, seat: MatchSeat): LegalityResult {
  if (state.status !== "setup" || state.setup.started) {
    return deny("The first turn can only be chosen during setup.");
  }
  if (state.setup.joKenPo.winner !== seat) {
    return deny("Only the Jo Ken Po winner can choose who takes the first turn.");
  }
  if (state.setup.joKenPo.firstPlayerDecided) {
    return deny("The first turn has already been chosen.");
  }
  return allow();
}

function canDecideOpeningHand(
  state: MatchState,
  seat: MatchSeat,
  setupReason: string,
): LegalityResult {
  if (state.status !== "setup" || state.setup.started) {
    return deny(setupReason);
  }
  if (!state.setup.joKenPo.firstPlayerDecided) {
    return deny("Resolve Jo Ken Po and choose the first player before mulligan.");
  }
  if (state.setup.mulliganDecided[seat]) {
    return deny("This player already made a mulligan choice.");
  }
  return allow();
}

export function canMulligan(state: MatchState, seat: MatchSeat): LegalityResult {
  return canDecideOpeningHand(state, seat, "Mulligan is only available during setup.");
}

export function canKeepHand(state: MatchState, seat: MatchSeat): LegalityResult {
  return canDecideOpeningHand(state, seat, "Opening hand choices are only available during setup.");
}

export function canStartGame(state: MatchState, seat: MatchSeat): LegalityResult {
  if (state.status !== "setup" || state.setup.started) {
    return deny("The match has already started.");
  }
  if (seat !== state.config.firstPlayer) {
    return deny("Only the first player can start the match in this draft.");
  }
  if (!state.setup.mulliganDecided.north || !state.setup.mulliganDecided.south) {
    return deny("Both players must choose whether to take a mulligan before starting.");
  }
  return allow();
}

export function canEndTurn(state: MatchState, seat: MatchSeat): LegalityResult {
  if (!isMainPhaseTurnOf(state, seat)) {
    return deny("It is not this player's turn.");
  }
  if (hasPendingNonJudgePrompt(state)) {
    return deny("Resolve pending prompts before ending the turn.");
  }
  return allow();
}

/**
 * Playing an Event from hand is paying its cost and activating its [Main]
 * effect (4-7-1, 6-5-3-1, 8-4-1), and an activation cost that cannot be paid
 * in full cannot be paid at all, so that effect cannot be activated (8-3-1-3).
 * An Event whose mandatory [Main] activation cost cannot be paid -- e.g.
 * "DON!! −X" (8-3-1-6, 10-2-10) with fewer than X DON!! cards on the field --
 * therefore cannot be played (4-7-2). A cost the text makes optional ("You
 * may ...:", blocks marked `optional`) can be declined (8-3-1-4), so it does
 * not block the play; the resolver then skips that block.
 *
 * The costs are checked against the state they are paid from: the playCard
 * handler first rests the Event's own cost and moves the card from the hand
 * to the trash, then resolves the [Main] blocks. Checking the current state
 * instead would let the Event's cost DON!! or the Event itself pay for it.
 */
function eventMainCostsPayable(
  state: MatchState,
  seat: MatchSeat,
  instanceId: string,
  cardCost: number,
): boolean {
  return eventActivationCostsPayable(state, seat, "main", [instanceId], {
    cardCost,
    destination: "trash",
  });
}

export function canPlayCard(
  state: MatchState,
  seat: MatchSeat,
  instanceId: string,
  slotIndex?: number,
): LegalityResult {
  if (!isMainPhaseTurnOf(state, seat)) {
    return deny("Cards can only be played during your main phase.");
  }
  const instance = getInstance(state, instanceId);
  if (instance.controller !== seat || instance.zone !== "hand") {
    return deny("The selected card is not in the active player's hand.");
  }
  if (isCardPlayRestricted(state, seat, instanceId, "hand")) {
    return deny("A card effect prevents this card from being played.");
  }
  const card = getCardForInstance(state, instanceId);
  const cardCost = card.cardType === "leader" ? 0 : getCardCost(state, instanceId);
  if (getPlayer(state, seat).activeDon < cardCost) {
    return deny("Not enough active DON!! to pay the cost.");
  }
  if (card.cardType === "character") {
    const openSlots = getOpenCharacterSlots(state, seat);
    const resolvedSlot = slotIndex ?? openSlots[0];
    if (resolvedSlot === undefined || !openSlots.includes(resolvedSlot)) {
      if (openSlots.length > 0) {
        return deny("A valid character slot is required.");
      }
      // 3-7-6-1: with a full Character area, the play proceeds through the
      // replacement prompt, so the command itself is legal.
      return allow();
    }
    return allow();
  }
  if (card.cardType === "event" && !effectBlocksFor(card, "main").length) {
    return deny("This event does not have a playable [Main] effect.");
  }
  if (card.cardType === "event" && !eventMainCostsPayable(state, seat, instanceId, cardCost)) {
    return deny("The [Main] activation cost cannot be paid.");
  }
  if (card.cardType === "leader") {
    return deny("Leaders cannot be played from hand.");
  }
  return allow();
}

export function canAttachDon(
  state: MatchState,
  seat: MatchSeat,
  targetId: string,
  amount = 1,
): LegalityResult {
  if (!isMainPhaseTurnOf(state, seat)) {
    return deny("DON!! can only be attached during your main phase.");
  }
  if (getPlayer(state, seat).activeDon < amount) {
    return deny("Not enough active DON!! to attach.");
  }
  const target = getInstance(state, targetId);
  if (target.controller !== seat || (target.zone !== "leader" && target.zone !== "character")) {
    return deny("DON!! can only be attached to your leader or characters.");
  }
  return allow();
}

export function canDeclareAttack(
  state: MatchState,
  seat: MatchSeat,
  attackerId: string,
  targetId?: string,
): LegalityResult {
  if (!isMainPhaseTurnOf(state, seat)) {
    return deny("Attacks can only be declared during your main phase.");
  }
  if (!canAttackWith(state, seat, attackerId)) {
    return deny("The selected attacker cannot attack.");
  }
  if (targetId !== undefined && !legalAttackTargets(state, seat, attackerId).includes(targetId)) {
    return deny("The selected target cannot be attacked.");
  }
  const handTrashAmount = attackHandTrashCost(state, attackerId);
  if (getPlayer(state, seat).hand.length < handTrashAmount) {
    return deny(`The attack requires trashing ${handTrashAmount} card(s) from hand.`);
  }
  return allow();
}

export function canActivateEffect(
  state: MatchState,
  seat: MatchSeat,
  sourceInstanceId: string,
  trigger: "activateMain" | "main",
  trashHandIds?: string[],
): LegalityResult {
  if (!isMainPhaseTurnOf(state, seat)) {
    return deny("Effects can only be activated during your main phase.");
  }
  const source = getInstance(state, sourceInstanceId);
  if (source.controller !== seat || !["leader", "character", "stage"].includes(source.zone)) {
    return deny("The selected source is not controllable from the field.");
  }
  const activationBlocks = effectBlocksForInstance(state, sourceInstanceId, trigger);
  if (!activationBlocks.length) {
    return deny("This card does not have that activation timing.");
  }
  const unusedActivationBlocks = activationBlocks.filter(
    (block, index) =>
      !block.oncePerTurn ||
      !source.usedEffectKeys.includes(block.oncePerTurnKey ?? `${trigger}:${index}`),
  );
  if (!unusedActivationBlocks.length) {
    return deny("This effect has already been used this turn.");
  }
  const conditionEligibleActivationBlocks = unusedActivationBlocks.filter((block) => {
    const conditions = evaluateConditions(state, seat, sourceInstanceId, block.conditions);
    return !conditions.supported || conditions.matches;
  });
  if (!conditionEligibleActivationBlocks.length) {
    return deny("The activation conditions are not met.");
  }
  if (
    !conditionEligibleActivationBlocks.some((block) =>
      canPayCosts(state, seat, sourceInstanceId, block.costs, trashHandIds),
    )
  ) {
    return deny("The activation costs cannot be paid.");
  }
  return allow();
}
