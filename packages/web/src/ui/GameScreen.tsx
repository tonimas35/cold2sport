/**
 * The game: the upstream board (animated with the upstream animation runtime)
 * fed by the game worker's views, plus our panels for prompts, attack targets,
 * DON!!, the bot's status and the end of the game.
 *
 * The animation scope's state is a whole `GameView`: every view from the
 * worker is queued with its animation plan, the board shows the presentation
 * state, and the human can only act once the queue has caught up with the
 * newest view (`settled`). Commands are sent with the version they answer, so
 * a late tap can never apply to a newer position.
 */
import type { EngineCommand, LegalCommandDescriptor } from "@tcg/op-engine";
import type { SimulatorEntity } from "@tcg/simulator-contract";
import {
  AnimationInteractionBoundary,
  createSimulatorAnimationScope,
  DefaultSimulatorEntityVisual,
  type SimulatorAnimationProjection,
} from "@tcg/simulator-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { attachDonCommand, attackCommand, boardDescriptors, fromDescriptor, type PendingChoice } from "../game/commands.ts";
import type { BotDecisionStat, GameSummary, GameView, ResultView } from "../game/protocol.ts";
import type { GameRecord } from "@opbot/core/web";
import type { GameClient } from "../worker/client.ts";
import { ChoicePanel } from "./ChoicePanel.tsx";
import type { FeedStart, GameFeed } from "./feed.ts";
import { GameOverPanel, type ReviewState } from "./GameOverPanel.tsx";
import { GameShell } from "./GameShell.tsx";
import { MovesPanel, mainMoves } from "./MovesPanel.tsx";
import { MulliganPanel } from "./MulliganPanel.tsx";
import { PromptPanel } from "./PromptPanel.tsx";
import { useSettings } from "./settings.tsx";
import classes from "./panels.module.css";

const GameAnimation = createSimulatorAnimationScope<GameView>();

/** Worlds per decision of the in-browser review (the CLI default is 32). */
const REVIEW_WORLDS = 8;

/**
 * Bot decision times of this page's games, for the end-to-end tests and the
 * curious (`window.__opbotStats` in the console). No hidden information.
 */
interface OpbotStats {
  bot: Array<{ turn: number; ms: number; options: number | null }>;
}
function stats(): OpbotStats {
  const holder = window as unknown as { __opbotStats?: OpbotStats };
  holder.__opbotStats ??= { bot: [] };
  return holder.__opbotStats;
}

function hiddenEntity(entityId: string): SimulatorEntity {
  return {
    id: entityId,
    title: "Carta oculta",
    subtitle: "Carta oculta",
    kind: "card",
    ownerId: entityId.startsWith("player-") ? "player" : "opponent",
    face: "hidden",
    states: ["hidden"],
    stats: [],
    traits: [],
  };
}

export interface ExitOptions {
  readonly restartWorker: boolean;
}

export function GameScreen({
  client,
  feed,
  start,
  onExit,
  onRematch,
}: {
  readonly client: GameClient;
  readonly feed: GameFeed;
  readonly start: FeedStart;
  readonly onExit: (options: ExitOptions) => void;
  readonly onRematch: (options: ExitOptions) => void;
}) {
  const { settings } = useSettings();
  const projection = useMemo<SimulatorAnimationProjection<GameView>>(
    () => ({
      getEntity: (view, entityId) => view.board.entities.find((e) => e.id === entityId) ?? hiddenEntity(entityId),
      getZone: (view, ref) => view.board.table.zones.find((z) => z.id === ref.id) ?? null,
    }),
    [],
  );
  return (
    <GameAnimation.Root
      sessionKey={`opbot:${start.summary.seed}`}
      initialState={start.firstView}
      initialVersion={start.firstView.version}
      projection={projection}
      entityRenderer={DefaultSimulatorEntityVisual}
      viewerSeatId="player"
      animationSpeed={settings.animationSpeed}
    >
      <GameTable client={client} feed={feed} summary={start.summary} onExit={onExit} onRematch={onRematch} />
    </GameAnimation.Root>
  );
}

interface Over {
  readonly result: ResultView;
  readonly record: GameRecord;
  readonly botDecisions: readonly BotDecisionStat[];
}

