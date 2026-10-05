import type { ReplacementEffect } from "@tcg/op-types";

import {
  effectsAreNegated,
  getCardForInstance,
  getInstance,
  getPlayer,
  hasFlagModifier,
  otherSeat,
} from "../shared.ts";
import type { MatchSeat, MatchState } from "../types.ts";
import { evaluateConditions } from "./conditions.ts";
import { candidatePoolForTarget, matchesTargetFilter } from "./targeting.ts";

export interface KoReplacementCandidate {
  sourceInstanceId: string;
  controller: MatchSeat;
  replacementEffectIndex: number;
  effect: ReplacementEffect;
  effectKey: string;
}

export function replacementEffectKey(effect: ReplacementEffect, replacementEffectIndex: number) {
  return effect.oncePerTurnKey
    ? `replacement:${effect.oncePerTurnKey}`
    : `replacement:${effect.replacedEvent}:${replacementEffectIndex}`;
}

/** One replacement effect of one card instance. */
export interface ReplacementRef {
  sourceInstanceId: string;
  replacementEffectIndex: number;
}

/**
 * Identifies one replacement effect of one card instance within a single
 * removal. Two copies of the same card give different keys: each copy's
 * replacement is a separate replacement effect (8-1-3-4-2).
 */
export function replacementInstanceKey(replacement: ReplacementRef): string {
  return `${replacement.sourceInstanceId}#${replacement.replacementEffectIndex}`;
}

/**
 * Records that a replacement was applied, for [Once Per Turn]. The check is a
 * membership test, so one entry per key is enough; unlimited replacements
 * (e.g. OP17-095 Roronoa Zoro) would otherwise grow the list on every use.
 */
export function markReplacementUsed(
  state: MatchState,
  sourceInstanceId: string,
  effectKey: string,
) {
  const usedEffectKeys = getInstance(state, sourceInstanceId).usedEffectKeys;
  if (!usedEffectKeys.includes(effectKey)) {
    usedEffectKeys.push(effectKey);
  }
}

interface RemovalReplacementScope {
  /** Only this replacement is considered (does it also cover the target?). */
  only?: ReplacementRef;
  /**
   * replacementInstanceKey()s the affected player already declined for this
   * same removal. 8-1-3-4-1: a declined replacement is not applied, so it is
   * not offered again for another card the same effect removes at once.
   */
  declinedReplacementKeys?: readonly string[];
}

export function restActionCandidateIds(
  state: MatchState,
  controller: MatchSeat,
  sourceInstanceId: string,
  target: Extract<ReplacementEffect["replacementAction"], { action: "rest" }>["target"],
): string[] {
  const fieldZones = target.zones.filter((zone) => zone !== "costArea");
  const fieldCandidates =
    fieldZones.length === 0
      ? []
      : candidatePoolForTarget(state, controller, sourceInstanceId, {
          ...target,
          zones: fieldZones,
        }).candidateIds.filter(
          (instanceId) =>
            !getInstance(state, instanceId).rested &&
            !hasFlagModifier(state, instanceId, "cannotBeRested") &&
            (target.filters ?? []).every((filter) => {
              const result = matchesTargetFilter(state, sourceInstanceId, instanceId, filter);
              return result.supported && result.matches;
            }),
        );
  const seats =
    target.player === "both" || target.player === "any"
      ? ([controller, otherSeat(controller)] as const)
      : ([target.player === "self" ? controller : otherSeat(controller)] as const);
  const donCandidates = target.zones.includes("costArea")
    ? seats.flatMap((seat) =>
        Array.from(
          { length: getPlayer(state, seat).activeDon },
          (_, index) => `active-don:${seat}:${index}`,
        ),
      )
    : [];
  return [...fieldCandidates, ...donCandidates];
}

