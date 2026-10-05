/**
 * Messages between the page (main thread) and the game worker.
 *
 * The worker owns the authoritative game: the engine state, the bot, what each
 * side remembers and the record that `pnpm opbot review` reads. The page only
 * ever receives what the human (south) may see: the upstream board projection
 * (`projectStateForSeat` hides the bot's hand, both decks and the Life cards),
 * the human's legal moves and prompts, and the animation of each move. The
 * record (which contains every hidden card and the seed) is only sent once the
 * game is over.
 *
 * Everything here is plain data (structured-clone safe).
 */
import type {
  EngineCommand,
  LegalCommandDescriptor,
  PotentialCardCommandDescriptor,
} from "@tcg/op-engine";
import type { AnimationPlanV2 } from "@tcg/protocol/animations";
import type { GameRecord } from "@opbot/core/web";
import type { OnePieceStaticBoard } from "@upstream/one-piece/data/staticBoard.ts";

/** The human always sits south and the bot north, as in `pnpm opbot play`. */
export const HUMAN_SEAT = "south";
export const BOT_SEAT = "north";

export type BotLevel = "rapido" | "normal" | "fuerte";
export type FirstPlayerChoice = "human" | "bot" | "random";
export type Side = "human" | "bot";

/** A deck from the bundled catalog (`meta:<file>` or `test:<file>`) or a pasted list. */
export type DeckChoice =
  | { readonly kind: "catalog"; readonly id: string }
  | { readonly kind: "text"; readonly text: string; readonly name?: string };

export interface DeckOption {
  readonly id: string;
  readonly group: "meta" | "test";
  /** File name without `.txt`, as `pnpm opbot` names the deck. */
  readonly name: string;
  readonly leaderId: string;
  readonly leaderName: string;
  readonly leaderImageUrl: string | null;
  readonly colors: readonly string[];
  /** Share of the post-ban meta (0..1), meta decks only. */
  readonly share: number | null;
  readonly winRate: number | null;
  readonly source: string | null;
}

export interface DeckSummary {
  readonly name: string;
  readonly leaderId: string;
  readonly leaderName: string;
  readonly colors: readonly string[];
  readonly cards: number;
}

export interface DeckCheckResult {
  readonly ok: boolean;
  readonly deck: DeckSummary | null;
  /** Problems that make the list unplayable (parse errors, construction rules). */
  readonly errors: readonly string[];
  /** Playable, but worth knowing (not Standard-legal, not audited). */
  readonly warnings: readonly string[];
}

export interface LevelInfo {
  readonly id: BotLevel;
  readonly label: string;
  readonly agentSpec: string;
  readonly description: string;
}

export interface StartConfig {
  readonly human: DeckChoice;
  readonly bot: DeckChoice;
  readonly first: FirstPlayerChoice;
  readonly level: BotLevel;
  /** Fixed seed (tests, reproducing a game); a random one otherwise. */
  readonly seed?: string;
}

/** A card shown inside a prompt or a chooser. */
export interface CardView {
  readonly instanceId: string;
  readonly cardId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly owner: Side;
  readonly zone: string;
  readonly power: number | null;
  readonly cost: number | null;
  readonly counter: number | null;
  readonly rested: boolean;
}

export interface PromptOptionView {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly card: CardView | null;
  /** DON!! card options of cost payments ("active-don:0", "attached-don:<card>:1"...). */
  readonly don: "active" | "rested" | "attached" | null;
  /** The "skip" option of a selection prompt (no blocker): answered with an empty selection. */
  readonly skip: boolean;
}

export interface PromptView {
  readonly id: string;
  /**
   * How the page answers it: `choice` = pick one option (`optionId`),
   * `select` = pick between min and max options (`selectedIds`),
   * `order` = put every option in order (`selectedIds`).
   */
  readonly mode: "choice" | "select" | "order";
  readonly choiceKind: string | null;
  /** Engine intent (`battleCounter`, `battleBlocker`, `effectTargetSelection`...). */
  readonly intent: string;
  readonly label: string;
  readonly details: string;
  readonly min: number;
  readonly max: number;
  readonly options: readonly PromptOptionView[];
  readonly source: CardView | null;
}

