/**
 * Builds the human's engine commands from what the page shows: the engine's
 * legal-move descriptors plus the choices the descriptors leave open (attack
 * target, number of DON!!) and the answers to prompts. Pure functions; the
 * worker validates every command with the engine before applying it.
 */
import type { EngineCommand, LegalCommandDescriptor } from "@tcg/op-engine";
import { HUMAN_SEAT, type PromptView } from "./protocol.ts";

/** What the page must still ask before a descriptor becomes a command. */
export type PendingChoice =
  | { readonly kind: "attack"; readonly attackerId: string; readonly targetIds: readonly string[] }
  | { readonly kind: "don"; readonly targetId: string; readonly max: number };

export type DescriptorOutcome =
  | { readonly kind: "command"; readonly command: EngineCommand }
  | { readonly kind: "choose"; readonly choice: PendingChoice }
  | { readonly kind: "ignore" };

/**
 * A descriptor of the human's legal moves (or of the card actions menu).
 * Prompts are answered with `promptCommand`, never through their descriptor:
 * the descriptor alone would resolve them with an empty answer.
 */
export function fromDescriptor(descriptor: LegalCommandDescriptor, activeDon: number): DescriptorOutcome {
  const seat = HUMAN_SEAT;
  switch (descriptor.type) {
    case "mulligan":
    case "keepHand":
    case "startGame":
    case "endTurn":
    case "concede":
      return { kind: "command", command: { type: descriptor.type, seat } };
    case "playCard":
      if (!descriptor.sourceId) return { kind: "ignore" };
      // An empty slot list means a full board: the engine then asks which
      // Character to replace (a prompt), so the slot is left out.
      return {
        kind: "command",
        command: {
          type: "playCard",
          seat,
          instanceId: descriptor.sourceId,
          ...(descriptor.slotChoices?.[0] !== undefined && { slotIndex: descriptor.slotChoices[0] }),
        },
      };
    case "activateEffect":
      if (!descriptor.sourceId) return { kind: "ignore" };
      return {
        kind: "command",
        command: { type: "activateEffect", seat, sourceInstanceId: descriptor.sourceId, trigger: "activateMain" },
      };
    case "attachDon":
      if (!descriptor.sourceId || activeDon < 1) return { kind: "ignore" };
      if (activeDon === 1) return { kind: "command", command: attachDonCommand(descriptor.sourceId, 1) };
      return { kind: "choose", choice: { kind: "don", targetId: descriptor.sourceId, max: activeDon } };
    case "declareAttack": {
      const targets = descriptor.targetIds ?? [];
      if (!descriptor.sourceId || targets.length === 0) return { kind: "ignore" };
      if (targets.length === 1) return { kind: "command", command: attackCommand(descriptor.sourceId, targets[0]!) };
      return { kind: "choose", choice: { kind: "attack", attackerId: descriptor.sourceId, targetIds: targets } };
    }
    default:
      return { kind: "ignore" };
  }
}

export function attachDonCommand(targetId: string, amount: number): EngineCommand {
  return { type: "attachDon", seat: HUMAN_SEAT, targetId, amount };
}

export function attackCommand(attackerId: string, targetId: string): EngineCommand {
  return { type: "declareAttack", seat: HUMAN_SEAT, attackerId, targetId };
}

/** Pick-one prompts (yes/no, choose an option, how many...). */
export function promptOptionCommand(prompt: PromptView, optionId: string): EngineCommand {
  return { type: "resolvePrompt", seat: HUMAN_SEAT, promptId: prompt.id, optionId };
}

/**
 * Selection and ordering prompts. The "skip" option of a selection (no
 * blocker) is answered with an empty selection, like the bot does
 * (packages/opbot/src/engine/actions.ts).
 */
export function promptSelectionCommand(prompt: PromptView, selectedIds: readonly string[]): EngineCommand {
  const skip = new Set(prompt.options.filter((o) => o.skip).map((o) => o.id));
  return {
    type: "resolvePrompt",
    seat: HUMAN_SEAT,
    promptId: prompt.id,
    selectedIds: selectedIds.filter((id) => !skip.has(id)),
  };
}

/** Whether a selection respects the prompt's bounds (the engine checks the rest). */
export function selectionAllowed(prompt: PromptView, selectedIds: readonly string[]): boolean {
  const count = selectedIds.filter((id) => !prompt.options.find((o) => o.id === id)?.skip).length;
  if (prompt.mode === "order") return count === prompt.options.length;
  return count >= prompt.min && count <= prompt.max;
}

/** Descriptors the upstream board renders as buttons: setup and main-phase moves, never prompts. */
export function boardDescriptors(legal: readonly LegalCommandDescriptor[]): LegalCommandDescriptor[] {
  return legal.filter((d) => d.type !== "resolvePrompt" && d.type !== "chooseJoKenPo" && d.type !== "chooseFirstPlayer");
}