function GameTable({
  client,
  feed,
  summary,
  onExit,
  onRematch,
}: {
  readonly client: GameClient;
  readonly feed: GameFeed;
  readonly summary: GameSummary;
  readonly onExit: (options: ExitOptions) => void;
  readonly onRematch: (options: ExitOptions) => void;
}) {
  const snapshot = GameAnimation.useState();
  const { enqueue } = GameAnimation.useActions();
  const gate = GameAnimation.useCommandGate();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [choice, setChoice] = useState<PendingChoice | null>(null);
  const [thinking, setThinking] = useState(false);
  const [over, setOver] = useState<Over | null>(null);
  const [overClosed, setOverClosed] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [movesOpen, setMovesOpen] = useState(false);

  useEffect(
    () =>
      feed.connect((message) => {
        switch (message.type) {
          case "view":
            if (message.view.lastMove?.by === "bot" && message.view.lastMove.thinkMs !== null) {
              stats().bot.push({ turn: message.view.turn, ms: message.view.lastMove.thinkMs, options: message.view.lastMove.options });
            }
            enqueue({ state: message.view, version: message.view.version, plan: message.view.plan, source: "local" });
            setPending(false);
            break;
          case "botThinking":
            setThinking(message.thinking);
            break;
          case "rejected":
            setPending(false);
            setNotice(message.reason);
            break;
          case "gameOver":
            setOver({ result: message.result, record: message.record, botDecisions: message.botDecisions });
            break;
          case "reviewProgress":
            setReview((current) => (current && !current.items ? { ...current, done: message.done, total: message.total } : current));
            break;
          case "reviewDone":
            setReview((current) => ({ worlds: current?.worlds ?? REVIEW_WORLDS, done: message.items.length, total: message.items.length, items: message.items }));
            break;
          case "error":
            setPending(false);
            setError(message.message);
            break;
          default:
            break;
        }
      }),
    [feed, enqueue],
  );

  const latest = snapshot.authoritativeState!;
  const shown = snapshot.presentationState ?? latest;
  const settled = !gate.isBlocked && snapshot.queuedTransitions.length === 0 && shown.version === latest.version;
  const humanTurn = settled && latest.acting === "human" && !pending && !over && !error;
  const reviewRunning = review !== null && review.items === null;

  // Expose a few facts for the end-to-end tests and for curious players (no hidden information).
  useEffect(() => {
    const data = document.documentElement.dataset;
    data.opbotVersion = String(latest.version);
    data.opbotTurn = humanTurn ? "human" : "wait";
    data.opbotTurnNumber = String(latest.turn);
    data.opbotStatus = over && settled ? "over" : latest.status;
  }, [latest.version, latest.turn, latest.status, humanTurn, over, settled]);

  const send = useCallback(
    (command: EngineCommand) => {
      setNotice(null);
      setChoice(null);
      setMovesOpen(false);
      setPending(true);
      client.send({ type: "act", version: latest.version, command });
    },
    [client, latest.version],
  );

  const onAction = useCallback(
    (descriptor: LegalCommandDescriptor) => {
      if (descriptor.type === "concede") {
        if (!over) send({ type: "concede", seat: "south" });
        return;
      }
      if (!humanTurn) return;
      const outcome = fromDescriptor(descriptor, latest.humanActiveDon);
      if (outcome.kind === "command") send(outcome.command);
      else if (outcome.kind === "choose") setChoice(outcome.choice);
    },
    [humanTurn, latest.humanActiveDon, over, send],
  );

  const legal = humanTurn ? latest.legal : [];
  // The opening-hand decision is our panel (Spanish, both layouts); the board
  // only renders the main-phase move buttons.
  const boardActions = boardDescriptors(legal).filter((d) => d.type !== "mulligan" && d.type !== "keepHand");
  const moves = latest.prompt ? [] : mainMoves(legal);
  const mulligan = humanTurn && latest.status === "setup" && legal.some((d) => d.type === "keepHand");
  const concede: LegalCommandDescriptor = { type: "concede", seat: "south", label: "Concede the game" };
  const dockActions = [
    ...legal.filter((d) => d.type === "endTurn"),
    ...(latest.status !== "finished" && !over && !error ? [concede] : []),
  ];
  const cardActions = humanTurn && !latest.prompt ? latest.cardActions : [];

  const botBusy = !over && (thinking || latest.acting === "bot" || (!settled && shown.lastMove?.by === "bot"));
  // Short: it shares the phone's bottom rail with two buttons.
  const statusText = over
    ? "Fin"
    : error
      ? "Error"
      : pending
        ? "…"
        : botBusy
          ? thinking
            ? "Bot piensa"
            : "Bot juega"
          : humanTurn
            ? latest.prompt
              ? "Decide"
              : latest.status === "setup"
                ? "Mulligan"
                : "Tu turno"
            : "…";

  const botLines = shown.lastMove?.by === "bot" ? shown.lastMove.lines.slice(-3) : [];
  const [tickerVisible, setTickerVisible] = useState(true);
  useEffect(() => {
    setTickerVisible(true);
    const timer = window.setTimeout(() => setTickerVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [shown.version]);

  const exit = () => onExit({ restartWorker: reviewRunning });
  const menu = <ExitButton onExit={exit} />;
  const botStatus = (
    <span data-testid="bot-status">
      {thinking ? "Pensando…" : botBusy ? "Juega su turno" : "Esperando"} · {summary.level.label}
    </span>
  );

  return (
    <AnimationInteractionBoundary active={gate.isBlocked}>
      <GameShell
        board={shown.board}
        summary={summary}
        boardActions={boardActions}
        dockActions={dockActions}
        cardActions={cardActions}
        onAction={onAction}
        movesCount={moves.length}
        onShowMoves={() => setMovesOpen(true)}
        statusText={statusText}
        botStatus={botStatus}
        menu={menu}
      >
        <div className={classes.status}>
          {botBusy ? (
            <span className={classes.pill} data-testid="bot-thinking">
              {thinking ? <span className={classes.spinner} aria-hidden="true" /> : null}
              {thinking ? "El bot piensa…" : "Turno del bot"}
            </span>
          ) : null}
          {botLines.length && tickerVisible ? (
            <div className={classes.ticker} data-testid="bot-move">
              {botLines.map((line, index) => (
                <span key={`${shown.version}-${index}`}>{line}</span>
              ))}
            </div>
          ) : null}
        </div>
        {mulligan ? (
          <MulliganPanel
            board={latest.board}
            firstSide={summary.firstSide}
            busy={pending}
            onKeep={() => send({ type: "keepHand", seat: "south" })}
            onMulligan={() => send({ type: "mulligan", seat: "south" })}
          />
        ) : null}
        {humanTurn && movesOpen && !choice && !latest.prompt && !mulligan ? (
          <MovesPanel
            moves={moves}
            entities={latest.board.entities}
            onMove={(descriptor) => {
              setMovesOpen(false);
              onAction(descriptor);
            }}
            onClose={() => setMovesOpen(false)}
          />
        ) : null}
        {humanTurn && latest.prompt ? (
          <PromptPanel key={latest.version} prompt={latest.prompt} battle={latest.battle} busy={pending} notice={notice} onAnswer={send} />
        ) : null}
        {humanTurn && !latest.prompt && choice ? (
          <ChoicePanel
            choice={choice}
            entities={latest.board.entities}
            busy={pending}
            onAttack={(attackerId, targetId) => send(attackCommand(attackerId, targetId))}
            onDon={(targetId, amount) => send(attachDonCommand(targetId, amount))}
            onCancel={() => setChoice(null)}
          />
        ) : null}
        {notice && !latest.prompt && humanTurn ? (
          <p className={classes.notice} style={{ position: "absolute", left: 12, bottom: 90 }} role="alert">
            {notice}
          </p>
        ) : null}
        {error ? (
          <div className={classes.scrim} data-testid="game-error">
            <section className={classes.result} role="alertdialog" aria-label="Error">
              <h2>Algo ha fallado</h2>
              <p className={classes.muted}>{error}</p>
              <div className={classes.resultActions}>
                <button type="button" className={classes.primary} onClick={() => onExit({ restartWorker: true })}>
                  Volver al menú
                </button>
              </div>
            </section>
          </div>
        ) : null}
        {over && settled && !overClosed ? (
          <GameOverPanel
            result={over.result}
            record={over.record}
            summary={summary}
            botDecisions={over.botDecisions}
            review={review}
            onReview={() => {
              setReview({ done: 0, total: 0, items: null, worlds: REVIEW_WORLDS });
              client.send({ type: "review", worlds: REVIEW_WORLDS });
            }}
            onRematch={() => onRematch({ restartWorker: reviewRunning })}
            onNewGame={exit}
            onClose={() => setOverClosed(true)}
          />
        ) : null}
        {over && settled && overClosed ? (
          <button type="button" className={classes.collapsed} onClick={() => setOverClosed(false)} data-testid="show-result">
            Ver el resultado
          </button>
        ) : null}
      </GameShell>
    </AnimationInteractionBoundary>
  );
}

function ExitButton({ onExit }: { readonly onExit: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className={classes.exit} onClick={() => setConfirming(true)} data-testid="leave-game">
        Salir
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <button type="button" className={classes.danger} onClick={onExit} data-testid="leave-confirm">
        Salir de la partida
      </button>
      <button type="button" className={classes.button} onClick={() => setConfirming(false)}>
        No
      </button>
    </span>
  );
}