function replacementActionIsAvailable(
  state: MatchState,
  controller: MatchSeat,
  sourceInstanceId: string,
  action: ReplacementEffect["replacementAction"],
): boolean {
  const otherController = controller === "north" ? "south" : "north";
  switch (action.action) {
    case "sequence":
      return action.actions.every((nestedAction) =>
        replacementActionIsAvailable(state, controller, sourceInstanceId, nestedAction),
      );
    case "rest": {
      const hasFieldZone = action.target.zones.some((zone) => zone !== "costArea");
      if (action.target.zones.includes("costArea") && !hasFieldZone) {
        const seat = action.target.player === "self" ? controller : otherController;
        const required =
          action.target.count.amount === "all"
            ? getPlayer(state, seat).activeDon
            : action.target.count.amount;
        return action.target.count.upTo || getPlayer(state, seat).activeDon >= required;
      }
      const candidateIds = restActionCandidateIds(
        state,
        controller,
        sourceInstanceId,
        action.target,
      );
      const required =
        action.target.count.amount === "all" ? candidateIds.length : action.target.count.amount;
      return action.target.count.upTo || candidateIds.length >= required;
    }
    case "trashFromHand": {
      const seat = action.player === "self" ? controller : otherController;
      const eligible = getPlayer(state, seat).hand.filter((instanceId) =>
        (action.filters ?? []).every((filter) => {
          const result = matchesTargetFilter(state, sourceInstanceId, instanceId, filter);
          return result.supported && result.matches;
        }),
      );
      return action.amount === "all" || action.upTo || eligible.length >= action.amount;
    }
    case "turnLifeFaceUp": {
      const seat = action.player === "self" ? controller : otherController;
      const life = getPlayer(state, seat).life;
      const selected =
        action.position === "top"
          ? life.slice(0, action.count)
          : life.slice(Math.max(0, life.length - action.count));
      return (
        selected.length === action.count &&
        selected.every((instanceId) => !getInstance(state, instanceId).faceUp)
      );
    }
    case "removeFromLife": {
      const seat = action.player === "self" ? controller : otherController;
      const lifeCount = getPlayer(state, seat).life.length;
      if ("untilRemaining" in action.count) {
        return lifeCount >= action.count.untilRemaining;
      }
      return action.count.amount === "all" || action.count.upTo || lifeCount >= action.count.amount;
    }
    case "returnDon": {
      const seat = action.player === "self" ? controller : otherController;
      const player = getPlayer(state, seat);
      const attachedDon = [
        player.leaderInstanceId,
        ...player.characterArea.filter((instanceId): instanceId is string => Boolean(instanceId)),
      ].reduce((total, instanceId) => total + getInstance(state, instanceId).attachedDon, 0);
      return player.activeDon + player.restedDon + attachedDon >= action.amount;
    }
    case "returnToDeck":
    case "modifyPower": {
      const pool = candidatePoolForTarget(state, controller, sourceInstanceId, action.target);
      const required =
        action.target.count.amount === "all"
          ? pool.candidateIds.length
          : action.target.count.amount;
      return pool.supported && (action.target.count.upTo || pool.candidateIds.length >= required);
    }
    default:
      return true;
  }
}

function findRemovalReplacement(
  state: MatchState,
  targetId: string,
  effectController: MatchSeat,
  koCause: "battle" | "effect",
  replacedEvents: ReadonlySet<ReplacementEffect["replacedEvent"]>,
  effectSourceInstanceId?: string,
  scope: RemovalReplacementScope = {},
): KoReplacementCandidate | null {
  const target = getInstance(state, targetId);
  // K.O., rest and leave/removed-from-the-field events only happen to cards on
  // the field. The shared removal actions also move cards between other zones
  // (e.g. trash cards placed at the bottom of the deck to pay OP17-095's
  // replacement); such a card does not leave the field, so a self-referencing
  // "if this Character would leave the field" replacement printed on it (rule
  // 2-8-2: Character text only works in the Character area) must not apply.
  if (target.zone !== "character" && target.zone !== "stage" && target.zone !== "leader") {
    return null;
  }
  const targetController = target.controller;
  const player = getPlayer(state, targetController);
  const sourceIds = [
    targetId,
    player.leaderInstanceId,
    ...player.characterArea.filter(
      (instanceId): instanceId is string => Boolean(instanceId) && instanceId !== targetId,
    ),
    ...(player.stageArea ? [player.stageArea] : []),
  ];

  for (const sourceInstanceId of sourceIds) {
    if (
      (scope.only && scope.only.sourceInstanceId !== sourceInstanceId) ||
      effectsAreNegated(state, sourceInstanceId)
    ) {
      continue;
    }
    const source = getInstance(state, sourceInstanceId);
    const effects = getCardForInstance(state, sourceInstanceId).effects?.replacementEffects ?? [];
    for (const [replacementEffectIndex, effect] of effects.entries()) {
      if (
        (scope.only && scope.only.replacementEffectIndex !== replacementEffectIndex) ||
        scope.declinedReplacementKeys?.includes(
          replacementInstanceKey({ sourceInstanceId, replacementEffectIndex }),
        )
      ) {
        continue;
      }
      const effectKey = replacementEffectKey(effect, replacementEffectIndex);
      if (
        !replacedEvents.has(effect.replacedEvent) ||
        (effect.oncePerTurn && source.usedEffectKeys.includes(effectKey))
      ) {
        continue;
      }
      const conditions = evaluateConditions(
        state,
        source.controller,
        sourceInstanceId,
        effect.conditions,
      );
      if (!conditions.supported || !conditions.matches) {
        continue;
      }
      const playerMatches =
        !effect.eventFilter?.player ||
        effect.eventFilter.player === "any" ||
        (effect.eventFilter.player === "self" && targetController === source.controller) ||
        (effect.eventFilter.player === "opponent" && targetController !== source.controller);
      const causeMatches =
        !effect.eventFilter?.causedBy ||
        effect.eventFilter.causedBy === "any" ||
        (effect.eventFilter.causedBy === "self" && effectController === source.controller) ||
        (effect.eventFilter.causedBy === "opponent" && effectController !== source.controller);
      const koCauseMatches = !effect.eventFilter?.koCause || effect.eventFilter.koCause === koCause;
      const targetMatches = !effect.eventFilter?.targetSelf || targetId === sourceInstanceId;
      const structuredTargetMatches =
        !effect.target ||
        (() => {
          const pool = candidatePoolForTarget(
            state,
            source.controller,
            sourceInstanceId,
            effect.target,
          );
          return pool.supported && pool.candidateIds.includes(targetId);
        })();
      const structuredSourceMatches =
        !effect.source ||
        (effect.source === "battle" && koCause === "battle") ||
        (effect.source === "effect" && koCause === "effect") ||
        (effect.source === "opponentEffect" &&
          koCause === "effect" &&
          effectController !== source.controller) ||
        (effect.source === "opponentCharacterEffect" &&
          koCause === "effect" &&
          effectController !== source.controller &&
          Boolean(
            effectSourceInstanceId &&
            getCardForInstance(state, effectSourceInstanceId).cardType === "character",
          ));
      const filtersMatch = (effect.eventFilter?.filters ?? []).every((filter) => {
        const result = matchesTargetFilter(state, sourceInstanceId, targetId, filter);
        return result.supported && result.matches;
      });
      if (
        !playerMatches ||
        !causeMatches ||
        !koCauseMatches ||
        !targetMatches ||
        !structuredTargetMatches ||
        !structuredSourceMatches ||
        !filtersMatch
      ) {
        continue;
      }
      if (
        !replacementActionIsAvailable(
          state,
          source.controller,
          sourceInstanceId,
          effect.replacementAction,
        )
      ) {
        continue;
      }
      return {
        sourceInstanceId,
        controller: source.controller,
        replacementEffectIndex,
        effect,
        effectKey,
      };
    }
  }
  return null;
}

