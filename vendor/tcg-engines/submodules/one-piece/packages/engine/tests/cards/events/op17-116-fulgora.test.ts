import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  op16AvaloPizarro102,
  op16VanAugur103,
  op17Fulgora116,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [Main] You may rest 2 of your DON!! cards: K.O. up to 1 of your opponent's
// Stages.
// [Counter] If you have 2 or more Characters with a [Trigger], up to 1 of your
// Leader or Characters gains +4000 power during this battle.
//
// The [Counter] had no block in the catalog (catalog-check structure:counter).
function defending(characters: { id: string }[]) {
  return OnePieceTestEngine.create(
    { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
    { hand: [op17Fulgora116], character: characters, activeDon: 1 },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("OP17-116 Fulgora", () => {
  test("[Counter] with 2 Characters with a [Trigger] gives the attacked Leader +4000 this battle", () => {
    const engine = defending([op16AvaloPizarro102, op16VanAugur103]);
    const south = engine.asSouth();
    const north = engine.asNorth();
    const leaderId = north.leader();
    const lifeBefore = north.view().players.north.lifeCount;

    south.attack(eb01MountainGod018, leaderId);
    north.chooseCounter(op17Fulgora116);
    north.chooseTargets(leaderId);

    const view = north.view().players.north;
    expect(view.lifeCount).toBe(lifeBefore);
    expect(view.leader.power).toBe(5000);
    expect(view.trash.map((card) => card.cardId)).toEqual([op17Fulgora116.id]);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Counter] with only 1 Character with a [Trigger] it gives nothing", () => {
    const engine = defending([op16AvaloPizarro102, eb01Doma005]);
    const south = engine.asSouth();
    const north = engine.asNorth();
    const lifeBefore = north.view().players.north.lifeCount;

    south.attack(eb01MountainGod018, north.leader());
    north.chooseCounter(op17Fulgora116);

    expect(north.hasPendingChoice()).toBe(false);
    expect(north.view().players.north.lifeCount).toBe(lifeBefore - 1);
  });
});
