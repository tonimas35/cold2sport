import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01Fourtricks025,
  eb01MountainGod018,
  eb01TBone049,
  op01MsAllSunday079,
  op05Enel100,
  op06GravityBladeRagingTiger058,
  op09BennBeckman009,
  op17Loki119,
  op17MonkeyDLuffy079,
  op17Nami086,
  op17RoronoaZoro095,
  op17Sanji082,
} from "@tcg/op-cards";
import type { CharacterCard, EventCard } from "@tcg/op-types";

import type { OnePieceTestEngine as Engine } from "../../../src/index.ts";
import { OnePieceTestEngine } from "../../../src/index.ts";
import type { PromptResolutionContext } from "../../../src/types.ts";

// "If one of your Characters would be removed from the field by your
// opponent's effect, you may place 3 cards from your trash at the bottom of
// your deck in any order instead."
// OP17 FAQ: it also saves Zoro himself, and if 2 Characters would leave the
// field at the same time, placing 3 cards keeps both (rule 8-1-3-4-4). It is
// optional and has no [Once Per Turn] limit; battle K.O.s are not effects.

const FIVE_TRASH = [
  eb01Doma005,
  eb01Fourtricks025,
  eb01MountainGod018,
  op01MsAllSunday079,
  op17Sanji082,
];

const OPPONENTS_TURN = { firstPlayer: "south", activeSeat: "north" } as const;

function southIds(engine: Engine, zone: "trash" | "character") {
  const south = engine.getView("south").players.south;
  return (zone === "trash" ? south.trash : south.characters)
    .map((card) => card?.instanceId)
    .filter((id): id is string => Boolean(id));
}

function setup(
  north: { hand: (CharacterCard | EventCard)[]; activeDon: number },
  trash: CharacterCard[] = FIVE_TRASH,
) {
  const engine = OnePieceTestEngine.create(
    {
      leaderCardId: op17MonkeyDLuffy079,
      character: [op17RoronoaZoro095, op17Nami086],
      trash,
      deck: 10,
    },
    { ...north, deck: 10 },
    OPPONENTS_TURN,
  );
  return {
    engine,
    zoroId: engine.findCardInZone("south", "character", op17RoronoaZoro095),
    namiId: engine.findCardInZone("south", "character", op17Nami086),
    trashIds: southIds(engine, "trash"),
  };
}

/** The pending replacement prompt for south: whose copy offers it, and what it covers. */
function pendingReplacement(
  engine: Engine,
  intent: "effectKoReplacement" | "effectRemovalReplacement",
) {
  const context = engine
    .getState()
    .promptQueue.find(
      (prompt) => prompt.status === "pending" && prompt.resolutionContext?.intent === intent,
    )?.resolutionContext as Extract<PromptResolutionContext, { intent: typeof intent }> | undefined;
  if (!context) throw new Error(`Expected a pending ${intent} prompt.`);
  return {
    sourceId: context.replacementSourceInstanceId,
    covers: context.replacementTargetIds,
  };
}

/** South chooses 3 trash cards, then their order at the bottom of the deck. */
function payThreeFromTrash(engine: Engine, chosen: string[], order: string[]) {
  const pick = engine.pendingDecision("effectTargetSelection", "south").steps[0];
  if (pick?.kind !== "selectEntity") throw new Error("Expected Zoro's trash payment choice.");
  expect(pick).toMatchObject({ min: 3, max: 3 });
  engine.resolveDecision("effectTargetSelection", { selectedIds: chosen }, "south");
  engine.resolveDecision("effectReturnToDeckOwnerOrder", { selectedIds: order }, "south");
  expect(engine.getState().players.south.deck.slice(-3)).toEqual(order);
}

