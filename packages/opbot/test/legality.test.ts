import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { checkDeck, engineTestDecks, type DeckList } from "../src/decks/deck.ts";
import { checkStandardLegality, standardBlock } from "../src/decks/legality.ts";
import { loadDeckPool } from "../src/decks/pool.ts";
import { allCards, getCard } from "../src/engine/internals.ts";

/**
 * A construction-legal deck: the given cards plus a filler of 4-ofs from OP-16
 * and OP-17 (Block 5) in the leader's colors, so that legality problems come
 * only from the cards a test puts in on purpose.
 */
function deckWith(leader: string, cards: Array<[string, number]> = []): DeckList {
  const colors = getCard(leader).color;
  const main = cards.flatMap(([id, n]) => Array<string>(n).fill(id));
  const chosen = new Set(cards.map(([id]) => id));
  for (const card of allCards) {
    if (main.length >= 50) break;
    if (card.cardType === "leader" || card.cardType === "don" || chosen.has(card.id)) continue;
    if (!/^OP1[67]-/.test(card.id) || !card.color.some((c) => colors.includes(c))) continue;
    main.push(...Array<string>(Math.min(4, 50 - main.length)).fill(card.id));
  }
  const deck = { name: `${leader} test`, leader, main };
  expect(checkDeck(deck).problems).toEqual([]);
  return deck;
}

describe("block of a card number", () => {
  test("set rule, exception lists and promos", () => {
    expect(standardBlock("OP01-035")).toEqual({ icon: 1, basis: "set" });
    // The EN card list shows "1" on the base OP-05 printings; OP-05 is Block 2.
    expect(standardBlock("OP05-060")).toEqual({ icon: 2, basis: "set" });
    expect(standardBlock("ST11-001")).toEqual({ icon: 2, basis: "set" });
    expect(standardBlock("ST15-002")).toEqual({ icon: 3, basis: "set" });
    expect(standardBlock("PRB02-001")).toEqual({ icon: 3, basis: "set" });
    expect(standardBlock("EB04-058")).toEqual({ icon: 4, basis: "set" });
    expect(standardBlock("OP16-001")).toEqual({ icon: 5, basis: "set" });
    // Block 1 reprinted in PRB-02, fixed to Block 4 until March 2029.
    expect(standardBlock("OP01-039")).toEqual({ icon: 4, basis: "fixed-block" });
    // Super Parallel numbers are legal whatever the printing (parallel id included).
    expect(standardBlock("OP01-016_p3")).toEqual({ icon: "X", basis: "super-parallel" });
    expect(standardBlock("P-014")).toEqual({ icon: 1, basis: "promo-list" });
    expect(standardBlock("P-073")).toEqual({ icon: 2, basis: "promo-list" });
    expect(standardBlock("P-105")).toEqual({ icon: 4, basis: "promo-list" });
    expect(standardBlock("P-038")).toBeNull(); // not in the EN card list
    expect(standardBlock("OP18-001")).toBeNull(); // future set
  });

  test("every card of the engine catalog has a known block", () => {
    const unknown = allCards.filter((c) => c.cardType !== "don" && standardBlock(c.id) === null);
    expect(unknown.map((c) => c.id)).toEqual([]);
  });
});

describe("checkStandardLegality", () => {
  test("OP14-020 Dracule Mihawk is banned from 2026-10-12, legal before", () => {
    const mihawk = deckWith("OP14-020");
    expect(checkStandardLegality(mihawk, "2026-10-11")).toEqual({ legal: true, problems: [] });
    const after = checkStandardLegality(mihawk, "2026-10-12");
    expect(after.legal).toBe(false);
    expect(after.problems).toEqual(["OP14-020 Dracule Mihawk: banned since 2026-10-12"]);
    expect(checkStandardLegality(mihawk)).toEqual(after); // default date is the ban date
  });

  test("a Block 1 card is rejected", () => {
    const result = checkStandardLegality(deckWith("OP17-020", [["OP01-035", 4]]));
    expect(result.legal).toBe(false);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toStartWith("OP01-035 ");
    expect(result.problems[0]).toContain("block 1");
  });

  test("exception-list cards are accepted despite their Block 1 icon", () => {
    // OP01-039 Killer: fixed to Block 4. OP01-016 Nami: Super Parallel number.
    expect(standardBlock("OP01-039")!.icon).toBe(4);
    expect(checkStandardLegality(deckWith("OP17-020", [["OP01-039", 4]]))).toEqual({ legal: true, problems: [] });
    expect(checkStandardLegality(deckWith("OP17-001", [["OP01-016", 4]]))).toEqual({ legal: true, problems: [] });
  });

  test("banned pairs are rejected only together and only once in force", () => {
    const luffyKatakuri = checkStandardLegality(deckWith("OP11-040", [["OP11-067", 4]]));
    expect(luffyKatakuri.legal).toBe(false);
    expect(luffyKatakuri.problems).toEqual([
      "banned pair since 2025-08-30: OP11-040 Monkey.D.Luffy + OP11-067 Charlotte Katakuri",
    ]);
    expect(checkStandardLegality(deckWith("OP11-040")).legal).toBe(true);

    const quasarBorsalino = deckWith("OP17-099", [["OP07-115", 4], ["EB04-058", 4]]);
    expect(checkStandardLegality(quasarBorsalino, "2026-04-09").legal).toBe(true);
    expect(checkStandardLegality(quasarBorsalino, "2026-04-10").problems).toEqual([
      "banned pair since 2026-04-10: OP07-115 I Re-Quasar Helllp!! + EB04-058 Borsalino",
    ]);
  });

  test("the six engine test decks are not Standard legal (OP-01..OP-04 cards)", () => {
    const decks = engineTestDecks();
    expect(decks).toHaveLength(6);
    for (const deck of decks) {
      const result = checkStandardLegality(deck);
      console.log(`${deck.name} (${deck.leader}): ILLEGAL in Standard\n  - ${result.problems.join("\n  - ")}`);
      expect(result.legal).toBe(false);
      expect(result.problems.some((p) => p.includes("block 1"))).toBe(true);
    }
    const blue = checkStandardLegality(decks.find((d) => d.leader === "OP03-040")!);
    expect(blue.problems).toContain("OP03-040 Nami: banned since 2025-08-30");
  });

  test("dates outside the 2026-27 season are refused", () => {
    const deck = deckWith("OP17-020");
    expect(() => checkStandardLegality(deck, "2026-03-31")).toThrow(RangeError);
    expect(() => checkStandardLegality(deck, "2027-04-01")).toThrow(RangeError);
    expect(() => checkStandardLegality(deck, "12/10/2026")).toThrow(RangeError);
    expect(() => checkStandardLegality(deck, "2026-09-31")).toThrow(RangeError);
    expect(checkStandardLegality(deck, "2027-03-31").legal).toBe(true);
  });
});

describe("checked-in deck pools", () => {
  // The arena loads this folder as "the meta"; a list that is not legal in
  // post-ban Standard would make every evaluation against it meaningless.
  test("decks/meta-op17-postban loads and is Standard-legal on 2026-10-12", () => {
    const pool = loadDeckPool(resolve(import.meta.dir, "../../../decks/meta-op17-postban"));
    expect(pool.length).toBeGreaterThanOrEqual(2);
    for (const deck of pool) expect({ deck: deck.name, ...checkStandardLegality(deck, "2026-10-12") }).toEqual({ deck: deck.name, legal: true, problems: [] });
  });
});
