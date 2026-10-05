import { describe, expect, test } from "vite-plus/test";
import { getAllCards } from "@tcg/op-cards";
import type { OPCard } from "@tcg/op-types";

/**
 * 2-4-3: a type written in { } brackets means cards with exactly that type; a
 * type in " " quotation marks ('a type including "X"') matches any type that
 * contains X (2-4-3-1). The card importer wrote substring matches for every
 * {Type}, so {Straw Hat Crew} also accepted {Fake Straw Hat Crew}. This guard
 * walks the whole catalog: every type filter and Leader type condition whose
 * value the card's own text writes in only one of the two forms must use that
 * form. New cards synced from upstream are checked too.
 *
 * Engine defaults differ: a `trait` filter is exact unless `match:
 * "includes"`; a `leaderTrait` condition is a substring match unless `match:
 * "exact"`.
 */

interface TypeCheck {
  readonly where: string;
  readonly value: string;
  readonly mode: "exact" | "includes";
}

function typeChecks(effects: unknown): TypeCheck[] {
  const out: TypeCheck[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (o.filter === "trait") {
      for (const value of Array.isArray(o.value) ? o.value : [o.value]) {
        if (typeof value === "string") {
          out.push({
            where: "trait filter",
            value,
            mode: o.match === "includes" ? "includes" : "exact",
          });
        }
      }
    }
    if (o.condition === "leaderTrait" && typeof o.trait === "string") {
      out.push({
        where: "leaderTrait",
        value: o.trait,
        mode: o.match === "exact" ? "exact" : "includes",
      });
    }
    for (const value of Object.values(o)) walk(value);
  };
  walk(effects);
  return out;
}

const normalize = (text: string) => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** How the printed text writes `value`, or null when it uses neither or both forms. */
function printedMode(text: string, value: string): "exact" | "includes" | null {
  const exact = text.includes(`{${value}}`);
  const includes = new RegExp(`includ\\w* "${escapeRegExp(value)}"`).test(text);
  return exact === includes ? null : exact ? "exact" : "includes";
}

describe('type filters follow the printed {Type} / type including "X" form (2-4-3)', () => {
  const cards = getAllCards() as readonly OPCard[];

  test("the catalog has type checks to verify", () => {
    expect(cards.filter((card) => typeChecks(card.effects).length > 0).length).toBeGreaterThan(400);
  });

  test("every type check uses the form its card prints", () => {
    const wrong: string[] = [];
    for (const card of cards) {
      // Leaders and Stages have no [Trigger] field in the card types.
      const trigger = "trigger" in card ? (card as { trigger?: string }).trigger : undefined;
      const text = normalize(`${card.effect ?? ""}\n${trigger ?? ""}`);
      const seen = new Set<string>();
      for (const check of typeChecks(card.effects)) {
        const key = `${check.where}:${check.value}:${check.mode}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const expected = printedMode(text, check.value);
        if (expected !== null && expected !== check.mode) {
          wrong.push(
            `${card.id} ${check.where} "${check.value}": ${check.mode}, printed ${expected}`,
          );
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});
