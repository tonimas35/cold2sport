/**
 * One game against the bot: the authoritative engine state, the bot, what
 * each side remembers and the command log. It runs inside the game worker
 * (worker/game.worker.ts) and, unchanged, in the unit tests.
 *
 * It mirrors `pnpm opbot play` (packages/opbot/src/analysis/play.ts) so that
 * the record it produces is the same format and `pnpm opbot review --game`
 * replays it: same match config, same scripted setup (south wins Jo-Ken-Po
 * and picks the first player), the first player decides its mulligan first,
 * judge prompts are auto-resolved, and every command applied is logged.
 *
 * Commands go through the engine's official `applyCommand`: it returns the
 * animations the board plays, and a rejected command leaves the previous
 * state untouched (the rejected draft is discarded, CLAUDE.md rule 6).
 */
import {
  applyCommand,
  createMatch,
  type EngineCommand,
  type MatchSeat,
  type MatchState,
} from "@tcg/op-engine";
import {
  createAgentFromSpec,
  createRng,
  enumerateActions,
  HANDCRAFTED_MODEL,
  Knowledge,
  matchConfig,
  pendingJudgePrompt,
  type Agent,
  type DeckList,
  type GameRecord,
  type Rng,
  type ValueModel,
} from "@opbot/core/web";
import type { DeckCatalog } from "../decks/catalog.ts";
import { summarize } from "../decks/catalog.ts";
import { levelInfo } from "./levels.ts";
import {
  BOT_SEAT,
  HUMAN_SEAT,
  type BotDecisionStat,
  type GameSummary,
  type GameView,
  type LevelInfo,
  type MoveView,
  type ResultView,
  type Side,
  type StartConfig,
} from "./protocol.ts";
import { actingSide, animationPlan, buildView, resultView, visibleLogLines } from "./view.ts";

/** A bot that keeps deciding without ever handing the turn back is stuck (engine or agent bug). */
const MAX_BOT_STEPS_IN_A_ROW = 600;

export interface SessionDeps {
  readonly catalog: DeckCatalog;
  /** Default value model of the search levels (packages/opbot/models/value.json). */
  readonly model: ValueModel;
  readonly now?: () => number;
  readonly random?: () => number;
}

export type ActResult = { readonly accepted: true; readonly view: GameView } | { readonly accepted: false; readonly reason: string };

export class GameSession {
  readonly summary: GameSummary;
  readonly botDecisions: BotDecisionStat[] = [];
  private state: MatchState;
  private readonly knowledge = new Knowledge();
  private readonly log: EngineCommand[] = [];
  private readonly decks: Record<MatchSeat, DeckList>;
  private readonly level: LevelInfo;
  private readonly bot: Agent;
  private readonly rng: Rng;
  private readonly now: () => number;
  private version = 0;
  private logSequence = 0;
  private botStepsInARow = 0;
  private view: GameView;

