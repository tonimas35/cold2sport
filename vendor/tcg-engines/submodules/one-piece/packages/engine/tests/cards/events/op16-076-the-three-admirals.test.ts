import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  op16Borsalino073,
  op16TheThreeAdmirals076,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [Main] You may rest 3 of your DON!! cards: Up to 3 of your {Admiral} type
// Characters gain +2000 power during this turn.
// [Counter] If you have an {Admiral} type Character, up to 1 of your Leader or
// Character cards gains +4000 power during this battle.
//
// The [Counter] had no block in the catalog (catalog-check structure:counter).
function defending(character: { id: string }) {
  return OnePieceTestEngine.create(
    { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
    { hand: [op16TheThreeAdmirals076], character: [character], activeDon: 1 },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("OP16-076 The Three Admirals!!", () => {
  test("[Counter] with an Admiral Character gives the attacked Leader +4000 this battle", () => {
    const engine = defending(op16Borsalino073);
    const south = engine.asSouth();
    const north = engine.asNorth();
    const leaderId = north.leader();
    const lifeBefore = north.view().players.north.lifeCount;

    south.attack(eb01MountainGod018, leaderId);
    north.chooseCounter(op16TheThreeAdmirals076);
    north.chooseTargets(leaderId);

    // 7000 against 9000: no damage; the +4000 ends with the battle.
    const view = north.view().players.north;
    expect(view.lifeCount).toBe(lifeBefore);
    expect(view.leader.power).toBe(5000);
    expect(view.trash.map((card) => card.cardId)).toEqual([op16TheThreeAdmirals076.id]);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Counter] without an Admiral Character it gives nothing", () => {
    const engine = defending(eb01Doma005);
    const south = engine.asSouth();
    const north = engine.asNorth();
    const lifeBefore = north.view().players.north.lifeCount;

    south.attack(eb01MountainGod018, north.leader());
    north.chooseCounter(op16TheThreeAdmirals076);

    expect(north.hasPendingChoice()).toBe(false);
    expect(north.view().players.north.lifeCount).toBe(lifeBefore - 1);
  });
});
