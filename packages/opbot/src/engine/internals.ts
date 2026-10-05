/**
 * The only module that reaches into the vendored engine's internal files.
 * Everything else imports the public API from "@tcg/op-engine".
 *
 * The paths resolve to the same real files as "@tcg/op-engine" (pnpm links the
 * package to the vendored source), so module state such as the card registry
 * is shared, not duplicated.
 */
const ENGINE = "../../../../vendor/tcg-engines/submodules/one-piece/packages";

export {
  applyQueuedCommandMutation,
  privateChoicesForJoKenPo,
  rememberPrivateJoKenPoChoices,
} from "../../../../vendor/tcg-engines/submodules/one-piece/packages/engine/src/engine/commands.ts";
export {
  candidatePoolForTarget,
  selectionSatisfiesTotalConstraint,
} from "../../../../vendor/tcg-engines/submodules/one-piece/packages/engine/src/effects/targeting.ts";
// Read-only checks the engine runs before resolving an effect block, reused by
// the policy (agents/policy.ts) to skip plays whose effect would do nothing.
export { canPayCosts } from "../../../../vendor/tcg-engines/submodules/one-piece/packages/engine/src/effects/actions.ts";
export { evaluateConditions } from "../../../../vendor/tcg-engines/submodules/one-piece/packages/engine/src/effects/conditions.ts";
export { drainResolutionQueue } from "../../../../vendor/tcg-engines/submodules/one-piece/packages/engine/src/engine/queue.ts";
// The engine's own check of a Counter Step selection (Event costs, and their
// mandatory [Counter] activation costs such as DON!! −X), used to enumerate
// only counter subsets the engine accepts. `canAttackWith` and
// `legalAttackTargets` are the engine's attack rules (rested, first turn,
// Rush / Rush: Character, "cannot attack" effects), used by the policy to tell
// which cards can still attack this turn when it gives or returns DON!!.
export {
  canAttackWith,
  counterSelectionIsPayable,
  legalAttackTargets,
} from "../../../../vendor/tcg-engines/submodules/one-piece/packages/engine/src/battle.ts";
export {
  effectBlocksFor,
  effectBlocksForInstance,
  emitEvent,
  emitLog,
  getCardCounter,
  getCardCost,
  getCardForInstance,
  getCardPower,
  getKeywords,
} from "../../../../vendor/tcg-engines/submodules/one-piece/packages/engine/src/shared.ts";
export {
  allCards,
  getCard,
  hasCard,
  validateDeckForFormat,
} from "../../../../vendor/tcg-engines/submodules/one-piece/packages/cards/src/index.ts";

/** For diagnostics only. */
export const ENGINE_PACKAGES_DIR = ENGINE;