  constructor(config: StartConfig, deps: SessionDeps) {
    const random = deps.random ?? Math.random;
    this.now = deps.now ?? (() => performance.now());
    const human = deps.catalog.resolve(config.human);
    const bot = deps.catalog.resolve(config.bot);
    if ("errors" in human) throw new Error(`Tu mazo no es válido: ${human.errors.join(" ")}`);
    if ("errors" in bot) throw new Error(`El mazo del bot no es válido: ${bot.errors.join(" ")}`);
    this.decks = { south: human.deck, north: bot.deck };
    this.level = levelInfo(config.level);
    const seed = config.seed ?? `web-${Date.now().toString(36)}-${Math.floor(random() * 2 ** 32).toString(36)}`;
    // A fixed seed replays the whole game, the random first player included.
    const coin = config.seed !== undefined ? createRng(`${seed}:first`).next() : random();
    const firstSeat: MatchSeat =
      config.first === "human" ? HUMAN_SEAT : config.first === "bot" ? BOT_SEAT : coin < 0.5 ? HUMAN_SEAT : BOT_SEAT;
    this.summary = {
      humanDeck: summarize(human.deck),
      botDeck: summarize(bot.deck),
      level: this.level,
      firstSide: firstSeat === HUMAN_SEAT ? "human" : "bot",
      seed,
    };
    // The bot's own default model: the search levels evaluate with the
    // trained value model, `policy-honest` keeps its handcrafted default.
    this.bot = createAgentFromSpec(this.level.agentSpec, (path) => {
      if (path === undefined) return deps.model;
      if (path === "handcrafted") return HANDCRAFTED_MODEL;
      throw new Error(`model files are not available in the browser: ${path}`);
    });
    if (!this.bot.honest) throw new Error(`refusing a bot that reads hidden information: ${this.bot.id}`);
    this.rng = createRng(`${seed}:bot`);

    this.state = createMatch(matchConfig({ seed, decks: this.decks, firstSeat }));
    this.logSequence = this.state.logSequence;
    // Scripted Jo-Ken-Po, as in the arena and `pnpm opbot play`: rock beats
    // scissors, so south wins and picks the requested first player.
    this.mustApply({ type: "chooseJoKenPo", seat: HUMAN_SEAT, choice: "rock" });
    this.mustApply({ type: "chooseJoKenPo", seat: BOT_SEAT, choice: "scissors" });
    this.mustApply({ type: "chooseFirstPlayer", seat: HUMAN_SEAT, firstPlayer: firstSeat });
    this.view = this.makeView(null, { by: "system", lines: this.takeLines(), thinkMs: null, options: null });
  }

  get currentView(): GameView {
    return this.view;
  }

  get isOver(): boolean {
    return this.state.status === "finished";
  }

  /** Something the human does not decide is pending: a bot decision, a judge prompt or the scripted start. */
  get botToAct(): boolean {
    if (this.state.status === "finished") return false;
    if (this.state.status === "active" && pendingJudgePrompt(this.state)) return true;
    return actingSide(this.state) === "bot";
  }

  /** The human's command. Rejected commands leave the game exactly as it was. */
  humanAct(command: EngineCommand): ActResult {
    if (this.isOver) return { accepted: false, reason: "La partida ha terminado." };
    if (command.seat !== HUMAN_SEAT) return { accepted: false, reason: "Solo puedes mover tus cartas." };
    // A player may concede at any point (1-2-3), also during the bot's turn.
    if (command.type !== "concede" && actingSide(this.state) !== "human") {
      return { accepted: false, reason: "Ahora no te toca decidir." };
    }
    const applied = this.apply(command);
    if (!applied.accepted) return { accepted: false, reason: applied.reason ?? "El motor no acepta esa jugada." };
    this.botStepsInARow = 0;
    this.view = this.makeView(applied.plan, { by: "human", lines: this.takeLines(), thinkMs: null, options: null });
    return { accepted: true, view: this.view };
  }

