/**
 * The choices a move descriptor leaves open: which target to attack (the
 * engine lists every legal target in one descriptor) and how many DON!! to
 * give. The upstream practice page always took the first target and one DON!!.
 */
import type { SimulatorEntity } from "@tcg/simulator-contract";
import type { PendingChoice } from "../game/commands.ts";
import type { CardView } from "../game/protocol.ts";
import { CardTile } from "./CardTile.tsx";
import classes from "./panels.module.css";

function entityCard(entity: SimulatorEntity | undefined, id: string): CardView | null {
  if (!entity) return null;
  const stat = (label: string) => {
    const value = entity.stats.find((s) => s.label === label)?.value;
    return value === undefined ? null : Number(value);
  };
  return {
    instanceId: id,
    cardId: String(entity.dataAttributes?.["data-card-printing-id"] ?? ""),
    name: entity.title,
    imageUrl: entity.imageUrl ?? null,
    owner: entity.ownerId === "player" ? "human" : "bot",
    zone: String(entity.dataAttributes?.["data-zone"] ?? ""),
    power: stat("Power"),
    cost: stat("Cost"),
    counter: null,
    rested: entity.states.includes("rested"),
  };
}

export function ChoicePanel({
  choice,
  entities,
  busy,
  onAttack,
  onDon,
  onCancel,
}: {
  readonly choice: PendingChoice;
  readonly entities: readonly SimulatorEntity[];
  readonly busy: boolean;
  readonly onAttack: (attackerId: string, targetId: string) => void;
  readonly onDon: (targetId: string, amount: number) => void;
  readonly onCancel: () => void;
}) {
  const byId = new Map(entities.map((e) => [e.id, e]));
  if (choice.kind === "attack") {
    const attacker = byId.get(choice.attackerId);
    return (
      <section className={classes.sheet} role="dialog" aria-label="Elige objetivo" data-testid="choice-panel" data-choice="attack">
        <header className={classes.sheetHeader}>
          <div>
            <p className={classes.eyebrow}>Atacar</p>
            <h2 className={classes.title}>{attacker ? `${attacker.title}: elige a quién atacar` : "Elige a quién atacar"}</h2>
          </div>
        </header>
        <div className={classes.sheetBody}>
          <div className={classes.grid}>
            {choice.targetIds.map((id, index) => {
              const card = entityCard(byId.get(id), id);
              return (
                <CardTile
                  key={id}
                  testId={`choice-target-${index}`}
                  card={card}
                  label={card?.name ?? id}
                  stats={card ? `${card.zone === "leader" ? "Líder" : "Personaje"} · ${card.power ?? "?"}` : null}
                  disabled={busy}
                  onClick={() => onAttack(choice.attackerId, id)}
                />
              );
            })}
          </div>
        </div>
        <footer className={classes.sheetFooter}>
          <button type="button" className={classes.button} onClick={onCancel} data-testid="choice-cancel">
            Cancelar
          </button>
        </footer>
      </section>
    );
  }
  const target = byId.get(choice.targetId);
  const amounts = Array.from({ length: choice.max }, (_, i) => i + 1);
  return (
    <section className={classes.sheet} role="dialog" aria-label="DON!!" data-testid="choice-panel" data-choice="don">
      <header className={classes.sheetHeader}>
        <div>
          <p className={classes.eyebrow}>Dar DON!!</p>
          <h2 className={classes.title}>{target ? `¿Cuántos DON!! das a ${target.title}?` : "¿Cuántos DON!!?"}</h2>
          <p className={classes.details}>Cada DON!! da +1000 de poder durante tu turno.</p>
        </div>
      </header>
      <div className={classes.sheetBody}>
        <div className={classes.resultActions}>
          {amounts.map((amount) => (
            <button
              key={amount}
              type="button"
              className={classes.button}
              disabled={busy}
              data-testid={`choice-don-${amount}`}
              onClick={() => onDon(choice.targetId, amount)}
            >
              {amount}
            </button>
          ))}
        </div>
      </div>
      <footer className={classes.sheetFooter}>
        <button type="button" className={classes.button} onClick={onCancel} data-testid="choice-cancel">
          Cancelar
        </button>
      </footer>
    </section>
  );
}
