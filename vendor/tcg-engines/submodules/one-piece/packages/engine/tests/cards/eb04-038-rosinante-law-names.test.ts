import { describe, expect, test } from "vite-plus/test";
import { eb04RosinanteLaw038 } from "@tcg/op-cards";

import { cardNames } from "../../src/shared.ts";

/**
 * EB04-038 prints "Under the rules of this game, also treat this card's name
 * as [Trafalgar Law] and [Donquixote Rosinante]." The import had no alternate
 * names, so every [Trafalgar Law] or [Donquixote Rosinante] name check (search,
 * play and Leader-name effects) ignored the card.
 */
describe("EB04-038 Rosinante & Law", () => {
  test("is also named Trafalgar Law and Donquixote Rosinante", () => {
    expect(cardNames(eb04RosinanteLaw038)).toEqual(
      expect.arrayContaining(["Rosinante & Law", "Trafalgar Law", "Donquixote Rosinante"]),
    );
  });
});
