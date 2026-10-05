import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01Fourtricks025,
  op08CountNiwatori071,
  op13Higuma013,
  op17Kaido058,
  st34CharlotteLinlin004,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// [On Play] DON!! −4, you may trash 1 card from your hand: Add up to 1 card
// from the top of your deck to the top of your Life cards. Then, up to 1 of
// your opponent's Characters' base power becomes 0 during this turn.
function setup({
  hand = [st34CharlotteLinlin004, eb01Doma005, op13Higuma013],
  character = [],
}: { hand?: FixtureCardEntry[]; character?: FixtureCardEntry[] } = {}) {
  return OnePieceTestEngine.create(
    {
      leaderCardId: op17Kaido058,
      hand,
      character,
      deck: [eb01Fourtricks025, eb01Doma005],
      activeDon: 10,
      donDeckCount: 0,
    },
    { character: [op08CountNiwatori071, eb01Fourtricks025] },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("ST34-004 Charlotte Linlin", () => {
  test("returns 4 DON!!, trashes the chosen hand card, gains 1 Life and sets an opposing Character's base power to 0 this turn", () => {
    const engine = setup();
    const south = engine.asSouth();
    const keptId = engine.findCardInZone("south", "hand", eb01Doma005);
    const trashedId = engine.findCardInZone("south", "hand", op13Higuma013);
    const lifeTopId = engine.getState().players.south.deck[0];
    const niwatoriId = engine.asNorth().findOnField(op08CountNiwatori071);
    const fourtricksId = engine.asNorth().findOnField(eb01Fourtricks025);
    const lifeBefore = south.view().players.south.lifeCount;

    south.play(st34CharlotteLinlin004);
    // Paying 10 for Linlin rests every DON!!: the DON!! −4 has no choice to make.
    expect(south.view().players.south).toMatchObject({ activeDon: 0, restedDon: 10 });
    south.acceptOptional();

    const trash = south.pendingDecision("effectCostTrashFromHand").steps[0];
    expect(trash).toMatchObject({ kind: "payCost", min: 1, max: 1 });
    if (trash?.kind !== "payCost") throw new Error("Expected Linlin's hand cost.");
    expect(trash.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [keptId, trashedId].sort(),
    );
    south.choose("effectCostTrashFromHand", [trashedId]);
    expect(south.view().players.south).toMatchObject({ restedDon: 6, donDeckCount: 4 });

    const gainLife = south.pendingDecision("effectAddToLifeFromDeck").steps[0];
    if (gainLife?.kind !== "chooseOption") throw new Error("Expected Linlin's Life choice.");
    expect(gainLife.options.map((option) => option.id)).toEqual(["0", "1"]);
    south.chooseOption("effectAddToLifeFromDeck", "1");

    const target = south.pendingDecision("effectTargetSelection").steps[0];
    expect(target).toMatchObject({ kind: "selectEntity", min: 0, max: 1 });
    if (target?.kind !== "selectEntity") throw new Error("Expected Linlin's power target.");
    expect(target.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [niwatoriId, fourtricksId].sort(),
    );
    south.chooseTargets(niwatoriId);

    const view = south.view();
    const powerOf = (instanceId: string) =>
      south.view().players.north.characters.find((card) => card?.instanceId === instanceId)?.power;
    expect(powerOf(niwatoriId)).toBe(0);
    expect(powerOf(fourtricksId)).toBe(5000);
    expect(view.players.south.lifeCount).toBe(lifeBefore + 1);
    expect(engine.getState().players.south.life[0]).toBe(lifeTopId);
    expect(view.players.south.trash.map((card) => card.instanceId)).toEqual([trashedId]);
    expect(view.players.south.hand.map((card) => card.instanceId)).toEqual([keptId]);
    expect(view.players.south).toMatchObject({ activeDon: 0, restedDon: 6, donDeckCount: 4 });
    expect(view.prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);

    south.endTurn();
    expect(powerOf(niwatoriId)).toBe(7000);
  });

  test("asks which 4 DON!! to return when some are given to a Character, then which card to trash", () => {
    const engine = setup({ character: [{ card: eb01Doma005, attachedDon: 2 }] });
    const south = engine.asSouth();
    const holderId = engine.asSouth().findOnField(eb01Doma005);
    const trashedId = engine.findCardInZone("south", "hand", op13Higuma013);

    south.play(st34CharlotteLinlin004);
    south.acceptOptional();

    const returnDon = south.pendingDecision("effectCostReturnDon").steps[0];
    expect(returnDon).toMatchObject({ kind: "payCost", min: 4, max: 4 });
    if (returnDon?.kind !== "payCost") throw new Error("Expected Linlin's DON!! −4 choice.");
    const candidateIds = returnDon.candidates.map((candidate) => candidate.ref.id);
    expect(candidateIds).toEqual(
      expect.arrayContaining([`attached-don:${holderId}:0`, `attached-don:${holderId}:1`]),
    );
    south.choose("effectCostReturnDon", [
      `attached-don:${holderId}:0`,
      `attached-don:${holderId}:1`,
      "rested-don:0",
      "rested-don:1",
    ]);
    south.choose("effectCostTrashFromHand", [trashedId]);
    south.chooseOption("effectAddToLifeFromDeck", "0");
    south.chooseNoTargets();

    const view = south.view();
    expect(
      view.players.south.characters.find((card) => card?.instanceId === holderId),
    ).toMatchObject({ attachedDon: 0 });
    expect(view.players.south).toMatchObject({ restedDon: 8, donDeckCount: 4 });
    expect(view.players.south.trash.map((card) => card.instanceId)).toEqual([trashedId]);
    expect(view.prompts).toHaveLength(0);
  });

  test("may decline the optional cost so nothing happens", () => {
    const engine = setup();
    const south = engine.asSouth();
    const niwatoriId = engine.asNorth().findOnField(op08CountNiwatori071);

    south.play(st34CharlotteLinlin004);
    const before = south.view().players.south;
    engine.resolveDecision("effectOptional", { optionId: "no" }, "south");

    const after = south.view().players.south;
    expect(after.restedDon).toBe(before.restedDon);
    expect(after.donDeckCount).toBe(before.donDeckCount);
    expect(after.hand.length).toBe(before.hand.length);
    expect(after.lifeCount).toBe(before.lifeCount);
    expect(after.trash).toHaveLength(0);
    expect(
      south.view().players.north.characters.find((card) => card?.instanceId === niwatoriId)?.power,
    ).toBe(7000);
    expect(south.view().prompts).toHaveLength(0);
  });

  test("with no other card in hand the cost cannot be paid, so the effect is not offered", () => {
    const engine = setup({ hand: [st34CharlotteLinlin004] });
    const south = engine.asSouth();
    const lifeBefore = south.view().players.south.lifeCount;

    south.play(st34CharlotteLinlin004);

    const view = south.view();
    expect(view.prompts).toHaveLength(0);
    expect(view.players.south).toMatchObject({ restedDon: 10, donDeckCount: 0 });
    expect(view.players.south.lifeCount).toBe(lifeBefore);
  });
});
