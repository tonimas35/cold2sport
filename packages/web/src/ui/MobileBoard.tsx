/**
 * Phone (portrait) board. The upstream One Piece tabletop is a landscape
 * playmat: on a 390 px wide screen its zones overlap and the hand falls off
 * the screen. This board shows the same projection (`OnePieceStaticBoard`)
 * stacked vertically, built from the upstream simulator-ui zone components,
 * so cards look the same, tapping a card opens the same action menu and the
 * animation runtime finds the same zone and card anchors.
 */
import type { SimulatorEntity, SimulatorZone } from "@tcg/simulator-contract";
import { AnimatedZoneSlot, CardRow, SingleCardZone } from "@tcg/simulator-ui";
import type { OnePieceSeatId, OnePieceStaticBoard } from "@upstream/one-piece/data/staticBoard.ts";
import type { ReactNode } from "react";
import classes from "./mobile-board.module.css";

function zoneOf(board: OnePieceStaticBoard, seat: OnePieceSeatId, suffix: string): SimulatorZone | undefined {
  return board.table.zones.find((z) => z.id === `${seat}-${suffix}`);
}

function entitiesOf(board: OnePieceStaticBoard, zone: SimulatorZone | undefined): SimulatorEntity[] {
  if (!zone) return [];
  const byId = new Map(board.entities.map((e) => [e.id, e]));
  return zone.entityIds.map((id) => byId.get(id)).filter((e): e is SimulatorEntity => Boolean(e));
}

const count = (zone: SimulatorZone | undefined) => zone?.count ?? zone?.entityIds.length ?? 0;

function Chip({
  board,
  seat,
  suffix,
  label,
  value,
  testId,
}: {
  readonly board: OnePieceStaticBoard;
  readonly seat: OnePieceSeatId;
  readonly suffix: string;
  readonly label: string;
  readonly value: string | number;
  readonly testId?: string;
}) {
  const zone = zoneOf(board, seat, suffix);
  const chip = (
    <span className={classes.chip} data-testid={testId}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
  // Registering the chip as the zone's animation anchor makes cards fly to and
  // from it (draws, cards trashed, Life taken) like on the desktop board.
  return zone ? <AnimatedZoneSlot animationRef={{ kind: "zone", id: zone.id, ownerId: zone.ownerId }}>{chip}</AnimatedZoneSlot> : chip;
}

/** A zone's animation anchor around arbitrary content (DON!! counters). */
function ZoneAnchor({
  board,
  seat,
  suffix,
  children,
}: {
  readonly board: OnePieceStaticBoard;
  readonly seat: OnePieceSeatId;
  readonly suffix: string;
  readonly children: ReactNode;
}) {
  const zone = zoneOf(board, seat, suffix);
  return zone ? <AnimatedZoneSlot animationRef={{ kind: "zone", id: zone.id, ownerId: zone.ownerId }}>{children}</AnimatedZoneSlot> : <>{children}</>;
}

function tokens(board: OnePieceStaticBoard, seat: OnePieceSeatId, label: string): number {
  return Number(board.donTokens[seat].find((t) => t.label === label)?.value ?? 0);
}

function Side({ board, seat }: { readonly board: OnePieceStaticBoard; readonly seat: OnePieceSeatId }) {
  const leader = zoneOf(board, seat, "leader");
  const stage = zoneOf(board, seat, "stage");
  const characters = zoneOf(board, seat, "characters");
  const trash = zoneOf(board, seat, "trash");
  const trashTop = entitiesOf(board, trash)[0];
  const active = tokens(board, seat, "Active");
  const rested = tokens(board, seat, "Rested");
  const donDeck = tokens(board, seat, "DON!! Deck");
  const mine = seat === "player";
  return (
    <section className={classes.side} data-seat={seat} aria-label={mine ? "Tu lado" : "Lado del bot"}>
      <div className={classes.strip}>
        <Chip board={board} seat={seat} suffix="life" label="Vidas" value={count(zoneOf(board, seat, "life"))} testId={`${seat}-life-count`} />
        {!mine ? <Chip board={board} seat={seat} suffix="hand" label="Mano" value={count(zoneOf(board, seat, "hand"))} /> : null}
        <Chip board={board} seat={seat} suffix="deck" label="Mazo" value={count(zoneOf(board, seat, "deck"))} />
        <Chip board={board} seat={seat} suffix="trash" label="Papelera" value={count(trash)} />
      </div>
      <div className={classes.command}>
        <div className={classes.single}>
          <SingleCardZone zone={leader} entities={entitiesOf(board, leader)} entityCount={count(leader)} density="mini" emptyLabel="Líder" />
          <small>Líder</small>
        </div>
        <div className={classes.single}>
          <SingleCardZone zone={stage} entities={entitiesOf(board, stage)} entityCount={count(stage)} density="mini" emptyLabel="—" />
          <small>Escenario</small>
        </div>
        <div className={classes.donBox} aria-label={`DON!!: ${active} activos, ${rested} girados, ${donDeck} en el mazo DON!!`} data-testid={`${seat}-don`}>
          <ZoneAnchor board={board} seat={seat} suffix="don-area">
            <span>
              DON!! <strong>{active}</strong> activos · <strong>{rested}</strong> girados
            </span>
          </ZoneAnchor>
          <ZoneAnchor board={board} seat={seat} suffix="don-deck">
            <span className={classes.trashTop}>Mazo DON!!: {donDeck}</span>
          </ZoneAnchor>
          {trashTop ? <span className={classes.trashTop}>Papelera: {trashTop.title}</span> : null}
        </div>
      </div>
      <div className={classes.characters} data-testid={`${seat}-characters-mobile`}>
        <CardRow
          zone={characters}
          entities={entitiesOf(board, characters)}
          density="mini"
          wrap={false}
          emptyLabel="Sin personajes"
          ariaLabel={mine ? "Tus personajes" : "Personajes del bot"}
        />
      </div>
    </section>
  );
}

export function MobileBoard({ board }: { readonly board: OnePieceStaticBoard }) {
  const hand = zoneOf(board, "player", "hand");
  const status = board.table.status;
  return (
    <div className={classes.board} data-testid="one-piece-mobile-board">
      <Side board={board} seat="opponent" />
      <div className={classes.ribbon} data-testid="one-piece-phase-ribbon">
        Turno {status.turn} · {status.phase} · {status.activeSeatId === "player" ? "te toca" : "le toca al bot"}
      </div>
      <Side board={board} seat="player" />
      <div className={classes.hand} data-testid="player-hand">
        <CardRow zone={hand} entities={entitiesOf(board, hand)} density="mini" wrap={false} emptyLabel="Mano vacía" ariaLabel="Tu mano" />
      </div>
    </div>
  );
}
