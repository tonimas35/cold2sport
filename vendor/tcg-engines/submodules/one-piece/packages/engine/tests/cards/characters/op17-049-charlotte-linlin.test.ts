import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01Fourtricks025,
  op08CountNiwatori071,
  op13Higuma013,
  op17CharlotteLinlin049,
  op17RocksDXebec039,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// [On Play] Your opponent chooses one:
// • Draw 2 cards.
// • Your opponent trashes 2 cards from their hand.
// [On Your Opponent's Attack] [Once Per Turn] You may trash 1 card from your
// hand: Up to 1 of your Leader or Characters gains +1000 power during this battle.
//
// OP17 FAQ: "Draw 2" makes the Linlin player draw; on "trash 2" the opponent
// picks 2 cards from their own hand, and may pick that branch with 1 or 0 cards
// in hand (1 card: it is trashed; 0 cards: nothing happens).
function setup({
  northHand = [eb01Doma005, eb01Fourtricks025, op13Higuma013] as FixtureCardEntry[],
} = {}) {
  return OnePieceTestEngine.create(
    {
      leaderCardId: op17RocksDXebec039,
      hand: [op17CharlotteLinlin049],
      deck: [eb01Doma005, eb01Fourtricks025, op13Higuma013],
      activeDon: 5,
    },
    { hand: northHand },
    { firstPlayer: "south", activeSeat: "south" },
  );
}

describe("OP17-049 Charlotte Linlin", () => {
  test("[On Play] the opponent is the one who chooses; picking Draw 2 makes Linlin's player draw 2", () => {
    const engine = setup();
    const south = engine.asSouth();
    const north = engine.asNorth();
    const [firstId, secondId] = engine.getState().players.south.deck;

    south.play(op17CharlotteLinlin049);

    expect(south.hasPendingChoice()).toBe(false);
    const choice = north.pendingDecision("effectActionChoice").steps[0];
    if (choice?.kind !== "chooseOption") throw new Error("Expected the opponent's choice.");
    expect(choice.options.map((option) => option.id)).toEqual(["0", "1"]);
    north.chooseOption("effectActionChoice", "0");

    expect(south.view().players.south.hand.map((card) => card.instanceId)).toEqual([
      firstId,
      secondId,
    ]);
    expect(north.view().players.north.hand).toHaveLength(3);
    expect(north.view().players.north.trash).toHaveLength(0);
    expect(south.view().prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[On Play] picking the trash branch makes the opponent trash 2 cards of their own choice", () => {
    const engine = setup();
    const south = engine.asSouth();
    const north = engine.asNorth();
    const domaId = engine.findCardInZone("north", "hand", eb01Doma005);
    const fourtricksId = engine.findCardInZone("north", "hand", eb01Fourtricks025);
    const higumaId = engine.findCardInZone("north", "hand", op13Higuma013);

    south.play(op17CharlotteLinlin049);
    north.chooseOption("effectActionChoice", "1");

    expect(south.hasPendingChoice()).toBe(false);
    const trash = north.pendingDecision("effectTrashFromHandSelection").steps[0];
    expect(trash).toMatchObject({ kind: "selectEntity", min: 2, max: 2 });
    if (trash?.kind !== "selectEntity") throw new Error("Expected the opponent's trash choice.");
    expect(trash.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [domaId, fourtricksId, higumaId].sort(),
    );
    north.trashFromHand(domaId, higumaId);

    expect(north.view().players.north.hand.map((card) => card.instanceId)).toEqual([fourtricksId]);
    expect(new Set(north.view().players.north.trash.map((card) => card.instanceId))).toEqual(
      new Set([domaId, higumaId]),
    );
    expect(south.view().players.south.hand).toHaveLength(0);
    expect(south.view().prompts).toHaveLength(0);
  });

  test("[On Play] the opponent may pick the trash branch with 1 card (it is trashed) or 0 cards (nothing happens)", () => {
    const one = setup({ northHand: [eb01Doma005] });
    const domaId = one.findCardInZone("north", "hand", eb01Doma005);
    one.asSouth().play(op17CharlotteLinlin049);
    one.asNorth().chooseOption("effectActionChoice", "1");

    expect(one.asNorth().view().players.north.hand).toHaveLength(0);
    expect(
      one
        .asNorth()
        .view()
        .players.north.trash.map((card) => card.instanceId),
    ).toEqual([domaId]);
    expect(one.asSouth().view().players.south.hand).toHaveLength(0);
    expect(one.getView("south").prompts).toHaveLength(0);

    const none = setup({ northHand: [] });
    none.asSouth().play(op17CharlotteLinlin049);
    none.asNorth().chooseOption("effectActionChoice", "1");

    expect(none.asNorth().view().players.north.trash).toHaveLength(0);
    expect(none.asSouth().view().players.south.hand).toHaveLength(0);
    expect(none.getView("south").prompts).toHaveLength(0);
  });

  test("[On Your Opponent's Attack] still trades 1 hand card for +1000 on the attacked Leader", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17RocksDXebec039,
        character: [op17CharlotteLinlin049],
        hand: [eb01Doma005, op13Higuma013],
      },
      { character: [op08CountNiwatori071] },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const south = engine.asSouth();
    const north = engine.asNorth();
    const leaderId = south.leader();
    const trashedId = engine.findCardInZone("south", "hand", op13Higuma013);

    north.attack(op08CountNiwatori071, leaderId);
    south.acceptOptional();
    south.choose("effectCostTrashFromHand", [trashedId]);
    south.chooseTargets(leaderId);

    expect(south.view().players.south.leader?.power).toBe(6000);
    expect(south.view().players.south.trash.map((card) => card.instanceId)).toEqual([trashedId]);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});
