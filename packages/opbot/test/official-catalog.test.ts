import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readMetaPool } from "../src/decks/catalog-command.ts";
import {
  analyzeAbilities,
  applySiteCorrections,
  buildCatalogReport,
  canonicalText,
  compareCard,
  compareCatalog,
  compareEffectText,
  countByCategory,
  deriveFixes,
  isJoinedTypes,
  mergePrintings,
  parseCardListHtml,
  parseSeriesOptions,
  printedAliases,
  splitAbilities,
  stripReminders,
  textTokens,
  type EngineCardData,
  type Mismatch,
  type OfficialCard,
  type OfficialPrinting,
} from "../src/decks/official-catalog.ts";
import { OfficialCardListClient } from "../src/decks/official-fetch.ts";

// Ten card blocks copied verbatim from the official card list pages.
const FIXTURE = readFileSync(join(import.meta.dir, "fixtures/official-cardlist.html"), "utf8");
const parsed = parseCardListHtml(FIXTURE, "569117");
const printing = (id: string) => parsed.printings.find((p) => p.printingId === id)!;
const official = mergePrintings(parsed.printings);
const card = (id: string) => official.get(id)!;

/** An engine card that agrees with the official one in every field. */
function engineCopy(o: OfficialCard, effects: EngineCardData["effects"] = {}): EngineCardData {
  return {
    id: o.id,
    name: o.name,
    cardType: o.cardType,
    color: o.colors,
    traits: o.types,
    ...(o.attributes.length > 0 && { attribute: o.attributes.length === 1 ? o.attributes[0] : o.attributes }),
    ...(o.cost !== null && { cost: o.cost }),
    ...(o.life !== null && { life: o.life }),
    ...(o.power !== null && { power: o.power }),
    ...(o.counter !== null && { counter: o.counter }),
    ...(o.trigger !== null && { trigger: o.trigger.replace("[Trigger] ", "") }),
    effect: o.effect,
    effects,
  };
}

const categories = (ms: readonly Mismatch[]) => ms.map((m) => m.category).sort();

describe("official card list parser", () => {
  test("series selector: ids, labels without the line-break tag, product codes", () => {
    expect(parseSeriesOptions(FIXTURE)).toEqual([
      { id: "569201", label: "EXTRA BOOSTER -MEMORIAL COLLECTION- [EB-01]", code: "EB-01" },
      { id: "569117", label: "BOOSTER PACK -THE WORLD\u2019S STRONGEST WARRIORS- [OP-17]", code: "OP-17" },
      { id: "569901", label: "Promotion card", code: null },
    ]);
  });

  test("every block is read; parallels and reprints map to the card number", () => {
    expect(parsed.skipped).toEqual([]);
    expect(parsed.printings).toHaveLength(10);
    expect(printing("OP17-001_p1").id).toBe("OP17-001");
    expect(printing("EB04-061_p2")).toMatchObject({ id: "EB04-061", rarity: "SEC", block: "X", seriesId: "569117" });
  });

  test("a Leader has Life, not cost; multicolor and multi-type values are split", () => {
    expect(printing("OP01-002")).toMatchObject({
      cardType: "leader",
      name: "Trafalgar Law",
      cost: null,
      life: 4,
      power: 5000,
      counter: null,
      colors: ["red", "green"],
      types: ["Supernovas", "Heart Pirates"],
      attributes: ["slash"],
    });
  });

  test("a Character: counter '-' is none, power '-' is 0, entities decoded", () => {
    expect(printing("OP17-027")).toMatchObject({ cost: 7, power: 9000, counter: null, attributes: ["ranged"] });
    expect(printing("OP17-021")).toMatchObject({ name: "Crone Oli", power: 0, counter: 2000 });
    expect(printing("ST32-001").name).toBe("Kin'emon");
    expect(printing("ST24-002")).toMatchObject({ name: "Kid & Killer", attributes: ["slash", "special"] });
  });

  test("an Event: cost '-' is 0, no power or attribute, trigger read apart", () => {
    expect(printing("OP17-076")).toMatchObject({
      cardType: "event",
      cost: 0,
      power: null,
      attributes: [],
      trigger: "[Trigger] DON!! \u22121: Draw 2 cards.",
    });
    expect(printing("OP17-019").trigger).toBe("[Trigger] Your Leader gains +1000 power during this turn.");
  });

  test("effect text keeps the site's raw <Slash> and turns <br> into a new line", () => {
    expect(printing("ST32-001").effect).toContain("rest your <Slash> attribute Leader");
    expect(printing("OP17-027").effect.split("\n")).toHaveLength(2);
  });

  test("printings merge into one card per number, the base printing first", () => {
    expect(card("OP17-001")).toMatchObject({ printings: ["OP17-001", "OP17-001_p1"], refPrinting: "OP17-001", inconsistent: [] });
    expect(card("EB04-061").refPrinting).toBe("EB04-061_p2");
    const p = printing("OP17-027");
    const variants: OfficialPrinting[] = [
      p,
      // Punctuation differences between printings are not inconsistencies...
      { ...p, printingId: "OP17-027_p1", effect: p.effect.replace("Characters.", "Characters .") },
      // ...a different power is.
      { ...p, printingId: "OP17-027_p2", power: 8000 },
    ];
    expect(mergePrintings(variants).get("OP17-027")!.inconsistent).toEqual(["power"]);
  });
});

