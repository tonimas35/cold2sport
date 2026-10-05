/**
 * Desktop sidebar, phone activity drawer and the "end turn / concede" dock.
 *
 * Adapted from the upstream OnePieceSidebar (MIT, vendor/tcg-engines/
 * submodules/agnostic-simulator/apps/multi-game-simulator/src/games/one-piece/
 * components/OnePieceSidebar.tsx). Changes: Spanish labels; the participant
 * menu and the sound control talk to the hosted platform (account settings,
 * support, sound packs), so they are replaced by our bot status and options;
 * no "undo" (the engine has none for a live game).
 */
import type { LegalCommandDescriptor } from "@tcg/op-engine";
import {
  EventLogPanel,
  SimulatorActivityTabs,
  SimulatorMatchActionDock,
  SimulatorMatchSidebar,
  type SimulatorMatchActivity,
  type SimulatorMatchParticipant,
} from "@tcg/simulator-ui";
import classes from "@upstream/one-piece/components/OnePieceTabletopBoard.module.css";
import type { OnePieceStaticBoard } from "@upstream/one-piece/data/staticBoard.ts";
import { useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GameSummary } from "../game/protocol.ts";
import { useSettings } from "./settings.tsx";

export function GameSidebar({
  board,
  summary,
  actions,
  onAction,
  botStatus,
  menu,
}: {
  readonly board: OnePieceStaticBoard;
  readonly summary: GameSummary;
  readonly actions: readonly LegalCommandDescriptor[];
  readonly onAction: (descriptor: LegalCommandDescriptor) => void;
  readonly botStatus: ReactNode;
  readonly menu: ReactNode;
}) {
  const match = useMatchActions(actions, onAction);
  return (
    <>
      <SimulatorMatchSidebar
        className={classes.matchSidebar}
        data-testid="one-piece-sidebar"
        opponent={toParticipant(board, "opponent", `${summary.botDeck.leaderName} · ${summary.level.label}`)}
        self={{ ...toParticipant(board, "player", summary.humanDeck.leaderName), actions: menu }}
        automation={{ summary: botStatus, details: <p>{summary.level.description}</p>, label: "Bot" }}
        activity={activity(board)}
        activityLabel="Actividad"
        actions={match.actions}
      />
      {match.confirmation}
    </>
  );
}

export function MobileActivity({
  board,
  menu,
  botStatus,
  dock,
}: {
  readonly board: OnePieceStaticBoard;
  readonly menu: ReactNode;
  readonly botStatus: ReactNode;
  readonly dock: ReactNode;
}) {
  return (
    <div className={classes.mobileActivityPanel}>
      <header>
        <strong>One Piece TCG</strong>
        <span>
          Turno {board.table.status.turn} · {board.table.status.phase}
        </span>
      </header>
      <p style={{ margin: "4px 0" }}>Bot: {botStatus}</p>
      {dock}
      {menu}
      <SimulatorActivityTabs {...activity(board)} />
    </div>
  );
}

export function MatchActions({
  actions,
  onAction,
}: {
  readonly actions: readonly LegalCommandDescriptor[];
  readonly onAction: (descriptor: LegalCommandDescriptor) => void;
}) {
  const match = useMatchActions(actions, onAction);
  return (
    <>
      <SimulatorMatchActionDock {...match.actions} />
      {match.confirmation}
    </>
  );
}

function activity(board: OnePieceStaticBoard): SimulatorMatchActivity {
  return {
    log: <EventLogPanel entries={board.eventLog} embedded seatLabels={{ player: "Tú", opponent: "Bot" }} />,
    logLabel: "Registro",
    secondary: <OptionsPanel />,
    secondaryLabel: "Opciones",
    defaultTab: "log",
  };
}

function OptionsPanel() {
  const { settings, update } = useSettings();
  return (
    <div className={classes.matchSidebarUtilities}>
      <label>
        Animaciones{" "}
        <select
          value={settings.animationSpeed}
          onChange={(event) => update({ animationSpeed: event.target.value as typeof settings.animationSpeed })}
        >
          <option value="slow">Lentas</option>
          <option value="normal">Normales</option>
          <option value="fast">Rápidas</option>
          <option value="off">Sin animaciones</option>
        </select>
      </label>
      <label>
        Tocar una carta{" "}
        <select
          value={settings.cardInteractionMode}
          onChange={(event) => update({ cardInteractionMode: event.target.value as typeof settings.cardInteractionMode })}
        >
          <option value="detailed">Muestra la carta y sus acciones</option>
          <option value="quick">Solo las acciones</option>
        </select>
      </label>
    </div>
  );
}

function useMatchActions(commands: readonly LegalCommandDescriptor[], onAction: (descriptor: LegalCommandDescriptor) => void) {
  const [confirmingConcede, setConfirmingConcede] = useState(false);
  const confirmTitleId = useId();
  const endTurn = commands.find((a) => a.type === "endTurn");
  const concede = commands.find((a) => a.type === "concede");
  const actions = {
    className: classes.matchActionDock,
    controls: (
      <button type="button" disabled={!endTurn} data-testid="end-turn" onClick={() => endTurn && onAction(endTurn)}>
        Terminar turno
      </button>
    ),
    danger: (
      <button type="button" disabled={!concede} data-danger="true" data-testid="concede" onClick={() => setConfirmingConcede(true)}>
        Rendirse
      </button>
    ),
  };
  const confirmation =
    confirmingConcede && concede
      ? createPortal(
          <div className={classes.matchActionScrim} role="presentation">
            <section className={classes.matchActionConfirm} role="dialog" aria-modal="true" aria-labelledby={confirmTitleId}>
              <strong id={confirmTitleId}>¿Te rindes?</strong>
              <p>La partida termina como derrota.</p>
              <div>
                <button type="button" onClick={() => setConfirmingConcede(false)}>
                  Seguir jugando
                </button>
                <button
                  type="button"
                  data-danger="true"
                  onClick={() => {
                    setConfirmingConcede(false);
                    onAction(concede);
                  }}
                >
                  Rendirse
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;
  return { actions, confirmation };
}

function toParticipant(board: OnePieceStaticBoard, id: "player" | "opponent", meta: string): SimulatorMatchParticipant {
  const seat = board.table.seats.find((candidate) => candidate.id === id);
  const isSelf = id === "player";
  const active = board.table.status.activeSeatId === id;
  return {
    id,
    role: isSelf ? "self" : "opponent",
    name: seat?.label ?? (isSelf ? "Tú" : "Bot"),
    shortLabel: isSelf ? "TÚ" : "BOT",
    active,
    priority: active,
    status: active ? (isSelf ? "Tu turno" : "Su turno") : "Espera",
    // No clock (games are untimed) and no counters: the board shows Life,
    // deck, hand and DON!! next to each player, and the counter boxes did
    // not fit the sidebar.
    meta,
  };
}
