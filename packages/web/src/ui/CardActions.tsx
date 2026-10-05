/**
 * Tap (or right-click / long-press) a card to see what it can do now.
 *
 * Adapted from the upstream OnePieceCardContextController (MIT,
 * vendor/tcg-engines/submodules/agnostic-simulator/apps/multi-game-simulator/
 * src/games/one-piece/components/OnePieceCardContextController.tsx). Changes:
 * Spanish action labels; settings from our local SettingsProvider instead of
 * the hosted platform's settings provider; the selected descriptor goes to
 * the game screen, which asks for the attack target or the number of DON!!
 * instead of taking the first ones.
 */
import type { LegalCommandDescriptor, PotentialCardCommandDescriptor } from "@tcg/op-engine";
import type { SimulatorCardAction } from "@tcg/simulator-contract";
import { CardContextMenuController } from "@tcg/simulator-ui";
import { useCallback, useMemo, type ReactNode } from "react";
import type { OnePieceStaticBoard } from "@upstream/one-piece/data/staticBoard.ts";
import { useSettings } from "./settings.tsx";

const ACTION_PRESENTATION: Record<string, { label: string; detail: string; order: number; shortcut: string }> = {
  playCard: {
    label: "Jugar",
    detail: "Gira los DON!! necesarios y juega este Personaje, Evento o Escenario.",
    order: 10,
    shortcut: "1",
  },
  attachDon: {
    label: "Dar DON!!",
    detail: "Une DON!! activos a este Líder o Personaje (+1000 cada uno en tu turno).",
    order: 20,
    shortcut: "2",
  },
  declareAttack: {
    label: "Atacar",
    detail: "Gira este Líder o Personaje y elige a quién atacar.",
    order: 30,
    shortcut: "3",
  },
  activateEffect: {
    label: "Activar [Main]",
    detail: "Paga el coste de activación y resuelve su efecto [Main].",
    order: 40,
    shortcut: "4",
  },
  block: {
    label: "Usar [Blocker]",
    detail: "Gira este [Blocker] en el paso de bloqueo de un ataque rival.",
    order: 50,
    shortcut: "5",
  },
  counter: {
    label: "Usar [Counter]",
    detail: "Descarta esta carta en el paso de counter para sumar su Counter.",
    order: 60,
    shortcut: "6",
  },
};

export function CardActions({
  board,
  actions,
  cardActions,
  onAction,
  children,
}: {
  readonly board: OnePieceStaticBoard;
  readonly actions: readonly LegalCommandDescriptor[];
  readonly cardActions: readonly PotentialCardCommandDescriptor[];
  readonly onAction: (descriptor: LegalCommandDescriptor) => void;
  readonly children: ReactNode;
}) {
  const { settings, update } = useSettings();
  const descriptorByRef = useMemo(() => new Map(cardActions.map((d) => [commandRef(d), d])), [cardActions]);
  const cardActionsByEntity = useMemo(() => {
    const result = new Map<string, PotentialCardCommandDescriptor[]>();
    for (const action of cardActions) {
      if (!action.sourceId) continue;
      result.set(action.sourceId, [...(result.get(action.sourceId) ?? []), action]);
    }
    return result;
  }, [cardActions]);
  const entityById = useMemo(() => new Map(board.entities.map((e) => [e.id, e])), [board.entities]);

  const actionsForEntity = useCallback(
    (entityId: string): readonly SimulatorCardAction[] => {
      const entity = entityById.get(entityId);
      if (!entity || entity.face === "hidden" || entity.ownerId !== "player") return [];
      const normalized = (cardActionsByEntity.get(entityId) ?? []).map((d) => normalizeCardAction(d, entityId, commandRef(d)));
      const printedText = (entity.details?.rules ?? [])
        .map((rule) => `${rule.label ?? ""} ${rule.text}`)
        .join(" ")
        .toLocaleLowerCase();
      if (printedText.includes("[blocker]")) {
        normalized.push(disabledStructuralAction(entityId, "block", "[Blocker] se usa en el paso de bloqueo de un ataque rival."));
      }
      if (entity.dataAttributes?.["data-zone"] === "hand" && printedText.includes("[counter]")) {
        normalized.push(disabledStructuralAction(entityId, "counter", "[Counter] se usa desde la mano en el paso de counter."));
      }
      return normalized;
    },
    [cardActionsByEntity, entityById],
  );

  const executeAction = useCallback(
    (action: SimulatorCardAction) => {
      if (action.availability.kind !== "enabled" || !action.commandRef) return;
      const descriptor = descriptorByRef.get(action.commandRef);
      if (descriptor) onAction(descriptor);
    },
    [descriptorByRef, onAction],
  );

  const promptActive = actions.some(
    (a) => a.type === "resolvePrompt" || a.type === "mulligan" || a.type === "keepHand" || a.type === "startGame",
  );

  return (
    <CardContextMenuController
      entities={board.entities}
      actionsForEntity={actionsForEntity}
      mode={settings.cardInteractionMode}
      stateVersion={board.table.status.stateVersion}
      promptActive={promptActive}
      onModeChange={(mode) => update({ cardInteractionMode: mode })}
      onAction={executeAction}
    >
      {children}
    </CardContextMenuController>
  );
}

function normalizeCardAction(descriptor: PotentialCardCommandDescriptor, entityId: string, ref: string): SimulatorCardAction {
  const presentation = presentationFor(descriptor.type);
  return {
    id: `${descriptor.type}:${entityId}`,
    sourceEntityId: entityId,
    label: presentation.label,
    detail: presentation.detail,
    order: presentation.order,
    shortcut: presentation.shortcut,
    activation: descriptor.targetIds?.length || descriptor.slotChoices?.length ? "begin-selection" : "execute",
    commandRef: ref,
    availability: descriptor.enabled
      ? { kind: "enabled" }
      : {
          kind: "disabled",
          reason: descriptor.disabledReason ?? "No disponible ahora.",
          ...(descriptor.disabledReasonCode !== undefined && { reasonCode: descriptor.disabledReasonCode }),
        },
  };
}

function disabledStructuralAction(entityId: string, type: "block" | "counter", reason: string): SimulatorCardAction {
  return {
    id: `${type}:${entityId}`,
    sourceEntityId: entityId,
    ...presentationFor(type),
    activation: "begin-selection",
    commandRef: type,
    availability: { kind: "disabled", reason, reasonCode: `one-piece.${type}.wrong-timing` },
  };
}

function presentationFor(type: string) {
  return ACTION_PRESENTATION[type] ?? { label: type, detail: "Acción de carta.", order: 100, shortcut: "" };
}

function commandRef(descriptor: PotentialCardCommandDescriptor): string {
  return `${descriptor.type}:${descriptor.sourceId ?? "global"}`;
}
