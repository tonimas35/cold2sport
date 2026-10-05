import { describe, expect, test } from "vite-plus/test";
import type { EventCard } from "@tcg/op-types";
import { eb01Doma005, eb01Fourtricks025 } from "@tcg/op-cards";
import { op13StJaygarciaSaturn083 } from "../../../../../cards/src/cards/characters/op13-083-st-jaygarcia-saturn.ts";
import { op13StShepherdJuPeter084 } from "../../../../../cards/src/cards/characters/op13-084-st-shepherd-ju-peter.ts";

import { registerCards } from "../../../../../cards/src/runtime-catalog.ts";
import { OnePieceTestEngine } from "../../../index.ts";

const koByEffect: EventCard = {
  id: "TEST-OP13-084-KO",
  canonicalId: "TEST-OP13-084-KO",
  slug: "test-op13-084-ko",
  name: "K.O. by Effect",
  printings: [],
  cardType: "event",
  color: ["black"],
  rarity: "C",
  setId: "TEST",
  cost: 0,
  traits: [],
  effect: "[Main] K.O. up to 1 of your opponent's Characters.",
  effects: {
    effects: [
      {
        trigger: "main",
        actions: [
          {
            action: "ko",
            target: {
              player: "opponent",
              zones: ["character"],
              count: { amount: 1, upTo: true },
            },
          },
        ],
      },
    ],
  },
  i18n: { en: { name: "K.O. by Effect" } },
};

registerCards([koByEffect]);

describe("OP13-084 St. Shepherd Ju Peter", () => {
  // The printed card has no [On Play]: the import carried another Five Elder's
  // search. Its second ability is "[Your Turn] If you have 10 or more cards in
  // your trash, set the base power of all of your {Five Elders} type
  // Characters to 7000." (official card list).
  test("[Your Turn] with 10 trash cards sets every own Five Elders base power to 7000", () => {
    const fiveElders = (trash: number) =>
      OnePieceTestEngine.create(
        {
          hand: [op13StShepherdJuPeter084],
          character: [op13StJaygarciaSaturn083, eb01Doma005],
          trash,
          activeDon: op13StShepherdJuPeter084.cost,
        },
        { character: [op13StJaygarciaSaturn083] },
        { firstPlayer: "north", activeSeat: "south" },
      );
    const engine = fiveElders(10);
    const saturnId = engine.findCardInZone("south", "character", op13StJaygarciaSaturn083);
    const domaId = engine.findCardInZone("south", "character", eb01Doma005);
    const opposingSaturnId = engine.findCardInZone("north", "character", op13StJaygarciaSaturn083);
    const powerOf = (seat: "south" | "north", id: string) =>
      engine.getView("south").players[seat].characters.find((card) => card?.instanceId === id)
        ?.power;

    // No [On Play]: playing it opens no search.
    engine.playCard(op13StShepherdJuPeter084, "south");
    const juPeterId = engine.findCardInZone("south", "character", op13StShepherdJuPeter084);
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getView("south").players.south.deckCount).toBe(10);

    expect(powerOf("south", juPeterId)).toBe(7000);
    expect(powerOf("south", saturnId)).toBe(7000);
    expect(powerOf("south", domaId)).toBe(eb01Doma005.power);
    expect(powerOf("north", opposingSaturnId)).toBe(op13StJaygarciaSaturn083.power);

    // Only during your turn.
    engine.endTurn("south");
    expect(powerOf("south", juPeterId)).toBe(op13StShepherdJuPeter084.power);
    expect(powerOf("south", saturnId)).toBe(op13StJaygarciaSaturn083.power);

    // 9 trash cards is not enough.
    const nine = fiveElders(9);
    nine.playCard(op13StShepherdJuPeter084, "south");
    expect(
      nine
        .getView("south")
        .players.south.characters.find((card) => card?.cardId === op13StShepherdJuPeter084.id)
        ?.power,
    ).toBe(op13StShepherdJuPeter084.power);
  });

  test("at seven trash cards survives an opponent effect while another Character is removable", () => {
    const engine = OnePieceTestEngine.create(
      {
        character: [op13StShepherdJuPeter084, eb01Doma005],
        trash: Array.from({ length: 7 }, () => eb01Fourtricks025),
      },
      { hand: [koByEffect] },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const juPeterId = engine.findCardInZone("south", "character", op13StShepherdJuPeter084);
    const unprotectedId = engine.findCardInZone("south", "character", eb01Doma005);

    engine.playCard(koByEffect, "north");
    const target = engine.pendingDecision("effectTargetSelection", "north").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the opposing removal choice.");
    const candidates = target.candidates.map((candidate) => candidate.ref.id);
    expect(candidates).not.toContain(juPeterId);
    expect(candidates).toContain(unprotectedId);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [unprotectedId] }, "north");

    const view = engine.getView("south");
    expect(view.players.south.characters.map((card) => card?.instanceId)).toContain(juPeterId);
    expect(view.players.south.trash.map((card) => card.instanceId)).toContain(unprotectedId);
    expect(view.prompts).toHaveLength(0);
  });
});
