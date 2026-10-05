/**
 * Browser entry of @opbot/core (`@opbot/core/web`), used by packages/web.
 *
 * Everything exported here runs in a browser or a Web Worker: no `node:*`
 * modules, no Bun APIs and no `import.meta.dir`. The command line keeps its
 * file-based helpers (agents/factory.ts, decks/pool.ts, ...), which wrap the
 * same code. test/web-entry.test.ts walks this module's imports and fails if a
 * Node-only dependency sneaks in.
 */
export { createAgentFromSpec, parseAgentSpec, type ModelLoader } from "./agents/spec.ts";
export type { Agent, DecisionRequest, DecisionStats } from "./agents/types.ts";
export { checkModel, HANDCRAFTED_MODEL, type ValueModel } from "./eval/value.ts";
export { Knowledge } from "./engine/knowledge.ts";
export { canSee, determinize } from "./engine/determinize.ts";
export {
  actingSeat,
  enumerateActions,
  pendingJudgePrompt,
  pendingPrompt,
  sameCommand,
  type Action,
} from "./engine/actions.ts";
export { getCard, getCardCounter, getCardPower, hasCard } from "./engine/internals.ts";
export { matchConfig, OTHER, type GameSpec } from "./arena/game.ts";
export {
  checkDeck,
  deckToText,
  engineTestDecks,
  parseDeckFile,
  parseDeckText,
  type DeckCheck,
  type DeckList,
} from "./decks/deck.ts";
export { checkStandardLegality, type LegalityCheck } from "./decks/legality.ts";
export { categorize, reviewGame, type Category, type GameRecord, type ReviewEntry } from "./analysis/review.ts";
export { describeAction } from "./analysis/analyze.ts";
export { cardName } from "./analysis/render.ts";
export { createRng, type Rng } from "./util/rng.ts";
