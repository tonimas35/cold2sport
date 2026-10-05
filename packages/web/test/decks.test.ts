/** The deck picker's catalog and the pasted-list parser. */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deckToText } from "@opbot/core/web";
import { loadDeckFile } from "../../opbot/src/decks/pool.ts";
import { createDeckCatalog, explainDeckProblem, metaStats } from "../src/decks/catalog.ts";
import { catalog, REPO } from "./helpers.ts";

const LUFFY = join(REPO, "decks/meta-op17-postban/OP17-079-monkey-d-luffy.txt");

describe("deck catalog", () => {
  test("lists the 9 meta decks by share, then the 6 engine test decks", () => {
    const meta = catalog.options.filter((o) => o.group === "meta");
    const tests = catalog.options.filter((o) => o.group === "test");
    expect(meta).toHaveLength(9);
    expect(tests).toHaveLength(6);
    expect(catalog.options.slice(0, 9)).toEqual(meta);
    const shares = meta.map((o) => o.share!);
    expect(shares).toEqual([...shares].sort((a, b) => b - a));
    const luffy = meta.find((o) => o.leaderId === "OP17-079")!;
    expect(luffy).toMatchObject({
      id: "meta:OP17-079-monkey-d-luffy",
      name: "OP17-079-monkey-d-luffy",
      leaderName: "Monkey.D.Luffy",
      colors: ["black"],
      share: 0.113,
      winRate: 0.571,
    });
    expect(luffy.leaderImageUrl).toStartWith("https://www.optcgapi.com/");
    expect(luffy.source).toContain("play.limitlesstcg.com");
    expect(tests.map((o) => o.name)).toEqual([
      "black-removal",
      "blue-control",
      "green-midrange",
      "purple-ramp",
      "red-aggro",
      "yellow-trigger",
    ]);
  });

  test("a catalog deck is exactly the deck `pnpm opbot play --deck <file>` loads", () => {
    const resolved = catalog.resolve({ kind: "catalog", id: "meta:OP17-079-monkey-d-luffy" });
    if (!("deck" in resolved)) throw new Error(resolved.errors.join());
    expect(resolved.deck).toEqual(loadDeckFile(LUFFY));
  });

  test("parses the meta stats comment", () => {
    expect(metaStats("# leader share: 22.3%, win rate: 48.9% (231 games)\n1xOP17-039")).toEqual({ share: 0.223, winRate: 0.489 });
    expect(metaStats("1xOP17-039")).toEqual({ share: null, winRate: null });
  });

  test("an empty catalog has no options", () => {
    expect(createDeckCatalog({ meta: {}, test: {} }).options).toEqual([]);
  });
});

describe("pasted lists", () => {
  const luffyText = readFileSync(LUFFY, "utf8");

  test("an OPTCGSim export is accepted, with an 'unaudited' warning", () => {
    const result = catalog.check({ kind: "text", text: luffyText, name: "mi luffy" });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.deck).toEqual({
      name: "mi luffy",
      leaderId: "OP17-079",
      leaderName: "Monkey.D.Luffy",
      colors: ["black"],
      cards: 50,
    });
    expect(result.warnings.join(" ")).toContain("no auditada");
    // Round trip through the CLI text format.
    const resolved = catalog.resolve({ kind: "text", text: luffyText });
    if (!("deck" in resolved)) throw new Error("expected a deck");
    expect(catalog.check({ kind: "text", text: deckToText(resolved.deck) }).ok).toBe(true);
  });

  test("other accepted line formats: '4 OP17-086' and 'OP17-086 x4'", () => {
    const lines = luffyText.split("\n").filter((l) => /^\dx/.test(l));
    const variant = lines.map((l, i) => {
      const [n, id] = l.split("x");
      return i % 2 === 0 ? `${n} ${id}` : `${id} x${n}`;
    });
    expect(catalog.check({ kind: "text", text: variant.join("\n") }).ok).toBe(true);
  });

  test("parse errors are reported line by line, in Spanish", () => {
    const result = catalog.check({ kind: "text", text: "1xOP17-079\n4xOP17-086\nhola\n4xOP99-999\n1xOP17-039" });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      "Línea 3: no se entiende «hola». Usa el formato 4xOP17-086.",
      "Línea 4: el motor no tiene la carta OP99-999.",
      "Línea 5: segundo Líder (OP17-039); solo puede haber uno.",
    ]);
  });

  test("a list without a Leader or with the wrong size is refused", () => {
    expect(catalog.check({ kind: "text", text: "4xOP17-086" }).errors).toEqual(["Falta el Líder (una línea como 1xOP17-079)."]);
    const short = catalog.check({ kind: "text", text: luffyText.replace(/^4xOP17-086$/m, "3xOP17-086") });
    expect(short.ok).toBe(false);
    expect(short.errors.length).toBeGreaterThan(0);
    expect(catalog.check({ kind: "text", text: "   " }).errors).toEqual(["La lista está vacía."]);
  });

  test("a list with a card off the Leader's colors is refused", () => {
    const offColor = luffyText.replace(/^4xOP17-086$/m, "4xOP01-016");
    const result = catalog.check({ kind: "text", text: offColor });
    expect(result.ok).toBe(false);
  });

  test("unknown messages pass through", () => {
    expect(explainDeckProblem("Deck must contain 50 cards")).toBe("Deck must contain 50 cards");
  });
});
