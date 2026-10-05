/**
 * Answers the engine's prompts: blockers, counters, [Trigger]s, targets,
 * costs, "up to N", orderings. The upstream practice page only offers the
 * prompt as one button that resolves it with an empty answer, so this panel
 * is ours. It shows exactly the prompt's options (the engine validates the
 * answer; a rejected answer leaves the game unchanged and is shown here).
 */
import { useMemo, useState } from "react";
import { promptOptionCommand, promptSelectionCommand, selectionAllowed } from "../game/commands.ts";
import type { EngineCommand } from "@tcg/op-engine";
import type { BattleView, PromptOptionView, PromptView } from "../game/protocol.ts";
import { CardArt, CardTile, cardStats } from "./CardTile.tsx";
import classes from "./panels.module.css";

/** Spanish for the engine's fixed option labels; card names and effect texts stay as printed. */
const OPTION_LABELS: Record<string, string> = {
  Activate: "Activar",
  Skip: "Omitir",
  "Activate trigger": "Activar [Trigger]",
  "Skip trigger": "No activar",
  "No block": "No bloquear",
  "Top of deck": "Arriba del mazo",
  "Bottom of deck": "Abajo del mazo",
  "Top of Life": "Arriba de las Vidas",
  "Bottom of Life": "Abajo de las Vidas",
  addToLife: "Añadir a las Vidas",
  removeFromLife: "Quitar de las Vidas",
};

const INTENT_TITLES: Record<string, string> = {
  battleBlocker: "¿Bloqueas?",
  battleCounter: "Counter",
  lifeTrigger: "[Trigger]",
  effectOptional: "Efecto opcional",
  effectTargetSelection: "Elige objetivos",
  effectSearchSelection: "Busca en el mazo",
  effectSearchRemainderOrder: "Ordena las cartas",
  effectRearrangeDeckOrder: "Ordena las cartas",
  effectPlaySelection: "Elige qué jugar",
  effectPlayCharacterReplacement: "Área de Personajes llena",
};

export function optionLabel(option: PromptOptionView): string {
  if (option.card) return option.card.name;
  return OPTION_LABELS[option.label] ?? option.label;
}

function BattleLine({ battle, extra }: { readonly battle: BattleView; readonly extra: number }) {
  const defense = battle.targetPower + extra;
  return (
    <div className={classes.battle} data-testid="prompt-battle">
      <span>
        Ataca <strong>{battle.attacker.name}</strong> ({battle.attackerPower})
      </span>
      <span>
        a <strong>{battle.target.name}</strong> ({battle.targetPower}
        {extra ? ` + ${extra} = ${defense}` : ""})
      </span>
    </div>
  );
}