  /**
   * One automatic step: a judge prompt, the bot's mulligan, the scripted start
   * of the game or one bot decision. Call while `botToAct`.
   */
  botStep(): GameView {
    if (!this.botToAct) return this.view;
    if (++this.botStepsInARow > MAX_BOT_STEPS_IN_A_ROW) {
      throw new Error("El bot no termina su turno (posible error del motor); la partida se detiene.");
    }
    const state = this.state;
    const judge = state.status === "active" ? pendingJudgePrompt(state) : undefined;
    if (judge) {
      const applied = this.mustApply({ type: "judgeResolvePrompt", seat: "judge", promptId: judge.id, note: "auto" });
      return (this.view = this.makeView(applied.plan, { by: "system", lines: this.takeLines(), thinkMs: null, options: null }));
    }
    if (state.status === "setup") {
      if (!state.setup.mulliganDecided.north) {
        const started = this.now();
        const mulligan = this.bot.mulligan({ state, seat: BOT_SEAT, rng: this.rng, knowledge: this.knowledge.knownBy(BOT_SEAT) });
        const thinkMs = this.now() - started;
        const applied = this.mustApply(mulligan ? { type: "mulligan", seat: BOT_SEAT } : { type: "keepHand", seat: BOT_SEAT });
        return (this.view = this.makeView(applied.plan, { by: "bot", lines: this.takeLines(), thinkMs, options: 2 }));
      }
      const applied = this.mustApply({ type: "startGame", seat: state.config.firstPlayer });
      return (this.view = this.makeView(applied.plan, { by: "system", lines: this.takeLines(), thinkMs: null, options: null }));
    }

    const options = enumerateActions(state, BOT_SEAT).length;
    const started = this.now();
    const command = this.bot.decide({ state, seat: BOT_SEAT, rng: this.rng, knowledge: this.knowledge.knownBy(BOT_SEAT) });
    const thinkMs = this.now() - started;
    this.botDecisions.push({ turn: state.turnNumber, millis: thinkMs, options });
    let applied = this.apply(command);
    if (!applied.accepted) {
      // Same recovery as the arena (arena/game.ts): keep the game going with
      // the first legal action the engine accepts.
      for (const action of enumerateActions(state, BOT_SEAT)) {
        applied = this.apply(action.command);
        if (applied.accepted) break;
      }
      if (!applied.accepted) throw new Error(`El motor rechaza todas las jugadas del bot (${applied.reason ?? "sin motivo"}).`);
    }
    return (this.view = this.makeView(applied.plan, { by: "bot", lines: this.takeLines(), thinkMs, options }));
  }

  result(): ResultView | null {
    return resultView(this.state);
  }

  /** The same record `pnpm opbot play` writes (analysis/review.ts `GameRecord`). */
  record(): GameRecord {
    return {
      version: 1,
      date: new Date().toISOString(),
      seed: this.summary.seed,
      decks: this.decks,
      firstSeat: this.summary.firstSide === "human" ? HUMAN_SEAT : BOT_SEAT,
      players: { south: "human", north: this.level.agentSpec },
      commandLog: [...this.log],
      winner: this.state.status === "finished" ? this.state.winner : null,
    };
  }

  /** For tests: the true state (never sent to the page). */
  get trueState(): MatchState {
    return this.state;
  }

  get knownByHuman(): ReadonlyMap<string, string> {
    return this.knowledge.knownBy(HUMAN_SEAT);
  }

  private apply(command: EngineCommand): { accepted: boolean; reason: string | null; plan: GameView["plan"] } {
    let result: ReturnType<typeof applyCommand>;
    try {
      result = applyCommand(this.state, command);
    } catch (error) {
      // Unknown ids make the engine throw instead of rejecting.
      return { accepted: false, reason: error instanceof Error ? error.message : String(error), plan: null };
    }
    if (!result.accepted) return { accepted: false, reason: result.reason, plan: null };
    this.knowledge.observe(this.state, result.state, result.logs);
    this.state = result.state;
    this.log.push(command);
    this.version++;
    return { accepted: true, reason: null, plan: animationPlan(result.animations, this.version) };
  }

  private mustApply(command: EngineCommand) {
    const applied = this.apply(command);
    if (!applied.accepted) throw new Error(`setup command rejected: ${JSON.stringify(command)} (${applied.reason})`);
    return applied;
  }

  private takeLines(): string[] {
    const lines = visibleLogLines(this.state, this.logSequence);
    this.logSequence = this.state.logSequence;
    return lines;
  }

  private makeView(plan: GameView["plan"], lastMove: MoveView): GameView {
    return buildView(this.state, {
      version: this.version,
      plan,
      lastMove,
      botLabel: `Bot · ${this.level.label}`,
    });
  }
}

export function sideOf(seat: MatchSeat): Side {
  return seat === HUMAN_SEAT ? "human" : "bot";
}
