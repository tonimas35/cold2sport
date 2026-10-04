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
export { selectionSatisfiesTotalConstraint } from "../../../../vendor/tcg-engines/submodules/one-piece/packages/engine/src/effects/targeting.ts";
export { drainResolutionQueue } from "../../../../vendor/tcg-engines/submodules/one-piece/packages/engine/src/engine/queue.ts";
export {
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
