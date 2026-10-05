/**
 * The play surface: upstream viewport shell (desktop sidebar, phone rails and
 * drawer) around the board, plus an overlay slot for our panels.
 *
 * Adapted from the upstream OnePieceSimulatorShell (MIT, vendor/tcg-engines/
 * submodules/agnostic-simulator/apps/multi-game-simulator/src/games/one-piece/
 * components/OnePieceSimulatorShell.tsx). Changes: our sidebar (no hosted
 * platform menus, no bug-report dialog that posts to the platform's API),
 * Spanish rails with "moves" and "end turn" buttons on phones, and on phones
 * and tablets our portrait board (MobileBoard) instead of the landscape
 * tabletop. On desktop the tabletop is the vendored OnePieceTabletopBoard,
 * unchanged (layout fixes from outside in board-fixes.css).
 */
import type { LegalCommandDescriptor, PotentialCardCommandDescriptor } from "@tcg/op-engine";
import { MobilePlayerRail, SimulatorViewportShell, useSimulatorViewportLayout } from "@tcg/simulator-ui";
import { OnePieceTabletopBoard } from "@upstream/one-piece/components/OnePieceTabletopBoard.tsx";
import classes from "@upstream/one-piece/components/OnePieceTabletopBoard.module.css";
import type { OnePieceStaticBoard } from "@upstream/one-piece/data/staticBoard.ts";
import type { ReactNode } from "react";
import type { GameSummary } from "../game/protocol.ts";
import { CardActions } from "./CardActions.tsx";
import { GameSidebar, MatchActions, MobileActivity } from "./GameSidebar.tsx";
import { MobileBoard } from "./MobileBoard.tsx";
import panels from "./panels.module.css";

/**
 * Narrowest window that gets the desktop tabletop: with the sidebar open, the
 * board's mats fit from about 1225 px (column minimums in ui/board-fixes.css,
 * "Width"). Narrower windows (tablets, small laptop windows) get the phone
 * layout instead of a clipped tabletop.
 */
export const DESKTOP_MIN_WIDTH = 1240;

function Board({
  board,
  boardActions,
  onAction,
}: {
  readonly board: OnePieceStaticBoard;
  readonly boardActions: readonly LegalCommandDescriptor[];
  readonly onAction: (descriptor: LegalCommandDescriptor) => void;
}) {
  const layout = useSimulatorViewportLayout();
  if (layout === "mobile") return <MobileBoard board={board} />;
  return (
    <section className={classes.boardSlot} aria-label="Mesa de juego">
      <OnePieceTabletopBoard board={board} actions={boardActions} onAction={onAction} />
    </section>
  );
}

export function GameShell({
  board,
  summary,
  boardActions,
  dockActions,
  cardActions,
  onAction,
  movesCount,
  onShowMoves,
  statusText,
  botStatus,
  menu,
  children,
}: {
  readonly board: OnePieceStaticBoard;
  readonly summary: GameSummary;
  /** Main-phase moves the desktop tabletop renders as buttons. */
  readonly boardActions: readonly LegalCommandDescriptor[];
  /** Descriptors behind "end turn" and "concede". */
  readonly dockActions: readonly LegalCommandDescriptor[];
  readonly cardActions: readonly PotentialCardCommandDescriptor[];
  readonly onAction: (descriptor: LegalCommandDescriptor) => void;
  readonly movesCount: number;
  readonly onShowMoves: () => void;
  readonly statusText: string;
  readonly botStatus: ReactNode;
  readonly menu: ReactNode;
  readonly children: ReactNode;
}) {
  const endTurn = dockActions.find((d) => d.type === "endTurn");
  return (
    <CardActions board={board} actions={boardActions} cardActions={cardActions} onAction={onAction}>
      <SimulatorViewportShell
        className={classes.shell}
        data-game="one-piece"
        data-theme="light"
        data-testid="one-piece-shell"
        mobileBreakpoint={DESKTOP_MIN_WIDTH - 1}
        sidebarLabel="Partida"
        sidebar={
          <GameSidebar board={board} summary={summary} actions={dockActions} onAction={onAction} botStatus={botStatus} menu={menu} />
        }
        mobilePanel={<MobileActivity board={board} menu={menu} botStatus={botStatus} dock={<MatchActions actions={dockActions} onAction={onAction} />} />}
        mobilePanelLabel="Menú de la partida"
        mobileTopRail={({ openSidebar }) => (
          <MobilePlayerRail
            side="opponent"
            className={classes.mobileTopRail}
            left={
              <button type="button" onClick={openSidebar} aria-label="Abrir el menú y el registro" data-testid="open-activity">
                Menú
              </button>
            }
            center={
              <span>
                T{board.table.status.turn} · {board.table.status.phase}
              </span>
            }
            right={
              <div className={panels.railIdentity}>
                <small>Bot · {summary.level.label}</small>
                <strong>{summary.botDeck.leaderName}</strong>
              </div>
            }
          />
        )}
        mobileBottomRail={
          <MobilePlayerRail
            side="player"
            className={classes.mobileBottomRail}
            left={
              <button type="button" disabled={movesCount === 0} onClick={onShowMoves} data-testid="show-moves">
                Jugadas{movesCount ? ` (${movesCount})` : ""}
              </button>
            }
            center={<span data-testid="status-text">{statusText}</span>}
            right={
              <button
                type="button"
                className={panels.railPrimary}
                disabled={!endTurn}
                data-testid="end-turn-mobile"
                onClick={() => endTurn && onAction(endTurn)}
              >
                Terminar turno
              </button>
            }
          />
        }
        tabletop={<Board board={board} boardActions={boardActions} onAction={onAction} />}
      >
        {children}
      </SimulatorViewportShell>
    </CardActions>
  );
}
