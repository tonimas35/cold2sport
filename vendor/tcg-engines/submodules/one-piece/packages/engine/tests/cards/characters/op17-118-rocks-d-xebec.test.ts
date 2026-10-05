import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  op07CaptainJohn082,
  op08Buckin051,
  op17Barbell053,
  op17Gloriosa046,
  op17Kyo045,
  op17MissBuckinghamStussy054,
  op17RocksDXebec039,
  op17RocksDXebec118,
  op17Shiki048,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// [On Play] Draw 1 card and play up to 2 {Rocks Pirates} type cards with
// different card names and a total cost of 9 or less from your hand.
//
// {Rocks Pirates} is an exact type (2-4-3), unlike "a type including"
// (2-4-3-1): {Former Rocks Pirates} cards do not qualify, while multi-type
// cards such as Gloriosa (Amazon Lily/Rocks Pirates) and Barbell
// (Fish-Man/Rocks Pirates) do (2-4-2).
function setup(hand: FixtureCardEntry[]) {
  return OnePieceTestEngine.create(
    {
      leaderCardId: op17RocksDXebec039,
      hand: [op17RocksDXebec118, ...hand],
      deck: [eb01Doma005, eb01Doma005, eb01Doma005],
      activeDon: 10,
    },
    {},
    { firstPlayer: "north", activeSeat: "south" },
  );
}

function fieldIds(engine: OnePieceTestEngine) {
  return engine
    .getView("south")
    .players.south.characters.filter((card) => card !== null)
    .map((card) => card!.instanceId);
}

describe("OP17-118 Rocks.D.Xebec", () => {
  test("[On Play] offers only exact {Rocks Pirates} cards: Former Rocks Pirates are left out, multi-type Rocks cards are in", () => {
    const engine = setup([op08Buckin051, op07CaptainJohn082, op17Gloriosa046, op17Barbell053]);
    const south = engine.asSouth();
    const gloriosaId = engine.findCardInZone("south", "hand", op17Gloriosa046);
    const barbellId = engine.findCardInZone("south", "hand", op17Barbell053);

    south.play(op17RocksDXebec118);

    // The draw happened first.
    expect(south.view().players.south.hand).toHaveLength(5);
    const play = south.pendingDecision("effectPlaySelection").steps[0];
    expect(play).toMatchObject({ kind: "selectEntity", min: 0, max: 2 });
    if (play?.kind !== "selectEntity") throw new Error("Expected the replay choice.");
    expect(play.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [gloriosaId, barbellId].sort(),
    );
    expect(op17Gloriosa046.traits).toEqual(["Amazon Lily", "Rocks Pirates"]);
    expect(op17Barbell053.traits).toEqual(["Fish-Man", "Rocks Pirates"]);

    // Gloriosa (4) + Barbell (5) = 9 fits the cap.
    south.choosePlay(gloriosaId, barbellId);
    // Gloriosa's own [On Play] then asks for its optional bottom-deck target.
    south.chooseNoTargets();

    expect(fieldIds(engine)).toEqual(
      expect.arrayContaining([south.findOnField(op17RocksDXebec118), gloriosaId, barbellId]),
    );
    expect(south.view().prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[On Play] a selection over the total cost of 9 is rejected and the choice stays open", () => {
    const engine = setup([op17Shiki048, op17MissBuckinghamStussy054, op17Kyo045]);
    const south = engine.asSouth();
    const shikiId = engine.findCardInZone("south", "hand", op17Shiki048);
    const stussyId = engine.findCardInZone("south", "hand", op17MissBuckinghamStussy054);
    const kyoId = engine.findCardInZone("south", "hand", op17Kyo045);

    south.play(op17RocksDXebec118);
    const prompt = south.pendingDecision("effectPlaySelection");

    // Shiki (7) + Stussy (3) = 10.
    south.expectFailure({
      type: "resolvePrompt",
      promptId: prompt.id,
      selectedIds: [shikiId, stussyId],
    });
    expect(south.pendingDecision("effectPlaySelection").id).toBe(prompt.id);
    expect(fieldIds(engine)).not.toContain(shikiId);

    // Shiki (7) + Kyo (2) = 9 is accepted; Kyo's [On Play] draws 1.
    south.choosePlay(shikiId, kyoId);

    expect(fieldIds(engine)).toEqual(expect.arrayContaining([shikiId, kyoId]));
    expect(south.view().players.south.hand.map((card) => card.instanceId)).toContain(stussyId);
    expect(south.view().prompts).toHaveLength(0);
  });

  test("[On Play] a card whose own cost is over 9 is never offered", () => {
    const engine = setup([op17RocksDXebec118, op17Kyo045]);
    const south = engine.asSouth();
    const kyoId = engine.findCardInZone("south", "hand", op17Kyo045);

    south.play(op17RocksDXebec118);

    const play = south.pendingDecision("effectPlaySelection").steps[0];
    if (play?.kind !== "selectEntity") throw new Error("Expected the replay choice.");
    expect(play.candidates.map((candidate) => candidate.ref.id)).toEqual([kyoId]);
  });
});
