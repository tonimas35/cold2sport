import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  op16Mahoroba101,
  st27MarshallDTeach005,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [Activate: Main] You may rest this Character: K.O. up to 1 Character with a
// cost of 3 or less.
// [On K.O.] Add up to 1 black card from your trash to your hand.
//
// The [On K.O.] had no block in the catalog (catalog-check structure:onKo).
function koTeach() {
  const engine = OnePieceTestEngine.create(
    // 7000 + 2 given DON!! = 9000 against Teach's 8000.
    { character: [{ card: eb01MountainGod018, playedOnTurn: 0, attachedDon: 2 }] },
    {
      character: [{ card: st27MarshallDTeach005, rested: true }],
      trash: [op16Mahoroba101, eb01Doma005],
    },
    { firstPlayer: "north", activeSeat: "south" },
  );
  const teachId = engine.asNorth().findOnField(st27MarshallDTeach005);
  engine.asSouth().attack(eb01MountainGod018, teachId);
  return { engine, teachId };
}

describe("ST27-005 Marshall.D.Teach", () => {
  test("[On K.O.] adds a black card from the trash to hand", () => {
    const { engine, teachId } = koTeach();
    const north = engine.asNorth();
    const mahorobaId = engine.findCardInZone("north", "trash", op16Mahoroba101);
    const domaId = engine.findCardInZone("north", "trash", eb01Doma005);

    const target = north.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected Teach's [On K.O.] choice.");
    expect(target).toMatchObject({ min: 0, max: 1 });
    const candidates = target.candidates.map((candidate) => candidate.ref.id);
    // The red card is not a candidate; Teach (black) is already in the trash.
    expect(candidates).toContain(mahorobaId);
    expect(candidates).toContain(teachId);
    expect(candidates).not.toContain(domaId);
    north.chooseTargets(mahorobaId);

    const view = north.view().players.north;
    expect(view.hand.map((card) => card.instanceId)).toEqual([mahorobaId]);
    expect(new Set(view.trash.map((card) => card.instanceId))).toEqual(new Set([domaId, teachId]));
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[On K.O.] may add nothing", () => {
    const { engine } = koTeach();
    const north = engine.asNorth();

    north.chooseNoTargets();

    expect(north.view().players.north.hand).toHaveLength(0);
    expect(north.view().players.north.trash).toHaveLength(3);
  });
});
