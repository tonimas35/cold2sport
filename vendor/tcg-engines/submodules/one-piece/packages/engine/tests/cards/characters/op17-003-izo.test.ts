import { describe, expect, test } from "vite-plus/test";
import {
  eb01Fourtricks025,
  eb01KouzukiOden001,
  eb01MountainGod018,
  op17EdwardNewgate001,
  op17Izo003,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [Rush: Character]
// [On Play] If your Leader is [Edward.Newgate] or has the {Land of Wano} type,
// give up to 1 of your opponent's rested Characters −6000 power during this
// turn.
//
// The [On Play] had no block in the catalog (catalog-check structure:onPlay).
function setup(leader: { id: string }) {
  return OnePieceTestEngine.create(
    { leaderCardId: leader, hand: [op17Izo003], activeDon: 4 },
    {
      character: [
        { card: eb01MountainGod018, rested: true },
        { card: eb01Fourtricks025, rested: false },
      ],
    },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

function northPower(engine: OnePieceTestEngine, instanceId: string) {
  return engine
    .getView("south")
    .players.north.characters.find((card) => card?.instanceId === instanceId)?.power;
}

describe("OP17-003 Izo", () => {
  test("under [Edward.Newgate] gives a rested opposing Character -6000 this turn", () => {
    const engine = setup(op17EdwardNewgate001);
    const south = engine.asSouth();
    const restedId = engine.findCardInZone("north", "character", eb01MountainGod018);
    const activeId = engine.findCardInZone("north", "character", eb01Fourtricks025);

    south.play(op17Izo003);
    const target = south.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected Izo's target.");
    expect(target).toMatchObject({ min: 0, max: 1 });
    // Only rested Characters qualify.
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([restedId]);
    south.chooseTargets(restedId);

    expect(northPower(engine, restedId)).toBe(1000);
    expect(northPower(engine, activeId)).toBe(5000);
    expect(engine.getState().capabilityHistory).toHaveLength(0);

    south.endTurn();
    expect(northPower(engine, restedId)).toBe(7000);
  });

  test("under a {Land of Wano} Leader it applies too", () => {
    const engine = setup(eb01KouzukiOden001);
    const south = engine.asSouth();
    const restedId = engine.findCardInZone("north", "character", eb01MountainGod018);

    south.play(op17Izo003);
    south.chooseTargets(restedId);

    expect(northPower(engine, restedId)).toBe(1000);
  });

  test("under another Leader nothing happens", () => {
    const engine = setup({ id: "OP13-001" });
    const south = engine.asSouth();
    const restedId = engine.findCardInZone("north", "character", eb01MountainGod018);

    south.play(op17Izo003);

    expect(south.hasPendingChoice()).toBe(false);
    expect(northPower(engine, restedId)).toBe(7000);
  });
});
