import { describe, expect, test } from "vite-plus/test";
import {
  op12Baby5112,
  op12SilversRayleigh001,
  op17CharlotteCracker104,
  op17CharlotteDaifuku107,
  op17CharlotteLinlin112,
  op17KundaliDragonSwarm077,
  op17Yamato074,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// OP17-112 Charlotte Linlin: "[Your Turn] The base power of all of your
// Characters with a [Trigger] and 4000 base power becomes 8000." (The [On Play]
// half is covered in src/cards/OP17/characters/112-charlotte-linlin.test.ts.)
// OP17 FAQ: a Character whose base power became 8000 this way does not also
// count as having 4000 base power.

function setup(
  south: { leaderCardId?: typeof op12SilversRayleigh001; hand?: FixtureCardEntry[] } = {},
) {
  return OnePieceTestEngine.create(
    {
      ...south,
      character: [
        op17CharlotteLinlin112,
        { card: op17CharlotteDaifuku107, playedOnTurn: 0 },
        op17CharlotteCracker104,
        op12Baby5112,
        op17Yamato074,
      ],
      activeDon: 2,
    },
    { character: [op17CharlotteDaifuku107] },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

function southPower(engine: OnePieceTestEngine, card: { id: string }) {
  return engine.getView("south").players.south.characters.find((entry) => entry?.cardId === card.id)
    ?.power;
}

describe("OP17-112 Charlotte Linlin", () => {
  test("[Your Turn] your [Trigger] Characters with 4000 base power have 8000 base power", () => {
    const engine = setup();

    expect(southPower(engine, op17CharlotteDaifuku107)).toBe(8000);
    expect(southPower(engine, op17CharlotteCracker104)).toBe(8000);
    // Baby 5 has a [Trigger] but 5000 base power; Yamato has no [Trigger].
    expect(southPower(engine, op12Baby5112)).toBe(5000);
    expect(southPower(engine, op17Yamato074)).toBe(1000);
    // Only your own Characters change.
    expect(engine.getView("south").players.north.characters[0]?.power).toBe(4000);
  });

  test("[Your Turn] the 8000 base power is used in battle", () => {
    const engine = setup();
    const lifeBefore = engine.getView("south").players.north.lifeCount;

    // 8000 against the 5000 Leader (at 4000 the attack would fail). North has
    // no hand, so there is no Counter Step choice.
    engine.asSouth().attack(op17CharlotteDaifuku107, engine.leader("north"));

    expect(engine.getView("south").players.north.lifeCount).toBe(lifeBefore - 1);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("during the opponent's turn the base power is 4000 again", () => {
    const engine = setup();
    engine.asSouth().endTurn();

    expect(engine.getState().activeSeat).toBe("north");
    expect(southPower(engine, op17CharlotteDaifuku107)).toBe(4000);
    expect(southPower(engine, op17CharlotteCracker104)).toBe(4000);
  });

  test("a Character whose base power became 8000 no longer has 4000 base power (OP17 FAQ)", () => {
    // OP12-001 Silvers Rayleigh: "[Activate: Main] [Once Per Turn] You may
    // reveal 2 Events from your hand: Up to 1 of your Characters with 4000 base
    // power or less gains +2000 power during this turn."
    const engine = setup({
      leaderCardId: op12SilversRayleigh001,
      hand: [op17KundaliDragonSwarm077, op17KundaliDragonSwarm077],
    });
    const south = engine.asSouth();

    south.activateMain(engine.leader("south"));
    south.acceptOptional();
    const target = south.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected Rayleigh's +2000 target.");
    const candidates = target.candidates.map(
      (candidate) => engine.getState().cards[candidate.ref.id]?.cardId,
    );
    expect(candidates).toEqual([op17Yamato074.id]);
    south.chooseTargets(engine.findCardInZone("south", "character", op17Yamato074));

    expect(southPower(engine, op17Yamato074)).toBe(3000);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
