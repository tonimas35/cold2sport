import { describe, expect, test } from "vite-plus/test";
import { eb01Blueno017, eb03Ain002, st30LuffyAce001, st30MonkeyDLuffy012 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [On Play] You may rest 1 of your DON!! cards: This Character gains [Rush]
// during this turn.
// [When Attacking] Rest up to 1 of your opponent's [Blocker] Characters.
function setup(activeDon: number, restedDon = 0) {
  return OnePieceTestEngine.create(
    { leaderCardId: st30LuffyAce001, hand: [st30MonkeyDLuffy012], activeDon, restedDon },
    {
      character: [
        { card: eb01Blueno017, playedOnTurn: 0 },
        { card: eb03Ain002, playedOnTurn: 0 },
      ],
    },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("ST30-012 Monkey.D.Luffy", () => {
  test("rests 1 DON!! for [Rush], attacks at once and rests only a [Blocker] Character", () => {
    const engine = setup(5);
    const south = engine.asSouth();
    const bluenoId = engine.findCardInZone("north", "character", eb01Blueno017);
    const ainId = engine.findCardInZone("north", "character", eb03Ain002);

    south.play(st30MonkeyDLuffy012);
    south.acceptOptional();
    expect(south.view().players.south).toMatchObject({ activeDon: 0, restedDon: 5 });
    const luffyId = south.findOnField(st30MonkeyDLuffy012);

    south.attack(luffyId, south.opponentLeader());
    const rest = south.pendingDecision("effectTargetSelection").steps[0];
    expect(rest).toMatchObject({ kind: "selectEntity", min: 0, max: 1 });
    if (rest?.kind !== "selectEntity") throw new Error("Expected the [Blocker] rest target.");
    const legal = rest.candidates.filter((candidate) => candidate.legal !== false);
    expect(legal.map((candidate) => candidate.ref.id)).toEqual([bluenoId]);
    expect(legal.map((candidate) => candidate.ref.id)).not.toContain(ainId);
    south.chooseTargets(bluenoId);

    const north = engine.getView("south").players.north;
    expect(north.characters.find((card) => card?.instanceId === bluenoId)?.rested).toBe(true);
    expect(north.characters.find((card) => card?.instanceId === ainId)?.rested).toBe(false);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("declining the optional cost keeps the DON!! active and gives no [Rush]", () => {
    const engine = setup(5);
    const south = engine.asSouth();

    south.play(st30MonkeyDLuffy012);
    south.declineOptional();
    expect(south.view().players.south).toMatchObject({ activeDon: 1, restedDon: 4 });
    const luffyId = south.findOnField(st30MonkeyDLuffy012);
    south.expectFailure({
      type: "declareAttack",
      attackerId: luffyId,
      targetId: south.opponentLeader(),
    });
  });

  test("with no active DON!! left after paying 4, the cost cannot be paid (ST-30 FAQ)", () => {
    const engine = setup(4, 2);
    const south = engine.asSouth();

    south.play(st30MonkeyDLuffy012);
    expect(south.view().prompts).toHaveLength(0);
    expect(south.view().players.south).toMatchObject({ activeDon: 0, restedDon: 6 });
    const luffyId = south.findOnField(st30MonkeyDLuffy012);
    south.expectFailure({
      type: "declareAttack",
      attackerId: luffyId,
      targetId: south.opponentLeader(),
    });
  });
});