describe("text normalization", () => {
  test("minus signs, circled costs, (Attribute) and DON!! costs", () => {
    expect(canonicalText("give \u22122000 and \uff0d1, \u2462")).toBe("give -2000 and -1, (3)");
    expect(stripReminders(canonicalText("[On Play] \u2462 (You may rest the specified number of DON!! cards.): Draw"))).toBe("[On Play] (3): Draw");
    expect(textTokens("[On Play] (3) (You may rest 3 cards.): Draw")).toEqual(textTokens("[On Play] \u2462: Draw"));
    expect(textTokens("without the (Special) attribute")).toEqual(textTokens("without the \uff1cSpecial\uff1e attribute"));
    // The engine's text lost the sign of DON!! costs; those are always negative.
    expect(textTokens("DON!! 2: Draw")).toEqual(textTokens("DON!! \u22122: Draw"));
    expect(textTokens("[DON!! x1]")).toEqual(["don", "x1"]);
    expect(textTokens("+4000")).not.toEqual(textTokens("-4000"));
  });
});

describe("ability structure", () => {
  test("abilities run together on the site are split; bullets and Then continue", () => {
    expect(splitAbilities("[On Play] Draw 1 card.[When Attacking] Rest 1.")).toEqual(["[On Play] Draw 1 card.", "[When Attacking] Rest 1."]);
    expect(splitAbilities("[Main] Choose one:\n\u2022 Draw 1.\n\u2022 Trash 1.\nThen, draw 1 card.")).toHaveLength(1);
    expect(splitAbilities("[Activate: Main] Look at the [Main] effect.")).toHaveLength(1);
  });

  test("each ability is classified", () => {
    const kinds = (text: string) => analyzeAbilities(text).map((a) => a.kind);
    expect(kinds("[Blocker] (After your opponent declares an attack...)")).toEqual(["keyword"]);
    expect(kinds("[DON!! x1] [When Attacking] Draw 1 card.")).toEqual(["timed"]);
    expect(analyzeAbilities("[On Play]/[When Attacking] Draw 1 card.")[0]!.timings).toEqual(["onPlay", "whenAttacking"]);
    expect(kinds("[Your Turn] This Character gains +2000 power.")).toEqual(["static"]);
    expect(kinds("If you only have Characters without a Counter, this card in your hand has a +2000 Counter.")).toEqual(["static"]);
    expect(kinds("[DON!! x1] This Character gains [Rush].")).toEqual(["static"]);
    expect(kinds("If one of your Characters would be removed from the field, you may trash 2 cards from your hand instead.")).toEqual([
      "replacement",
    ]);
    expect(kinds("When this Character is K.O.'d by your opponent's effect, draw 1 card.")).toEqual(["auto"]);
    expect(kinds("[Once Per Turn] This effect can be activated when your opponent attacks. Draw 1 card.")).toEqual(["auto"]);
    expect(kinds("[Your Turn] [Once Per Turn] If a Character is rested by your effect, draw 1 card.")).toEqual(["auto"]);
    const alias = "Under the rules of this game, also treat this card's name as [Trafalgar Law] and [Donquixote Rosinante].";
    expect(kinds(alias)).toEqual(["alias"]);
    expect(printedAliases(alias)).toEqual(["Trafalgar Law", "Donquixote Rosinante"]);
  });

  test("joined types: the official list glued with spaces, in any order", () => {
    expect(isJoinedTypes(["Kid Pirates Supernovas"], ["Supernovas", "Kid Pirates"])).toBe(true);
    expect(isJoinedTypes(["Animal Straw Hat Crew Drum Kingdom"], ["Animal", "Drum Kingdom", "Straw Hat Crew"])).toBe(true);
    expect(isJoinedTypes(["Navy", "SWORD Drake Pirates"], ["Navy", "SWORD", "Drake Pirates"])).toBe(true);
    expect(isJoinedTypes(["Film Straw Hat Crew"], ["FILM", "Straw Hat Crew"])).toBe(false); // case differs
    expect(isJoinedTypes(["Mountain Bandits Mountain Bandits"], ["Mountain Bandits"])).toBe(false);
    expect(isJoinedTypes(["Supernovas", "Kid Pirates"], ["Supernovas", "Kid Pirates"])).toBe(false);
  });
});

