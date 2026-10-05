import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01Fourtricks025,
  op03ThunderBolt121,
  op08CountNiwatori071,
  op13Higuma013,
  op17DonMarlon052,
  op17Gloriosa046,
  op17Kyo045,
  op17RocksDXebec039,
  op17RocksPirates056,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// If one of your Characters would be removed from the field by your opponent's
// effect, you may trash 2 cards from your hand instead.
// [On Play] Draw 1 card.
//
// A replacement effect (8-1-3-4) for every Character you control, Kyo included,
// with no once-per-turn limit. OP17 FAQ: it cannot be chosen with 0 or 1 cards
// in hand (8-1-3-4-5).
function setup({
  southHand = [eb01Doma005, eb01Fourtricks025, op13Higuma013] as FixtureCardEntry[],
  southCharacters = [op17Kyo045, op17DonMarlon052] as FixtureCardEntry[],
  northHand = [op17Gloriosa046, op17RocksPirates056] as FixtureCardEntry[],
} = {}) {
  return OnePieceTestEngine.create(
    {
      leaderCardId: op17RocksDXebec039,
      hand: southHand,
      character: southCharacters,
    },
    { hand: northHand, character: [op08CountNiwatori071], activeDon: 10 },
    { firstPlayer: "south", activeSeat: "north" },
  );
}

function southCharacterIds(engine: OnePieceTestEngine) {
  return engine
    .getView("south")
    .players.south.characters.filter((card) => card !== null)
    .map((card) => card!.instanceId);
}

describe("OP17-045 Kyo", () => {
  test("an opposing effect aimed at another of your Characters can be replaced by trashing 2 chosen hand cards", () => {
    const engine = setup();
    const south = engine.asSouth();
    const north = engine.asNorth();
    const marlonId = south.findOnField(op17DonMarlon052);
    const keptId = engine.findCardInZone("south", "hand", eb01Fourtricks025);
    const trashedIds = [
      engine.findCardInZone("south", "hand", eb01Doma005),
      engine.findCardInZone("south", "hand", op13Higuma013),
    ];

    north.play(op17Gloriosa046);
    north.chooseTargets(marlonId);

    const replacement = south.pendingDecision("effectRemovalReplacement").steps[0];
    if (replacement?.kind !== "confirm") throw new Error("Expected Kyo's optional replacement.");
    expect(replacement.options.map((option) => option.id).sort()).toEqual(["no", "yes"]);
    expect(engine.getState().promptQueue.find((p) => p.status === "pending")).toMatchObject({
      seat: "south",
      sourceInstanceId: south.findOnField(op17Kyo045),
    });
    south.chooseOption("effectRemovalReplacement", "yes");

    const trash = south.pendingDecision("effectTrashFromHandSelection").steps[0];
    expect(trash).toMatchObject({ kind: "selectEntity", min: 2, max: 2 });
    south.trashFromHand(...trashedIds);

    expect(southCharacterIds(engine)).toContain(marlonId);
    expect(south.view().players.south.hand.map((card) => card.instanceId)).toEqual([keptId]);
    expect(new Set(south.view().players.south.trash.map((card) => card.instanceId))).toEqual(
      new Set(trashedIds),
    );
    expect(engine.getState().players.south.deck).not.toContain(marlonId);
    expect(south.view().prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("it is not once per turn and protects Kyo itself: two removals in one turn are both replaced", () => {
    const engine = setup({
      southHand: [eb01Doma005, eb01Fourtricks025, op13Higuma013, op13Higuma013],
    });
    const south = engine.asSouth();
    const north = engine.asNorth();
    const kyoId = south.findOnField(op17Kyo045);
    const marlonId = south.findOnField(op17DonMarlon052);
    const domaId = engine.findCardInZone("south", "hand", eb01Doma005);
    const fourtricksId = engine.findCardInZone("south", "hand", eb01Fourtricks025);

    north.play(op17Gloriosa046);
    north.chooseTargets(marlonId);
    south.chooseOption("effectRemovalReplacement", "yes");
    south.trashFromHand(domaId, fourtricksId);

    north.play(op17RocksPirates056);
    north.acceptOptional();
    north.chooseTargets(kyoId);
    south.chooseOption("effectRemovalReplacement", "yes");
    // Exactly 2 cards left: both are trashed without a selection prompt.

    expect(new Set(southCharacterIds(engine))).toEqual(new Set([kyoId, marlonId]));
    expect(south.view().players.south.hand).toHaveLength(0);
    expect(south.view().players.south.trash).toHaveLength(4);
    expect(north.view().players.north.hand).toHaveLength(0);
    expect(south.view().prompts).toHaveLength(0);
  });

  test("an opposing K.O. effect is a removal too and can be replaced", () => {
    const engine = setup({ northHand: [op03ThunderBolt121] });
    const south = engine.asSouth();
    const north = engine.asNorth();
    const marlonId = south.findOnField(op17DonMarlon052);
    const trashedIds = [
      engine.findCardInZone("south", "hand", eb01Doma005),
      engine.findCardInZone("south", "hand", op13Higuma013),
    ];

    north.play(op03ThunderBolt121);
    north.acceptOptional();
    north.chooseTargets(marlonId);
    south.chooseOption("effectKoReplacement", "yes");
    south.trashFromHand(...trashedIds);

    expect(southCharacterIds(engine)).toContain(marlonId);
    expect(new Set(south.view().players.south.trash.map((card) => card.instanceId))).toEqual(
      new Set(trashedIds),
    );
    expect(south.view().prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("declining lets the removal happen and keeps the hand", () => {
    const engine = setup();
    const south = engine.asSouth();
    const north = engine.asNorth();
    const marlonId = south.findOnField(op17DonMarlon052);

    north.play(op17Gloriosa046);
    north.chooseTargets(marlonId);
    south.chooseOption("effectRemovalReplacement", "no");

    expect(southCharacterIds(engine)).not.toContain(marlonId);
    expect(engine.getState().players.south.deck.at(-1)).toBe(marlonId);
    expect(south.view().players.south.hand).toHaveLength(3);
    expect(south.view().players.south.trash).toHaveLength(0);
    expect(south.view().prompts).toHaveLength(0);
  });

  test("with only 1 card in hand the replacement is not offered", () => {
    const engine = setup({ southHand: [eb01Doma005] });
    const south = engine.asSouth();
    const north = engine.asNorth();
    const marlonId = south.findOnField(op17DonMarlon052);

    north.play(op17Gloriosa046);
    north.chooseTargets(marlonId);

    expect(south.hasPendingChoice()).toBe(false);
    expect(southCharacterIds(engine)).not.toContain(marlonId);
    expect(south.view().players.south.hand).toHaveLength(1);
  });

  test("a K.O. in battle is not an opponent's effect, so it is not replaced", () => {
    const engine = setup({
      southCharacters: [op17Kyo045, { card: op17DonMarlon052, rested: true }],
    });
    const south = engine.asSouth();
    const north = engine.asNorth();
    const marlonId = south.findOnField(op17DonMarlon052);

    north.attack(op08CountNiwatori071, marlonId);
    south.chooseCounter();

    expect(south.hasPendingChoice()).toBe(false);
    expect(southCharacterIds(engine)).not.toContain(marlonId);
    expect(south.view().players.south.trash.map((card) => card.instanceId)).toEqual([marlonId]);
    expect(south.view().players.south.hand).toHaveLength(3);
  });
});
