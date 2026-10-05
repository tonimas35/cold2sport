/** A selectable card inside our prompt and chooser panels (art from the card data, like the board). */
import { CardImage } from "@tcg/simulator-ui";
import { useState, type ReactNode } from "react";
import type { CardView } from "../game/protocol.ts";
import classes from "./panels.module.css";

export function CardArt({ card, label }: { readonly card: Pick<CardView, "imageUrl" | "name"> | null; readonly label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      {card?.imageUrl && !failed ? (
        <CardImage src={card.imageUrl} alt={card.name} onImageError={() => setFailed(true)} referrerPolicy="no-referrer" />
      ) : null}
      {!card?.imageUrl || failed ? <span className={classes.tileFallback}>{label}</span> : null}
    </>
  );
}

export function CardTile({
  card,
  label,
  stats,
  selected = false,
  badge,
  disabled = false,
  onClick,
  testId,
}: {
  readonly card: CardView | null;
  readonly label: string;
  readonly stats?: ReactNode;
  readonly selected?: boolean;
  readonly badge?: ReactNode;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly testId?: string;
}) {
  return (
    <button
      type="button"
      className={classes.tile}
      data-selected={selected}
      data-testid={testId}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      {badge !== undefined ? <span className={classes.badge}>{badge}</span> : null}
      <span className={classes.tileImage}>
        <CardArt card={card} label={label} />
      </span>
      <span className={classes.tileName}>{card?.name ?? label}</span>
      {stats ? <span className={classes.tileStats}>{stats}</span> : null}
    </button>
  );
}

export function cardStats(card: CardView | null): ReactNode {
  if (!card) return null;
  const bits: string[] = [];
  if (card.power !== null) bits.push(`${card.power}`);
  if (card.cost !== null) bits.push(`coste ${card.cost}`);
  if (card.counter) bits.push(`+${card.counter}`);
  if (card.rested) bits.push("girada");
  return bits.join(" · ") || null;
}