describe("engine vs official", () => {
  test("an engine card equal to the official one has no mismatch", () => {
    const blocks = { keywords: ["rushCharacter"], effects: [{ trigger: "onPlay" }] };
    expect(compareCard(engineCopy(card("OP17-027"), blocks), card("OP17-027"))).toEqual([]);
    // Formatting the importer left behind is not a difference.
    const legacyText = {
      ...engineCopy(card("OP17-027"), blocks),
      effect:
        '[Rush: Character]\n[On Play] If your Leader has the "Red-Haired Pirates" type, draw 1 card and rest up to 2 of your opponent\'s Characters.  This card has been officially errata\'d.',
    };
    expect(compareCard(legacyText, card("OP17-027"))).toEqual([]);
  });

  test("OP17-027 as imported: counter 9000 instead of none", () => {
    const blocks = { keywords: ["rushCharacter"], effects: [{ trigger: "onPlay" }] };
    const engine = { ...engineCopy(card("OP17-027"), blocks), counter: 9000 };
    expect(compareCard(engine, card("OP17-027"))).toEqual([
      { id: "OP17-027", name: "Benn.Beckman", category: "counter", engine: 9000, official: null },
    ]);
  });

  test("value categories: name, cost, attribute, colors, joined and other types", () => {
    const o = card("OP01-002");
    const engine: EngineCardData = {
      ...engineCopy(o, { effects: [{ trigger: "activateMain" }] }),
      name: "Trafalgar Law (TR)",
      life: 5,
      attribute: "strike",
      color: ["red"],
      traits: ["Heart Pirates Supernovas"],
    };
    expect(categories(compareCard(engine, o))).toEqual(["attribute", "colors", "life", "name", "types-joined"]);
    expect(categories(compareCard({ ...engine, name: o.name, life: 4, attribute: "slash", color: ["red", "green"], traits: ["NULL"] }, o))).toEqual([
      "types",
    ]);
  });

  test("[Trigger]: missing data and missing block are reported apart", () => {
    const o = card("OP17-019");
    const { trigger: _t, ...noTrigger } = engineCopy(o, { effects: [{ trigger: "main" }] });
    expect(categories(compareCard(noTrigger, o))).toEqual(["structure:trigger", "trigger"]);
    expect(categories(compareCard(engineCopy(o, { effects: [{ trigger: "main" }] }), o))).toEqual(["structure:trigger"]);
    expect(compareCard(engineCopy(o, { effects: [{ trigger: "main" }, { trigger: "trigger" }] }), o)).toEqual([]);
  });

  test("printed abilities without a block of their kind", () => {
    // OP17-076: [Counter] Event modelled as [Main].
    const o = card("OP17-076");
    const asMain = engineCopy(o, { effects: [{ trigger: "main" }, { trigger: "trigger" }] });
    expect(categories(compareCard(asMain, o))).toEqual(["structure:counter"]);
    // OP17-021: a replacement effect with no replacementEffects.
    const crone = card("OP17-021");
    expect(categories(compareCard(engineCopy(crone, {}), crone))).toEqual(["structure:replacement"]);
    expect(compareCard(engineCopy(crone, { replacementEffects: [{}] }), crone)).toEqual([]);
    // EB04-061: a static cost reduction in hand and a keyword line.
    const luffy = card("EB04-061");
    expect(categories(compareCard(engineCopy(luffy, { effects: [{ trigger: "onPlay" }] }), luffy))).toEqual(["structure:static"]);
    expect(compareCard(engineCopy(luffy, { effects: [{ trigger: "onPlay" }], permanentEffects: [{}] }), luffy)).toEqual([]);
    const beckman = card("OP17-027");
    expect(categories(compareCard(engineCopy(beckman, { effects: [{ trigger: "onPlay" }] }), beckman))).toEqual(["structure:keyword"]);
  });

  test("a sign lost in the text and in the block is reported; one lost only in the text is not", () => {
    const o: OfficialCard = { ...card("OP17-027"), effect: "[On Play] Give up to 1 of your opponent's Characters \u22123000 power during this turn." };
    const lostText = { ...engineCopy(o), effect: "[On Play] Give up to 1 of your opponent's Characters 3000 power during this turn." };
    const flipped = compareCard({ ...lostText, effects: { effects: [{ trigger: "onPlay", actions: [{ action: "modifyPower", value: 3000 }] } as { trigger: string }] } }, o);
    expect(categories(flipped)).toEqual(["effect-text", "structure:sign"]);
    const textOnly = compareCard({ ...lostText, effects: { effects: [{ trigger: "onPlay", actions: [{ action: "modifyPower", value: -3000 }] } as { trigger: string }] } }, o);
    expect(categories(textOnly)).toEqual(["effect-text"]);
  });

  test("effect text: errata are material, punctuation is not", () => {
    const printed = "[On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card and add it to your hand.";
    expect(compareEffectText(printed.replace("{Straw Hat Crew}", '"Straw Hat Crew"'), printed)).toBeNull();
    expect(compareEffectText(printed.replace("type card", "type Character card"), printed)!.material).toBe(true);
    expect(compareEffectText(printed.replace("5 cards", "4 cards"), printed)!.material).toBe(true);
    // A one-word slip that changes nothing ("you hand") is a difference, not a material one.
    expect(compareEffectText(printed.replace("your hand", "you hand"), printed)!.material).toBe(false);
    expect(compareEffectText(printed, `${printed} Then, draw 1 card during this turn.`)!.material).toBe(true);
  });

  test("engine cards missing from the official list are reported", () => {
    const ghost: EngineCardData = { id: "OP99-001", name: "Nobody", cardType: "character", color: ["red"] };
    expect(compareCatalog([ghost, { ...ghost, id: "DON-001", cardType: "don" }], official)).toEqual([
      { id: "OP99-001", name: "Nobody", category: "not-in-official", engine: "Nobody", official: null },
    ]);
  });
});

