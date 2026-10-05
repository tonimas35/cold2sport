import * as cardExports from "@tcg/op-cards";
import type { OPCard } from "@tcg/op-types";
import { describe, expect, test } from "vite-plus/test";

/**
 * Catalog invariant: a permanent cost modifier a card applies to itself is
 * either Character text ("This Character gains +X cost.", which rule 2-8-2
 * limits to the Character area) or hand text ("give this card in your hand -X
 * cost", which exists only in hand). No printed text does both, so a target
 * listing both the "hand" and "character" zones makes the card pay the field
 * cost from hand or keep the hand discount on the field (both happened: a
 * cost-5 Character that could only be played for 11, a cost-8 one that was
 * cost 5 on the field).
 */

function isCard(value: unknown): value is OPCard {
  return typeof value === "object" && value !== null && "id" in value && "cardType" in value;
}

function walk(value: unknown, visit: (node: Record<string, unknown>) => void) {
  if (typeof value !== "object" || value === null) return;
  visit(value as Record<string, unknown>);
  for (const child of Object.values(value)) walk(child, visit);
}

describe("self cost modifiers", () => {
  test("never target both the hand and the Character area", () => {
    const offenders = new Set<string>();
    for (const card of Object.values(cardExports as Record<string, unknown>).filter(isCard)) {
      const permanentEffects = card.effects?.permanentEffects ?? [];
      walk(permanentEffects, (node) => {
        const target = node.target as { self?: boolean; zones?: string[] } | undefined;
        if (
          (node.action === "modifyCost" || node.action === "setCost") &&
          target?.self === true &&
          target.zones?.includes("hand") &&
          target.zones.includes("character")
        ) {
          offenders.add(card.id);
        }
      });
    }
    expect([...offenders].sort()).toEqual([]);
  });
});