export function PromptPanel({
  prompt,
  battle,
  busy,
  notice,
  onAnswer,
}: {
  readonly prompt: PromptView;
  readonly battle: BattleView | null;
  readonly busy: boolean;
  readonly notice: string | null;
  readonly onAnswer: (command: EngineCommand) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>(() => prompt.options.map((o) => o.id));
  const byId = useMemo(() => new Map(prompt.options.map((o) => [o.id, o])), [prompt.options]);
  const title = INTENT_TITLES[prompt.intent] ?? "Decide";

  if (collapsed) {
    return (
      <button type="button" className={classes.collapsed} onClick={() => setCollapsed(false)} data-testid="prompt-expand">
        {title}: toca para decidir
      </button>
    );
  }

  const skipOption = prompt.options.find((o) => o.skip);
  const pickable = prompt.options.filter((o) => !o.skip);
  const counterSum = selected.reduce((sum, id) => sum + (byId.get(id)?.card?.counter ?? 0), 0);

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (prompt.max === 1) return [id];
      if (current.length >= prompt.max) return current;
      return [...current, id];
    });
  };
  const move = (index: number, delta: number) => {
    setOrder((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  let body;
  let footer;
  if (prompt.mode === "choice") {
    body = (
      <div className={classes.optionList}>
        {prompt.options.map((option, index) => (
          <button
            key={option.id}
            type="button"
            className={classes.optionButton}
            disabled={busy || !option.enabled}
            data-testid={`prompt-option-${index}`}
            onClick={() => onAnswer(promptOptionCommand(prompt, option.id))}
          >
            {option.card ? (
              <span className={classes.orderThumb}>
                <CardArt card={option.card} label={option.card.name} />
              </span>
            ) : null}
            <span>{optionLabel(option)}</span>
          </button>
        ))}
      </div>
    );
  } else if (prompt.mode === "order") {
    body = (
      <div>
        <p className={classes.muted}>De la primera a la última.</p>
        {order.map((id, index) => {
          const option = byId.get(id)!;
          return (
            <div key={id} className={classes.orderRow} data-testid={`prompt-order-${index}`}>
              <span className={classes.orderIndex}>{index + 1}</span>
              <span className={classes.orderThumb}>
                <CardArt card={option.card} label={optionLabel(option)} />
              </span>
              <span className={classes.tileName}>{optionLabel(option)}</span>
              <span className={classes.orderButtons}>
                <button type="button" className={classes.iconButton} aria-label="Subir" disabled={index === 0} onClick={() => move(index, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  className={classes.iconButton}
                  aria-label="Bajar"
                  disabled={index === order.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </span>
            </div>
          );
        })}
      </div>
    );
    footer = (
      <button
        type="button"
        className={classes.primary}
        disabled={busy}
        data-testid="prompt-confirm"
        onClick={() => onAnswer(promptSelectionCommand(prompt, order))}
      >
        Confirmar orden
      </button>
    );
  } else {
    body = (
      <div className={classes.grid}>
        {pickable.map((option, index) => {
          const isSelected = selected.includes(option.id);
          return (
            <CardTile
              key={option.id}
              testId={`prompt-pick-${index}`}
              card={option.card}
              label={optionLabel(option)}
              stats={option.card ? cardStats(option.card) : option.don ? "DON!!" : null}
              selected={isSelected}
              {...(isSelected && prompt.max > 1 ? { badge: selected.indexOf(option.id) + 1 } : {})}
              disabled={busy || !option.enabled}
              onClick={() => toggle(option.id)}
            />
          );
        })}
      </div>
    );
    const canConfirm = selectionAllowed(prompt, selected) && (selected.length > 0 || !skipOption);
    footer = (
      <>
        <span className={classes.footerNote}>
          {prompt.max > 0
            ? `${selected.length} elegida${selected.length === 1 ? "" : "s"} · ${prompt.min === prompt.max ? prompt.min : `${prompt.min}–${prompt.max}`}`
            : "No hay nada que elegir"}
        </span>
        {skipOption ? (
          <button
            type="button"
            className={classes.button}
            disabled={busy}
            data-testid="prompt-skip"
            onClick={() => onAnswer(promptSelectionCommand(prompt, []))}
          >
            {optionLabel(skipOption)}
          </button>
        ) : prompt.min === 0 && prompt.max > 0 ? (
          <button
            type="button"
            className={classes.button}
            disabled={busy}
            data-testid="prompt-none"
            onClick={() => onAnswer(promptSelectionCommand(prompt, []))}
          >
            {prompt.intent === "battleCounter" ? "Sin counter" : "Ninguna"}
          </button>
        ) : null}
        <button
          type="button"
          className={classes.primary}
          disabled={busy || !canConfirm}
          data-testid="prompt-confirm"
          onClick={() => onAnswer(promptSelectionCommand(prompt, selected))}
        >
          {prompt.max === 0 ? "Continuar" : "Confirmar"}
        </button>
      </>
    );
  }

  return (
    <section className={classes.sheet} role="dialog" aria-label={title} data-testid="prompt-panel" data-intent={prompt.intent}>
      <header className={classes.sheetHeader}>
        <div>
          {prompt.source ? (
            <span className={classes.headerSource} data-testid="prompt-source">
              <CardArt card={prompt.source} label={prompt.source.name} />
            </span>
          ) : null}
          <p className={classes.eyebrow}>{title}</p>
          <h2 className={classes.title}>{prompt.label}</h2>
          {prompt.details ? <p className={classes.details}>{prompt.details}</p> : null}
        </div>
        <button type="button" className={classes.ghost} onClick={() => setCollapsed(true)} data-testid="prompt-collapse">
          Ver tablero
        </button>
      </header>
      <div className={classes.sheetBody}>
        {notice ? <p className={classes.notice}>{notice}</p> : null}
        {battle && (prompt.intent === "battleCounter" || prompt.intent === "battleBlocker") ? (
          <BattleLine battle={battle} extra={prompt.intent === "battleCounter" ? counterSum : 0} />
        ) : null}
        {body}
      </div>
      {footer ? <footer className={classes.sheetFooter}>{footer}</footer> : null}
    </section>
  );
}
