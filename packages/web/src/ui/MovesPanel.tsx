/**
 * Every legal move of the human's main phase as a list (phones: the upstream
 * board's move buttons are a desktop overlay). Tapping a card on the board
 * offers the same moves; this list is the discoverable path.
 */
import type { LegalCommandDescriptor } from "@tcg/op-engine";
import type { SimulatorEntity } from "@tcg/simulator-contract";
import { CardArt } from "./CardTile.tsx";
import classes from "./panels.module.css";

export function moveLabel(descriptor: LegalCommandDescriptor, entity: SimulatorEntity | undefined): string {
  const name = entity?.title ?? "carta";
  switch (descriptor.type) {
    case "playCard": {
      const cost = entity?.stats.find((s) => s.label === "Cost")?.value;
      return `Jugar ${name}${cost !== undefined ? ` (coste ${cost})` : ""}`;
    }
    case "attachDon":
      return `Dar DON!! a ${name}`;
    case "declareAttack":
      return `Atacar con ${name}`;
    case "activateEffect":
      return `Activar ${name}`;
    case "endTurn":
      return "Terminar turno";
    default:
      return descriptor.label;
  }
}

const ORDER: Record<string, number> = { playCard: 0, activateEffect: 1, attachDon: 2, declareAttack: 3 };

export function mainMoves(legal: readonly LegalCommandDescriptor[]): LegalCommandDescriptor[] {
  return legal
    .filter((d) => d.type in ORDER)
    .sort((a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9));
}

export function MovesPanel({
  moves,
  entities,
  onMove,
  onClose,
}: {
  readonly moves: readonly LegalCommandDescriptor[];
  readonly entities: readonly SimulatorEntity[];
  readonly onMove: (descriptor: LegalCommandDescriptor) => void;
  readonly onClose: () => void;
}) {
  const byId = new Map(entities.map((e) => [e.id, e]));
  return (
    <section className={classes.sheet} role="dialog" aria-label="Jugadas" data-testid="moves-panel">
      <header className={classes.sheetHeader}>
        <div>
          <p className={classes.eyebrow}>Tu turno</p>
          <h2 className={classes.title}>Jugadas posibles</h2>
          <p className={classes.details}>También puedes tocar una carta del tablero para ver qué puede hacer.</p>
        </div>
        <button type="button" className={classes.ghost} onClick={onClose} data-testid="moves-close">
          Cerrar
        </button>
      </header>
      <div className={classes.sheetBody}>
        <div className={classes.optionList}>
          {moves.length === 0 ? <p className={classes.muted}>No te quedan jugadas: termina el turno.</p> : null}
          {moves.map((move, index) => {
            const entity = move.sourceId ? byId.get(move.sourceId) : undefined;
            return (
              <button
                key={`${move.type}:${move.sourceId ?? index}`}
                type="button"
                className={classes.optionButton}
                data-testid={`move-${index}`}
                data-move-type={move.type}
                onClick={() => onMove(move)}
              >
                <span className={classes.orderThumb}>
                  <CardArt card={entity ? { imageUrl: entity.imageUrl ?? null, name: entity.title } : null} label={entity?.title ?? ""} />
                </span>
                <span>{moveLabel(move, entity)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