export interface BattleView {
  readonly attacker: CardView;
  readonly target: CardView;
  readonly attackerPower: number;
  readonly targetPower: number;
  /** Counter power already added in this battle. */
  readonly counterTotal: number;
  readonly step: string;
  readonly humanDefends: boolean;
}

export interface MoveView {
  readonly by: Side | "system";
  /** What the human may read about the move: the engine's log lines visible to south. */
  readonly lines: readonly string[];
  /** Bot think time for this decision, in milliseconds. */
  readonly thinkMs: number | null;
  /** Options the bot chose from (1 = forced move, answered without thinking). */
  readonly options: number | null;
}

export interface ResultView {
  readonly winner: Side | null;
  readonly reason: string | null;
  readonly turns: number;
}

export interface GameView {
  /** Increases by one with every applied command. */
  readonly version: number;
  readonly board: OnePieceStaticBoard;
  /** Animation of the command that produced this view (null when there is nothing to animate). */
  readonly plan: AnimationPlanV2 | null;
  readonly status: "setup" | "active" | "finished";
  readonly turn: number;
  readonly phase: string;
  readonly activeSide: Side;
  /** Who has to decide now; null while nobody can (game over). */
  readonly acting: Side | null;
  /** The human's legal moves (descriptors), empty unless the human acts. */
  readonly legal: readonly LegalCommandDescriptor[];
  readonly cardActions: readonly PotentialCardCommandDescriptor[];
  readonly prompt: PromptView | null;
  readonly battle: BattleView | null;
  readonly humanActiveDon: number;
  readonly lastMove: MoveView | null;
  readonly result: ResultView | null;
}

export interface BotDecisionStat {
  readonly turn: number;
  readonly millis: number;
  /** Number of options the bot chose from (1 = forced, answered instantly). */
  readonly options: number;
}

export interface GameSummary {
  readonly humanDeck: DeckSummary;
  readonly botDeck: DeckSummary;
  readonly level: LevelInfo;
  readonly firstSide: Side;
  readonly seed: string;
}

export interface ReviewItem {
  readonly turn: number;
  readonly step: number;
  readonly options: number;
  readonly played: string;
  readonly playedWin: number;
  readonly best: string;
  readonly bestWin: number;
  readonly loss: number;
  readonly category: "best" | "good" | "inaccuracy" | "mistake" | "blunder";
}

export type ClientMessage =
  | { readonly type: "init" }
  | { readonly type: "checkDeck"; readonly requestId: number; readonly choice: DeckChoice }
  | { readonly type: "start"; readonly config: StartConfig }
  | { readonly type: "act"; readonly version: number; readonly command: EngineCommand }
  | { readonly type: "review"; readonly worlds: number }
  | { readonly type: "abandon" };

export type WorkerMessage =
  | { readonly type: "ready"; readonly decks: readonly DeckOption[]; readonly levels: readonly LevelInfo[] }
  | { readonly type: "deckChecked"; readonly requestId: number; readonly result: DeckCheckResult }
  | { readonly type: "started"; readonly summary: GameSummary }
  | { readonly type: "view"; readonly view: GameView }
  | { readonly type: "botThinking"; readonly thinking: boolean }
  | { readonly type: "rejected"; readonly reason: string }
  | {
      readonly type: "gameOver";
      readonly result: ResultView;
      readonly record: GameRecord;
      readonly botDecisions: readonly BotDecisionStat[];
    }
  | { readonly type: "reviewProgress"; readonly done: number; readonly total: number }
  | { readonly type: "reviewDone"; readonly items: readonly ReviewItem[] }
  | { readonly type: "error"; readonly message: string };
