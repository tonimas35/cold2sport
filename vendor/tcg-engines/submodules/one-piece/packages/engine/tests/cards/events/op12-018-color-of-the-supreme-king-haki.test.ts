import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb02Karoo001,
  eb03Ain002,
  op12ColorOfTheSupremeKingHaki018,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [Counter] Up to 1 of your Characters or [Silvers Rayleigh] gains +2000 power
// during this battle. Then, you may rest 1 of your DON!! cards. If you do, give
// your opponent's Leader and all of their Characters −1000 power during this
// turn.
function setup(activeDon: number, restedDon: number) {
  const engine = OnePieceTestEngine.create(
    {
      hand: [op12ColorOfTheSupremeKingHaki018],
      // Rested, so Karoo can attack it.
      character: [{ card: eb03Ain002, rested: true }],
      activeDon,
      restedDon,
    },
    {
      character: [
        { card: eb02Karoo001, playedOnTurn: 0 },
        { card: eb01Doma005, playedOnTurn: 0 },
      ],
    },
    { firstPlayer: "south", activeSeat: "north" },
  );
  const ainId = engine.findCardInZone("south", "character", eb03Ain002);
  const karooId = engine.findCardInZone("north", "character", eb02Karoo001);
  const domaId = engine.findCardInZone("north", "character", eb01Doma005);
  engine.declareAttack(karooId, ainId, "north");
  const hakiId = engine.findCardInZone("south", "hand", op12ColorOfTheSupremeKingHaki018);
  engine.resolveDecision("battleCounter", { selectedIds: [hakiId] }, "south");
  return { engine, ainId, karooId, domaId };
}

const northPowers = (engine: OnePieceTestEngine, ids: string[]) => {
  const north = engine.getView("south").players.north;
  return [
    north.leader.power,
    ...ids.map((id) => north.characters.find((card) => card?.instanceId === id)?.power),
  ];
};

describe("OP12-018 Color of the Supreme King Haki", () => {
  test("with no active DON!! nothing can be rested, so the opponent gets no −1000", () => {
    const { engine, ainId, karooId, domaId } = setup(0, 3);
    engine.asSouth().chooseTargets(ainId);

    // The +2000 saves Ain (6000 + 2000 > 7000); no "rest 1 DON!!" choice is offered.
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getView("south").players.south.characters.map((c) => c?.instanceId)).toContain(
      ainId,
    );
    expect(northPowers(engine, [karooId, domaId])).toEqual([5000, 7000, 3000]);
    expect(engine.getView("south").players.south).toMatchObject({ activeDon: 0, restedDon: 3 });
  });

  test("declining the DON!! rest keeps the +2000 but gives no −1000", () => {
    const { engine, ainId, karooId, domaId } = setup(2, 0);
    engine.asSouth().chooseTargets(ainId);
    engine.asSouth().declineOptional();

    expect(engine.getView("south").players.south.characters.map((c) => c?.instanceId)).toContain(
      ainId,
    );
    expect(northPowers(engine, [karooId, domaId])).toEqual([5000, 7000, 3000]);
    expect(engine.getView("south").players.south).toMatchObject({ activeDon: 2, restedDon: 0 });
  });

  test("resting 1 DON!! gives the opponent's Leader and Characters −1000 this turn", () => {
    const { engine, ainId, karooId, domaId } = setup(2, 0);
    engine.asSouth().chooseTargets(ainId);
    engine.asSouth().acceptOptional();

    expect(northPowers(engine, [karooId, domaId])).toEqual([4000, 6000, 2000]);
    expect(engine.getView("south").players.south).toMatchObject({ activeDon: 1, restedDon: 1 });
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});
