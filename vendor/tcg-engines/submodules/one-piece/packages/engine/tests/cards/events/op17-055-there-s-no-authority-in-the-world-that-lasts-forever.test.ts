import { describe, expect, test } from "vite-plus/test";
import {
  op17Gloriosa046,
  op17Kyo045,
  op17RocksDXebec039,
  op17RocksDXebec118,
  op17ThereSNoAuthorityInTheWorldThatLastsForever055,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [Main] You may rest 1 of your DON!! cards: Up to 1 of your [Rocks.D.Xebec]
// gains [Unblockable] during this turn.
//
// [Rocks.D.Xebec] means any card with that name (2-1-2), so the Leader OP17-039
// is a legal target, not only the OP17-118 Character.
const event = op17ThereSNoAuthorityInTheWorldThatLastsForever055;

describe("OP17-055 There's No Authority in the World That Lasts Forever!!!", () => {
  test("[Main] makes the Leader Rocks.D.Xebec unblockable: the opposing Blocker is never offered", () => {
    const engine = OnePieceTestEngine.create(
      { leaderCardId: op17RocksDXebec039, hand: [event], activeDon: 1 },
      { character: [op17Gloriosa046] },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const north = engine.asNorth();
    const leaderId = south.leader();
    const gloriosaId = north.findOnField(op17Gloriosa046);
    const lifeBefore = north.view().players.north.lifeCount;

    south.play(event);
    south.acceptOptional();
    const target = south.pendingDecision("effectTargetSelection").steps[0];
    expect(target).toMatchObject({ kind: "selectEntity", min: 0, max: 1 });
    if (target?.kind !== "selectEntity") throw new Error("Expected the Unblockable target.");
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([leaderId]);
    south.chooseTargets(leaderId);
    expect(south.view().players.south).toMatchObject({ activeDon: 0, restedDon: 1 });

    south.attack(leaderId, north.leader());

    expect(north.hasPendingChoice()).toBe(false);
    expect(north.view().players.north.lifeCount).toBe(lifeBefore - 1);
    expect(
      north.view().players.north.characters.find((card) => card?.instanceId === gloriosaId)?.rested,
    ).toBe(false);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Main] offers the Leader and the OP17-118 Character, but no other Character", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17RocksDXebec039,
        hand: [event],
        character: [op17RocksDXebec118, op17Kyo045],
        activeDon: 1,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();

    south.play(event);
    south.acceptOptional();
    const target = south.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the Unblockable target.");
    expect(target.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [south.leader(), south.findOnField(op17RocksDXebec118)].sort(),
    );
  });
});