describe("site corrections, fixes and report", () => {
  test("a site correction applies only while the page still shows the wrong value", () => {
    const cards = mergePrintings(parsed.printings);
    const fix = { id: "OP17-027", field: "attributes" as const, shown: ["ranged"], printed: ["slash"] };
    expect(applySiteCorrections(cards, [fix, { ...fix, id: "OP17-021", shown: ["strike"] }])).toEqual([fix]);
    expect(cards.get("OP17-027")!.attributes).toEqual(["slash"]);
    expect(cards.get("OP17-021")!.attributes).toEqual(["slash"]);
  });

  test("an errata correction replaces the effect text the page still shows", () => {
    const cards = mergePrintings(parsed.printings);
    const shown = cards.get("OP17-027")!.effect;
    const errata = { id: "OP17-027", field: "effect" as const, shown, printed: "[On Play] Draw 1 card." };
    expect(applySiteCorrections(cards, [errata])).toEqual([errata]);
    expect(cards.get("OP17-027")!.effect).toBe("[On Play] Draw 1 card.");
    // Applied once: the page no longer shows the old text in this map.
    expect(applySiteCorrections(cards, [errata])).toEqual([]);
  });

  test("fixes copy the official value, with evidence and the file to edit", () => {
    const beckman = { ...engineCopy(card("OP17-027")), counter: 9000, traits: ["Red-Haired Pirates"] };
    const law = { ...engineCopy(card("OP01-002")), name: "Trafalgar Law (TR)", traits: ["Heart Pirates Supernovas"] };
    const searcher: EngineCardData = { id: "OP99-002", name: "Searcher", cardType: "event", color: ["red"], effects: { effects: [{ trigger: "main", filters: [{ value: "Trafalgar Law (TR)" }] } as { trigger: string }] } };
    const { trigger: _t, ...noTrigger } = engineCopy(card("OP17-019"));
    const engine = [beckman, law, noTrigger, searcher];
    const fixes = deriveFixes(compareCatalog(engine.slice(0, 3), official), official, engine, (id) => ({ card: `cards/${id}.ts`, i18n: `cards/${id}.i18n.ts` }));
    const byField = (id: string, field: string) => fixes.find((f) => f.id === id && f.field === field)!;
    expect(byField("OP17-027", "counter")).toMatchObject({ old: 9000, new: null, safe: true, file: "cards/OP17-027.ts" });
    expect(byField("OP17-027", "counter").evidence).toContain("?series=569117 (OP17-027)");
    expect(byField("OP01-002", "traits")).toMatchObject({ old: ["Heart Pirates Supernovas"], new: ["Supernovas", "Heart Pirates"], safe: true });
    expect(byField("OP01-002", "name")).toMatchObject({ new: "Trafalgar Law", safe: true });
    expect(byField("OP01-002", "name").caveat).toContain("OP99-002");
    expect(byField("OP01-002", "i18n.en.name").file).toBe("cards/OP01-002.i18n.ts");
    // The engine copy has no "trigger" block either, so the field alone is not enough.
    expect(byField("OP17-019", "trigger")).toMatchObject({
      old: null,
      new: "Your Leader gains +1000 power during this turn.",
      safe: true,
      needsBlock: "trigger",
    });
  });

  test("the report ranks meta pool cards first and counts by category", () => {
    const mismatches: Mismatch[] = [
      { id: "OP17-027", name: "Benn.Beckman", category: "counter", engine: 9000, official: null },
      { id: "OP01-002", name: "Trafalgar Law", category: "types-joined", engine: ["Heart Pirates Supernovas"], official: ["Supernovas", "Heart Pirates"] },
      { id: "OP17-021", name: "Crone Oli", category: "name", engine: "Crone Oil", official: "Crone Oli" },
    ];
    const input = {
      date: "2026-10-05",
      series: [{ id: "569117", label: "OP-17", code: "OP-17", printings: 10 }],
      printings: 10,
      official,
      engineCards: 3,
      mismatches,
      metaDecks: new Map([["OP17-027", ["OP17-020-shanks"]]]),
      isStandard: (id: string) => !id.startsWith("OP01"),
      missingFromEngine: ["ST32-001"],
      fixes: [],
      corrections: [],
      command: "pnpm opbot catalog-check",
    };
    expect(Object.fromEntries(countByCategory(input))).toEqual({
      name: { total: 1, meta: 0, standard: 1 },
      counter: { total: 1, meta: 1, standard: 1 },
      "types-joined": { total: 1, meta: 0, standard: 0 },
    });
    const report = buildCatalogReport(input);
    const meta = report.indexOf("## Cartas del pool del meta");
    const standard = report.indexOf("## Resto de cartas legales en Standard");
    const other = report.indexOf("## Cartas fuera de Standard");
    expect(report.indexOf("### OP17-027 Benn.Beckman")).toBeGreaterThan(meta);
    expect(report.indexOf("### OP17-027 Benn.Beckman")).toBeLessThan(standard);
    expect(report.indexOf("**OP17-021** Crone Oli")).toBeGreaterThan(standard);
    expect(report.indexOf("**OP01-002** Trafalgar Law")).toBeGreaterThan(other);
    expect(report).toContain("| `counter` | Counter distinto | 1 | 1 | 1 |");
    expect(report).toContain("- ST32 (1): ST32-001");
  });

  test("the meta pool is read from deck files, card numbers without printing suffixes", () => {
    const dir = mkdtempSync(join(tmpdir(), "catalog-pool-"));
    try {
      writeFileSync(join(dir, "a.txt"), "# source: x\n1xOP17-020\n4xOP17-027_p1\n4 OP99-001\n");
      writeFileSync(join(dir, "b.txt"), "OP17-027 x2\n");
      expect(Object.fromEntries(readMetaPool(dir))).toEqual({ "OP17-020": ["a"], "OP17-027": ["a", "b"], "OP99-001": ["a"] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("official list client", () => {
  function fakeClient(respond: (url: string) => Response) {
    const cacheDir = mkdtempSync(join(tmpdir(), "official-test-"));
    let clock = 1_000_000;
    const calls: Array<{ url: string; at: number }> = [];
    const client = new OfficialCardListClient({
      cacheDir,
      baseUrl: "https://example.test/cardlist/",
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      fetch: async (url) => {
        calls.push({ url, at: clock });
        return respond(url);
      },
    });
    return { client, calls, cleanup: () => rmSync(cacheDir, { recursive: true, force: true }) };
  }

  test("requests are spaced 2.5 s apart and pages are cached", async () => {
    const { client, calls, cleanup } = fakeClient(() => new Response(FIXTURE));
    try {
      expect((await client.seriesOptions()).map((s) => s.id)).toEqual(["569201", "569117", "569901"]);
      await client.page("569117");
      await client.page("569201");
      expect(calls.map((c) => c.at - calls[0]!.at)).toEqual([0, 2500, 5000]);
      expect(calls[1]!.url).toBe("https://example.test/cardlist/?series=569117");
      expect(await client.page("569117")).toBe(FIXTURE);
      expect(client.counts).toEqual({ network: 3, cached: 1 });
    } finally {
      cleanup();
    }
  });

  test("a page without card blocks is an error and is not cached", async () => {
    const { client, cleanup } = fakeClient(() => new Response("<html>maintenance</html>"));
    try {
      await expect(client.page("569117")).rejects.toThrow("no card blocks");
      expect(client.counts.network).toBe(0);
    } finally {
      cleanup();
    }
  });
});
