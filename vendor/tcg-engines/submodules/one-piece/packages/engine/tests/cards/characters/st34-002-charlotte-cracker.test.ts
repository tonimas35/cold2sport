import { describe, expect, test } from "vite-plus/test";
import {
  eb01Fourtricks025,
  op08CharlottePudding058,
  op09NicoRobin062,
  op13Higuma013,
  st34CharlotteCracker002,
} from "@tcg/op-cards";
import type { LeaderCard } from "@tcg/op-types";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [On Play] If your Leader has the {Big Mom Pirates} type, add up to 1 DON!!
// card from your DON!! deck and rest it. Then, K.O. up to 1 of your opponent's
// Characters with a cost of 2 or less.
function setup(leaderCardId: LeaderCard) {
  return OnePieceTestEngine.create(
    {
      leaderCardId,
      hand: [st34CharlotteCracker002],
      activeDon: 4,
      donDeckCount: 3,
    },
    { character: [op13Higuma013, eb01Fourtricks025] },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("ST34-002 Charlotte Cracker", () => {
  test("with a Big Mom Pirates Leader adds 1 rested DON!!, then K.O.s a cost-2-or-less Character", () => {
    const engine = setup(op08CharlottePudding058);
    const south = engine.asSouth();
    const cheapId = engine.asNorth().findOnField(op13Higuma013);
    const tooExpensiveId = engine.asNorth().findOnField(eb01Fourtricks025);

    south.play(st34CharlotteCracker002);

    const addDon = south.pendingDecision("effectAddDon").steps[0];
    expect(addDon?.kind).toBe("chooseOption");
    if (addDon?.kind !== "chooseOption") throw new Error("Expected Cracker's DON!! add choice.");
    expect(addDon.options.map((option) => option.id)).toEqual(["0", "1"]);
    south.chooseAddDon(1);
    expect(south.view().players.south).toMatchObject({
      activeDon: 0,
      restedDon: 5,
      donDeckCount: 2,
    });

    const target = south.pendingDecision("effectTargetSelection").steps[0];
    expect(target?.kind).toBe("selectEntity");
    if (target?.kind !== "selectEntity") throw new Error("Expected Cracker's K.O. target.");
    expect(target).toMatchObject({ min: 0, max: 1 });
    const legalIds = target.candidates
      .filter((candidate) => candidate.legal)
      .map((candidate) => candidate.ref.id);
    expect(legalIds).toContain(cheapId);
    expect(legalIds).not.toContain(tooExpensiveId);
    south.chooseTargets(cheapId);

    const view = south.view();
    expect(view.players.north.trash.map((card) => card.instanceId)).toContain(cheapId);
    expect(view.players.north.characters.map((card) => card?.instanceId)).toContain(tooExpensiveId);
    expect(view.players.south.characters.map((card) => card?.cardId)).toContain(
      st34CharlotteCracker002.id,
    );
    expect(view.prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("with a non-Big Mom Pirates Leader adds no DON!!, but the Then K.O. still resolves", () => {
    const engine = setup(op09NicoRobin062);
    const south = engine.asSouth();
    const cheapId = engine.asNorth().findOnField(op13Higuma013);

    south.play(st34CharlotteCracker002);

    expect(() => south.pendingDecision("effectAddDon")).toThrow();
    expect(south.view().players.south).toMatchObject({
      activeDon: 0,
      restedDon: 4,
      donDeckCount: 3,
    });
    south.chooseTargets(cheapId);

    const view = south.view();
    expect(view.players.north.trash.map((card) => card.instanceId)).toContain(cheapId);
    expect(view.players.south).toMatchObject({ restedDon: 4, donDeckCount: 3 });
    expect(view.prompts).toHaveLength(0);
  });

  test("may add no DON!! and K.O. nothing", () => {
    const engine = setup(op08CharlottePudding058);
    const south = engine.asSouth();

    south.play(st34CharlotteCracker002);
    south.chooseAddDon(0);
    south.chooseNoTargets();

    const view = south.view();
    expect(view.players.south).toMatchObject({ activeDon: 0, restedDon: 4, donDeckCount: 3 });
    expect(view.players.north.characters.filter(Boolean)).toHaveLength(2);
    expect(view.players.north.trash).toHaveLength(0);
    expect(view.prompts).toHaveLength(0);
  });
});