describe("OP17-095 Roronoa Zoro", () => {
  test("replaces an opponent's effect K.O. of another Character with 3 trash cards in chosen order", () => {
    const { engine, zoroId, namiId, trashIds } = setup({ hand: [op17Loki119], activeDon: 6 });

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [namiId] }, "north");
    expect(engine.pendingDecision("effectKoReplacement", "south").actorId).toBe("south");
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    const [t0, t1, t2, t3, t4] = trashIds as [string, string, string, string, string];
    payThreeFromTrash(engine, [t2, t0, t4], [t4, t2, t0]);

    expect(southIds(engine, "character")).toEqual([zoroId, namiId]);
    expect(southIds(engine, "trash")).toEqual([t1, t3]);
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("may be declined, and the Character is K.O.'d", () => {
    const { engine, namiId, trashIds } = setup({ hand: [op17Loki119], activeDon: 6 });

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [namiId] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "no" }, "south");

    expect(southIds(engine, "trash")).toEqual([...trashIds, namiId]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("replaces a non-K.O. removal: an opponent's effect trashing a Character", () => {
    const { engine, zoroId, namiId, trashIds } = setup({
      hand: [op09BennBeckman009],
      activeDon: 7,
    });

    engine.playCard(op09BennBeckman009, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [namiId] }, "north");
    engine.resolveDecision("effectRemovalReplacement", { optionId: "yes" }, "south");
    const [t0, t1, t2] = trashIds as [string, string, string];
    payThreeFromTrash(engine, [t0, t1, t2], [t0, t1, t2]);

    expect(southIds(engine, "character")).toEqual([zoroId, namiId]);
    expect(southIds(engine, "trash")).toHaveLength(2);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("also saves Zoro himself (OP17 FAQ)", () => {
    const { engine, zoroId, namiId, trashIds } = setup(
      { hand: [eb01TBone049], activeDon: 5 },
      FIVE_TRASH.slice(0, 3),
    );

    engine.playCard(eb01TBone049, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroId] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    // Exactly 3 trash cards: all of them are paid, only their order is chosen.
    const order = [trashIds[1]!, trashIds[2]!, trashIds[0]!];
    engine.resolveDecision("effectReturnToDeckOwnerOrder", { selectedIds: order }, "south");

    expect(engine.getState().players.south.deck.slice(-3)).toEqual(order);
    expect(southIds(engine, "character")).toEqual([zoroId, namiId]);
    expect(southIds(engine, "trash")).toEqual([]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("two Characters K.O.'d at the same time cost only 3 cards and neither leaves (OP17 FAQ)", () => {
    const { engine, zoroId, namiId, trashIds } = setup({ hand: [op17Loki119], activeDon: 6 });

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroId, namiId] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    const [t0, t1, t2, t3, t4] = trashIds as [string, string, string, string, string];
    payThreeFromTrash(engine, [t0, t1, t2], [t2, t1, t0]);

    expect(southIds(engine, "character")).toEqual([zoroId, namiId]);
    expect(southIds(engine, "trash")).toEqual([t3, t4]);
    // A single replacement covered both: no second offer for Nami.
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("two Characters placed at the bottom of the deck at the same time cost only 3 cards", () => {
    const { engine, zoroId, namiId, trashIds } = setup({
      hand: [op06GravityBladeRagingTiger058],
      activeDon: 7,
    });

    engine.playCard(op06GravityBladeRagingTiger058, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroId, namiId] }, "north");
    // The owner orders the two Characters for the deck before replacements are
    // checked (existing engine order for multi-card bottom-deck placement).
    engine.resolveDecision(
      "effectReturnToDeckOwnerOrder",
      { selectedIds: [zoroId, namiId] },
      "south",
    );
    engine.resolveDecision("effectRemovalReplacement", { optionId: "yes" }, "south");
    const [t0, t1, t2, t3, t4] = trashIds as [string, string, string, string, string];
    payThreeFromTrash(engine, [t4, t3, t2], [t4, t3, t2]);

    expect(southIds(engine, "character")).toEqual([zoroId, namiId]);
    expect(southIds(engine, "trash")).toEqual([t0, t1]);
    expect(engine.getState().players.south.deck).not.toContain(namiId);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("has no once-per-turn limit: two separate removals in one turn are both replaced", () => {
    const { engine, zoroId, namiId, trashIds } = setup(
      { hand: [eb01TBone049, eb01TBone049], activeDon: 10 },
      [...FIVE_TRASH, eb01Doma005],
    );

    engine.playCard(eb01TBone049, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroId] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    payThreeFromTrash(engine, trashIds.slice(0, 3), trashIds.slice(0, 3));

    engine.playCard(eb01TBone049, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [namiId] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    // The last 3 trash cards are all that is left: only their order is asked.
    const lastThree = trashIds.slice(3);
    engine.resolveDecision("effectReturnToDeckOwnerOrder", { selectedIds: lastThree }, "south");

    expect(southIds(engine, "character")).toEqual([zoroId, namiId]);
    expect(southIds(engine, "trash")).toEqual([]);
    expect(engine.getView("south").prompts).toHaveLength(0);
    // Uses are recorded once per key (only [Once Per Turn] reads them), so an
    // unlimited replacement does not grow the list on every application.
    expect(engine.getState().cards[zoroId]?.usedEffectKeys).toEqual([
      "replacement:removeFromField:0",
    ]);
  });

  test("is not offered with fewer than 3 cards in the trash", () => {
    const { engine, namiId, trashIds } = setup(
      { hand: [op17Loki119], activeDon: 6 },
      FIVE_TRASH.slice(0, 2),
    );

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [namiId] }, "north");

    expect(() => engine.pendingDecision("effectKoReplacement", "south")).toThrow();
    expect(southIds(engine, "trash")).toEqual([...trashIds, namiId]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("does not replace a battle K.O.", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17MonkeyDLuffy079,
        character: [op17RoronoaZoro095, { card: op17Nami086, rested: true }],
        trash: FIVE_TRASH,
        deck: 10,
      },
      { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }], deck: 10 },
      OPPONENTS_TURN,
    );
    const namiId = engine.findCardInZone("south", "character", op17Nami086);
    const attackerId = engine.findCardInZone("north", "character", eb01MountainGod018);

    engine.declareAttack(attackerId, namiId, "north");

    expect(() => engine.pendingDecision("battleKoReplacement", "south")).toThrow();
    expect(southIds(engine, "trash")).toContain(namiId);
    expect(southIds(engine, "trash")).toHaveLength(6);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("a trash card it places in the deck does not 'leave the field' (no self-replacement offered)", () => {
    // Enel's "If this Character would leave the field ... instead" is Character
    // text (rule 2-8-2); paying Zoro's cost with Enel from the trash must not
    // offer it.
    const { engine, zoroId, namiId } = setup({ hand: [eb01TBone049], activeDon: 5 }, [
      op05Enel100,
      eb01Doma005,
      eb01Fourtricks025,
    ]);
    const enelId = engine.findCardInZone("south", "trash", op05Enel100);

    engine.playCard(eb01TBone049, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroId] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    const order = southIds(engine, "trash");
    engine.resolveDecision("effectReturnToDeckOwnerOrder", { selectedIds: order }, "south");

    expect(() => engine.pendingDecision("effectRemovalReplacement", "south")).toThrow();
    expect(engine.getState().players.south.deck.slice(-3)).toEqual(order);
    expect(engine.getState().players.south.deck).toContain(enelId);
    expect(southIds(engine, "character")).toEqual([zoroId, namiId]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  // OP17 FAQ: for 2 Characters leaving at once the choice is "place 3 cards
  // and neither leaves" or let both leave. Rule 8-1-3-4-1: a declined
  // replacement is not applied, so it is not offered again for the second
  // Character of the same removal (that would save one of the two for 3).
  test("declining for 2 Characters K.O.'d at once K.O.s both, with no second offer", () => {
    const { engine, zoroId, namiId, trashIds } = setup({ hand: [op17Loki119], activeDon: 6 });

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [namiId, zoroId] }, "north");
    expect(pendingReplacement(engine, "effectKoReplacement")).toEqual({
      sourceId: zoroId,
      covers: [namiId, zoroId],
    });
    engine.resolveDecision("effectKoReplacement", { optionId: "no" }, "south");

    expect(southIds(engine, "character")).toEqual([]);
    expect(southIds(engine, "trash")).toEqual([...trashIds, namiId, zoroId]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("declining for 2 Characters placed in the deck at once removes both, with no second offer", () => {
    const { engine, zoroId, namiId, trashIds } = setup({
      hand: [op06GravityBladeRagingTiger058],
      activeDon: 7,
    });

    engine.playCard(op06GravityBladeRagingTiger058, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [namiId, zoroId] }, "north");
    engine.resolveDecision(
      "effectReturnToDeckOwnerOrder",
      { selectedIds: [namiId, zoroId] },
      "south",
    );
    expect(pendingReplacement(engine, "effectRemovalReplacement").covers).toEqual([namiId, zoroId]);
    engine.resolveDecision("effectRemovalReplacement", { optionId: "no" }, "south");

    expect(southIds(engine, "character")).toEqual([]);
    expect(southIds(engine, "trash")).toEqual(trashIds);
    expect(engine.getState().players.south.deck.slice(-2)).toEqual([namiId, zoroId]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});

// Two copies on the field. Each copy has its own replacement effect, and a
// targeted Zoro finds its own copy first. Either copy covers every Character
// the opponent's effect removes at once (8-1-3-4-4, OP17 FAQ), so the group
// must be built from the offered copy, not from each target's first match.
describe("OP17-095 Roronoa Zoro, two copies", () => {
  function setupTwo(
    north: { hand: (CharacterCard | EventCard)[]; activeDon: number },
    trash: CharacterCard[] = FIVE_TRASH,
    withNami = false,
  ) {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17MonkeyDLuffy079,
        character: withNami
          ? [op17RoronoaZoro095, op17Nami086, op17RoronoaZoro095]
          : [op17RoronoaZoro095, op17RoronoaZoro095],
        trash,
        deck: 10,
      },
      { ...north, deck: 10 },
      OPPONENTS_TURN,
    );
    const characters = southIds(engine, "character");
    const zoroIds = characters.filter(
      (id) => engine.getState().cards[id]?.cardId === op17RoronoaZoro095.id,
    ) as [string, string];
    return {
      engine,
      zoroA: zoroIds[0],
      zoroB: zoroIds[1],
      namiId: withNami ? engine.findCardInZone("south", "character", op17Nami086) : "",
      trashIds: southIds(engine, "trash"),
    };
  }

  test("both Zoros K.O.'d at once: one offer, 3 cards, both stay", () => {
    const { engine, zoroA, zoroB, trashIds } = setupTwo({ hand: [op17Loki119], activeDon: 6 });

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroA, zoroB] }, "north");
    expect(pendingReplacement(engine, "effectKoReplacement")).toEqual({
      sourceId: zoroA,
      covers: [zoroA, zoroB],
    });
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    const [t0, t1, t2, t3, t4] = trashIds as [string, string, string, string, string];
    payThreeFromTrash(engine, [t0, t1, t2], [t0, t1, t2]);

    expect(southIds(engine, "character")).toEqual([zoroA, zoroB]);
    expect(southIds(engine, "trash")).toEqual([t3, t4]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("both Zoros K.O.'d at once with exactly 3 trash cards: both stay", () => {
    const { engine, zoroA, zoroB, trashIds } = setupTwo(
      { hand: [op17Loki119], activeDon: 6 },
      FIVE_TRASH.slice(0, 3),
    );

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroA, zoroB] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    engine.resolveDecision("effectReturnToDeckOwnerOrder", { selectedIds: trashIds }, "south");

    expect(southIds(engine, "character")).toEqual([zoroA, zoroB]);
    expect(southIds(engine, "trash")).toEqual([]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("Nami and the second Zoro K.O.'d at once, first Zoro untouched: both saved for 3", () => {
    const { engine, zoroA, zoroB, namiId, trashIds } = setupTwo(
      { hand: [op17Loki119], activeDon: 6 },
      FIVE_TRASH,
      true,
    );

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [namiId, zoroB] }, "north");
    expect(pendingReplacement(engine, "effectKoReplacement").covers).toEqual([namiId, zoroB]);
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    const [t0, t1, t2, t3, t4] = trashIds as [string, string, string, string, string];
    payThreeFromTrash(engine, [t2, t3, t4], [t4, t3, t2]);

    expect(southIds(engine, "character")).toEqual([zoroA, namiId, zoroB]);
    expect(southIds(engine, "trash")).toEqual([t0, t1]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("both Zoros placed at the bottom of the deck at once: one offer covers both", () => {
    const { engine, zoroA, zoroB, trashIds } = setupTwo(
      { hand: [op06GravityBladeRagingTiger058], activeDon: 7 },
      FIVE_TRASH.slice(0, 4),
    );

    engine.playCard(op06GravityBladeRagingTiger058, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroA, zoroB] }, "north");
    engine.resolveDecision(
      "effectReturnToDeckOwnerOrder",
      { selectedIds: [zoroA, zoroB] },
      "south",
    );
    expect(pendingReplacement(engine, "effectRemovalReplacement").covers).toEqual([zoroA, zoroB]);
    engine.resolveDecision("effectRemovalReplacement", { optionId: "yes" }, "south");
    const [t0, t1, t2, t3] = trashIds as [string, string, string, string];
    payThreeFromTrash(engine, [t0, t1, t2], [t0, t1, t2]);

    expect(southIds(engine, "character")).toEqual([zoroA, zoroB]);
    expect(southIds(engine, "trash")).toEqual([t3]);
    expect(engine.getState().players.south.deck).not.toContain(zoroA);
    expect(engine.getState().players.south.deck).not.toContain(zoroB);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  // 8-1-3-4-2: when several replacements could apply, declining one leaves
  // the others available. The second copy's replacement is then offered for
  // the same group, so the outcomes stay "keep both" or "lose both".
  test("declining the first copy offers the second copy for the same group", () => {
    const { engine, zoroA, zoroB, trashIds } = setupTwo({ hand: [op17Loki119], activeDon: 6 });

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroA, zoroB] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "no" }, "south");
    expect(pendingReplacement(engine, "effectKoReplacement")).toEqual({
      sourceId: zoroB,
      covers: [zoroA, zoroB],
    });
    engine.resolveDecision("effectKoReplacement", { optionId: "yes" }, "south");
    payThreeFromTrash(engine, trashIds.slice(0, 3), trashIds.slice(0, 3));

    expect(southIds(engine, "character")).toEqual([zoroA, zoroB]);
    expect(southIds(engine, "trash")).toEqual(trashIds.slice(3));
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("declining both copies K.O.s both Zoros, with no further offer", () => {
    const { engine, zoroA, zoroB, trashIds } = setupTwo({ hand: [op17Loki119], activeDon: 6 });

    engine.playCard(op17Loki119, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroA, zoroB] }, "north");
    engine.resolveDecision("effectKoReplacement", { optionId: "no" }, "south");
    // Nothing has been K.O.'d yet: the second copy is offered for both.
    expect(southIds(engine, "character")).toEqual([zoroA, zoroB]);
    expect(pendingReplacement(engine, "effectKoReplacement")).toEqual({
      sourceId: zoroB,
      covers: [zoroA, zoroB],
    });
    engine.resolveDecision("effectKoReplacement", { optionId: "no" }, "south");

    expect(southIds(engine, "character")).toEqual([]);
    expect(southIds(engine, "trash")).toEqual([...trashIds, zoroA, zoroB]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("declining both copies for a deck placement removes both, with no further offer", () => {
    const { engine, zoroA, zoroB, trashIds } = setupTwo({
      hand: [op06GravityBladeRagingTiger058],
      activeDon: 7,
    });

    engine.playCard(op06GravityBladeRagingTiger058, "north");
    engine.resolveDecision("effectTargetSelection", { selectedIds: [zoroA, zoroB] }, "north");
    engine.resolveDecision(
      "effectReturnToDeckOwnerOrder",
      { selectedIds: [zoroA, zoroB] },
      "south",
    );
    engine.resolveDecision("effectRemovalReplacement", { optionId: "no" }, "south");
    expect(pendingReplacement(engine, "effectRemovalReplacement")).toEqual({
      sourceId: zoroB,
      covers: [zoroA, zoroB],
    });
    engine.resolveDecision("effectRemovalReplacement", { optionId: "no" }, "south");

    expect(southIds(engine, "character")).toEqual([]);
    expect(southIds(engine, "trash")).toEqual(trashIds);
    expect(engine.getState().players.south.deck.slice(-2)).toEqual([zoroA, zoroB]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
