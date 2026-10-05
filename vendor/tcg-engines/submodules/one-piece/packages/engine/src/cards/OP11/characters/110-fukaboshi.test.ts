import { describe, expect, test } from "vite-plus/test";
import type { LeaderCard } from "@tcg/op-types";
import {
  eb01Doma005,
  eb01MountainGod018,
  op11FishManIsland117,
  op11Shirahoshi022,
  op12UrsaShock096,
} from "@tcg/op-cards";
import { op11Fukaboshi110 } from "../../../../../cards/src/cards/characters/op11-110-fukaboshi.ts";
import { registerCards } from "../../../../../cards/src/runtime-catalog.ts";

import { OnePieceTestEngine } from "../../../index.ts";

// A Leader with the Fish-Man Island type that is not [Shirahoshi].
const fishManIslandLeader: LeaderCard = {
  ...op11Shirahoshi022,
  id: "TEST-OP11-110-FISH-MAN-ISLAND-LEADER",
  canonicalId: "TEST-OP11-110-FISH-MAN-ISLAND-LEADER",
  name: "Fish-Man Island Typed Leader",
  traits: ["Fish-Man Island"],
  effects: undefined,
  i18n: { en: { ...op11Shirahoshi022.i18n.en, name: "Fish-Man Island Typed Leader" } },
};
registerCards([fishManIslandLeader]);

function koFukaboshi(south: { leaderCardId?: LeaderCard; stage?: typeof op11FishManIsland117 }) {
  const engine = OnePieceTestEngine.create(
    { leaderCardId: south.leaderCardId, character: [op11Fukaboshi110], stage: south.stage },
    { hand: [op12UrsaShock096], activeDon: op12UrsaShock096.cost },
    { firstPlayer: "south", activeSeat: "north" },
  );
  const fukaboshiId = engine.findCardInZone("south", "character", op11Fukaboshi110);
  engine.playCard(op12UrsaShock096, "north");
  engine.resolveDecision("effectTargetSelection", { selectedIds: [fukaboshiId] }, "north");
  return { engine, fukaboshiId };
}

describe("OP11-110 Fukaboshi", () => {
  test("may rest its Fish-Man Island Leader instead of being K.O.'d", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: op11Shirahoshi022, character: [op11Fukaboshi110] },
      { hand: [op12UrsaShock096], activeDon: op12UrsaShock096.cost },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const fukaboshiId = engine.findCardInZone("south", "character", op11Fukaboshi110);

    engine.playCard(op12UrsaShock096, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [fukaboshiId] }, "north");

    const replacement = engine.pendingDecision("effectKoReplacement", "south").steps[0];
    expect(replacement?.kind).toBe("confirm");
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");

    const view = engine.getView("south");
    expect(view.players.south.leader.rested).toBe(true);
    expect(view.players.south.characters.map((card) => card?.instanceId)).toContain(fukaboshiId);
    expect(view.prompts).toHaveLength(0);
  });

  // "[Fish-Man Island]" in brackets is a card name (the OP11-117 Stage), not
  // the {Fish-Man Island} type.
  test("may rest its [Fish-Man Island] Stage instead under any Leader", () => {
    const { engine, fukaboshiId } = koFukaboshi({ stage: op11FishManIsland117 });

    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");

    const view = engine.getView("south");
    expect(view.players.south.stage?.rested).toBe(true);
    expect(view.players.south.leader.rested).toBe(false);
    expect(view.players.south.characters.map((card) => card?.instanceId)).toContain(fukaboshiId);
    expect(view.prompts).toHaveLength(0);
  });

  test("a Leader with the Fish-Man Island type but another name cannot be rested instead", () => {
    const { engine, fukaboshiId } = koFukaboshi({ leaderCardId: fishManIslandLeader });

    expect(() => engine.pendingDecision("effectKoReplacement", "south")).toThrow();
    const view = engine.getView("south");
    expect(view.players.south.leader.rested).toBe(false);
    expect(view.players.south.trash.map((card) => card.instanceId)).toContain(fukaboshiId);
  });

  test("takes either end of Life before K.O.'ing a cost-1-or-less opponent", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [op11Fukaboshi110],
        life: [eb01Doma005, eb01MountainGod018],
        activeDon: op11Fukaboshi110.cost,
      },
      { character: [eb01Doma005, eb01MountainGod018] },
    );
    const bottomLifeId = engine.findCardInZone("south", "life", eb01MountainGod018);
    const eligibleId = engine.findCardInZone("north", "character", eb01Doma005);
    const excludedId = engine.findCardInZone("north", "character", eb01MountainGod018);

    engine.playCard(op11Fukaboshi110, "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    engine.resolveDecision("effectCostAddLifeToHand", { optionId: "bottom" }, "south");

    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected Fukaboshi's K.O. target.");
    expect(target.candidates.map((candidate) => candidate.ref.id)).toContain(eligibleId);
    expect(target.candidates.map((candidate) => candidate.ref.id)).not.toContain(excludedId);
    engine.resolveDecision("effectTargetSelection", { selectedIds: [eligibleId] }, "south");

    const view = engine.getView("south");
    expect(view.players.south.hand.map((card) => card.instanceId)).toContain(bottomLifeId);
    expect(view.players.north.trash.map((card) => card.instanceId)).toContain(eligibleId);
    expect(view.prompts).toHaveLength(0);
  });

  test("may decline optional so paid effect does not apply", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [op11Fukaboshi110],
        life: [eb01Doma005, eb01MountainGod018],
        activeDon: op11Fukaboshi110.cost,
      },
      { character: [eb01Doma005, eb01MountainGod018] },
    );
    engine.playCard(op11Fukaboshi110, "south");
    const before = engine.getView("south").players.south;
    const donPoolBefore = before.activeDon + before.restedDon;
    const donDeckBefore = before.donDeckCount;
    const handBefore = before.hand.length;
    const lifeBefore = before.lifeCount;
    const deckBefore = before.deckCount;
    const trashBefore = before.trash.length;
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    const after = engine.getView("south").players.south;
    expect(after.activeDon + after.restedDon).toBe(donPoolBefore);
    expect(after.donDeckCount).toBe(donDeckBefore);
    expect(after.hand.length).toBe(handBefore);
    expect(after.lifeCount).toBe(lifeBefore);
    expect(after.deckCount).toBe(deckBefore);
    expect(after.trash.length).toBe(trashBefore);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