function koReplacedEvents(koCause: "battle" | "effect") {
  return new Set<ReplacementEffect["replacedEvent"]>(
    koCause === "effect" ? ["ko", "removeFromField", "leaveField"] : ["ko", "leaveField"],
  );
}

const REMOVE_FROM_FIELD_EVENTS = new Set<ReplacementEffect["replacedEvent"]>([
  "removeFromField",
  "leaveField",
]);

export function findKoReplacement(
  state: MatchState,
  targetId: string,
  effectController: MatchSeat,
  koCause: "battle" | "effect",
  effectSourceInstanceId?: string,
  declinedReplacementKeys?: readonly string[],
): KoReplacementCandidate | null {
  return findRemovalReplacement(
    state,
    targetId,
    effectController,
    koCause,
    koReplacedEvents(koCause),
    effectSourceInstanceId,
    { declinedReplacementKeys },
  );
}

/**
 * Whether this specific replacement would also replace the K.O. of targetId.
 * Used to group the cards one effect K.O.s at the same time: one application
 * of a replacement replaces the whole K.O. processing it covers (8-1-3-4-4).
 * It must ask about the chosen replacement itself, not about the first
 * replacement found for targetId, which may be another copy's (e.g. a
 * targeted OP17-095 Roronoa Zoro finds its own replacement first).
 */
export function koReplacementCovers(
  state: MatchState,
  replacement: ReplacementRef,
  targetId: string,
  effectController: MatchSeat,
  koCause: "battle" | "effect",
  effectSourceInstanceId?: string,
): boolean {
  return (
    findRemovalReplacement(
      state,
      targetId,
      effectController,
      koCause,
      koReplacedEvents(koCause),
      effectSourceInstanceId,
      { only: replacement },
    ) !== null
  );
}

export function findRemoveFromFieldReplacement(
  state: MatchState,
  targetId: string,
  effectController: MatchSeat,
  effectSourceInstanceId: string,
  declinedReplacementKeys?: readonly string[],
): KoReplacementCandidate | null {
  return findRemovalReplacement(
    state,
    targetId,
    effectController,
    "effect",
    REMOVE_FROM_FIELD_EVENTS,
    effectSourceInstanceId,
    { declinedReplacementKeys },
  );
}

/** koReplacementCovers() for the non-K.O. removal path (8-1-3-4-4). */
export function removeFromFieldReplacementCovers(
  state: MatchState,
  replacement: ReplacementRef,
  targetId: string,
  effectController: MatchSeat,
  effectSourceInstanceId: string,
): boolean {
  return (
    findRemovalReplacement(
      state,
      targetId,
      effectController,
      "effect",
      REMOVE_FROM_FIELD_EVENTS,
      effectSourceInstanceId,
      { only: replacement },
    ) !== null
  );
}

export function findRestReplacement(
  state: MatchState,
  targetId: string,
  effectController: MatchSeat,
  effectSourceInstanceId: string,
): KoReplacementCandidate | null {
  return findRemovalReplacement(
    state,
    targetId,
    effectController,
    "effect",
    new Set(["rested"]),
    effectSourceInstanceId,
  );
}
