import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, eb01Fourtricks025, eb01MountainGod018, op11XCalibur020 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";
import { SOUTH_ATTACKS_WITHOUT_TURN_SETUP } from "./battle-fixture.shared.ts";

// [Counter] Up to 1 of your Leader or Character cards gains +2000 power during
// this battle. Then, if your opponent has a Character with 6000 power or more,
// up to 1 of your Leader or Character cards gains +1000 power during this turn.
// [Trigger] Up to 1 of your Leader or Character cards gains +1000 power during
// this turn.
//
// The import carried another card's [Main] (−2000 to two Characters) and
// [Trigger] (K.O. 4000 power or less); these tests encode the printed card.
function defending(attacker: { id: string }) {
  return OnePieceTestEngine.create(
    { character: [{ card: attacker, playedOnTurn: 0 }] },
    { hand: [op11XCalibur020], character: [eb01Doma005], activeDon: 2 },
    SOUTH_ATTACKS_WITHOUT_TURN_SETUP,
  );
}

describe("OP11-020 X Calibur", () => {
  test("[Counter] +2000 this battle, then +1000 this turn because the opponent has a 7000 Character", () => {
    const engine = defending(eb01MountainGod018);
    const south = engine.asSouth();
    const north = engine.asNorth();
    const leaderId = north.leader();
    const lifeBefore = north.view().players.north.lifeCount;

    south.attack(eb01MountainGod018, leaderId);
    north.chooseCounter(op11XCalibur020);
    north.chooseTargets(leaderId);
    expect(north.view().players.north.leader?.power).toBe(7000);
    const second = north.pendingDecision("effectTargetSelection").steps[0];
    expect(second).toMatchObject({ kind: "selectEntity", min: 0, max: 1 });
    north.chooseTargets(leaderId);

    // 7000 attacker against a 8000 Leader: no damage.
    let view = north.view();
    expect(view.players.north.lifeCount).toBe(lifeBefore);
    expect(view.players.north.activeDon).toBe(0);
    expect(view.players.north.trash.map((card) => card.cardId)).toEqual([op11XCalibur020.id]);
    // The +2000 ended with the battle; the +1000 lasts until the end of the turn.
    expect(view.players.north.leader?.power).toBe(6000);
    expect(engine.getState().capabilityHistory).toHaveLength(0);

    south.endTurn();
    view = north.view();
    expect(view.players.north.leader?.power).toBe(5000);
  });

  test("[Counter] against an opponent whose Characters are all below 6000 gives only +2000", () => {
    const engine = defending(eb01Fourtricks025);
    const south = engine.asSouth();
    const north = engine.asNorth();
    const leaderId = north.leader();
    const lifeBefore = north.view().players.north.lifeCount;

    south.attack(eb01Fourtricks025, leaderId);
    north.chooseCounter(op11XCalibur020);
    north.chooseTargets(leaderId);

    expect(north.hasPendingChoice()).toBe(false);
    expect(north.view().players.north.leader?.power).toBe(5000);
    expect(north.view().players.north.lifeCount).toBe(lifeBefore);
  });

  test("[Trigger] gives up to 1 of your Leader or Character cards +1000 this turn", () => {
    const engine = OnePieceTestEngine.create(
      { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
      { life: [op11XCalibur020], character: [eb01Doma005] },
      SOUTH_ATTACKS_WITHOUT_TURN_SETUP,
    );
    const south = engine.asSouth();
    const north = engine.asNorth();
    const domaId = north.findOnField(eb01Doma005);

    south.attack(eb01MountainGod018, north.leader());
    north.activateLifeTrigger();
    const target = north.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the +1000 target.");
    expect(target.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [north.leader(), domaId].sort(),
    );
    north.chooseTargets(domaId);

    expect(
      north.view().players.north.characters.find((card) => card?.instanceId === domaId)?.power,
    ).toBe(4000);
    expect(north.view().players.north.trash.map((card) => card.cardId)).toEqual([
      op11XCalibur020.id,
    ]);
    // Nothing of the opponent's is K.O.'d any more.
    expect(south.view().players.south.characters.filter(Boolean)).toHaveLength(1);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});
