/** Opening hand: keep it or take the one mulligan (5-2-1-6). Shows the five cards. */
import type { SimulatorEntity } from "@tcg/simulator-contract";
import type { OnePieceStaticBoard } from "@upstream/one-piece/data/staticBoard.ts";
import { CardArt } from "./CardTile.tsx";
import classes from "./panels.module.css";

export function MulliganPanel({
  board,
  firstSide,
  busy,
  onKeep,
  onMulligan,
}: {
  readonly board: OnePieceStaticBoard;
  readonly firstSide: "human" | "bot";
  readonly busy: boolean;
  readonly onKeep: () => void;
  readonly onMulligan: () => void;
}) {
  const hand = board.table.zones.find((z) => z.id === "player-hand");
  const byId = new Map(board.entities.map((e) => [e.id, e]));
  const cards = (hand?.entityIds ?? []).map((id) => byId.get(id)).filter((e): e is SimulatorEntity => Boolean(e));
  return (
    <section className={classes.sheet} role="dialog" aria-label="Mano inicial" data-testid="mulligan-panel">
      <header className={classes.sheetHeader}>
        <div>
          <p className={classes.eyebrow}>{firstSide === "human" ? "Empiezas tú" : "Empieza el bot"}</p>
          <h2 className={classes.title}>Tu mano inicial</h2>
          <p className={classes.details}>Puedes quedártela o devolverla y robar 5 cartas nuevas (una sola vez).</p>
        </div>
      </header>
      <div className={classes.sheetBody}>
        <div className={classes.grid}>
          {cards.map((card) => (
            <span key={card.id} className={classes.tile} style={{ cursor: "default" }}>
              <span className={classes.tileImage}>
                <CardArt card={{ imageUrl: card.imageUrl ?? null, name: card.title }} label={card.title} />
              </span>
              <span className={classes.tileName}>{card.title}</span>
            </span>
          ))}
        </div>
      </div>
      <footer className={classes.sheetFooter}>
        <button type="button" className={classes.button} disabled={busy} onClick={onMulligan} data-testid="mulligan">
          Mulligan
        </button>
        <button type="button" className={classes.primary} disabled={busy} onClick={onKeep} data-testid="keep-hand">
          Me la quedo
        </button>
      </footer>
    </section>
  );
}
