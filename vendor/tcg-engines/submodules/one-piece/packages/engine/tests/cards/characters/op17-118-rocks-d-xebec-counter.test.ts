import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  op04Chaka008,
  op17RocksDXebec039,
  op17RocksDXebec118,
  op17Streusen050,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";
import { getCardCounter } from "../../../src/shared.ts";

// OP17-118 Rocks.D.Xebec: "If you only have Characters without a Counter, this
// card in your hand has a +2000 Counter." OP17 FAQ: with 0 Characters it does
// NOT have Counter +2000. The printed card has no Counter of its own.
// OP04-008 Chaka is a Character without a Counter (OP16-016 Ramba, used here
// before, has Counter +1000 on the official card list).
function setup(character: FixtureCardEntry[]) {
  const engine = OnePieceTestEngine.create(
    {
      leaderCardId: op17RocksDXebec039,
      hand: [op17RocksDXebec118, eb01Doma005],
      character,
      deck: 10,
    },
    { deck: 10, activeDon: 10 },
    { firstPlayer: "south", activeSeat: "north" },
  );
  const xebecId = engine.findCardInZone("south", "hand", op17RocksDXebec118);
  // North's Leader attacks with 1 DON!!: 6000 against the Rocks Leader's 5000.
  engine.attachDon(engine.leader("north"), 1, "north");
  return { engine, xebecId };
}

function counterOption(engine: OnePieceTestEngine, instanceId: string) {
  const step = engine.pendingDecision("battleCounter", "south").steps[0];
  if (step?.kind !== "selectEntity") throw new Error("Expected the Counter Step selection.");
  const candidate = step.candidates.find((entry) => entry.ref.id === instanceId);
  if (!candidate) throw new Error("Expected Rocks.D.Xebec among the Counter Step options.");
  return candidate;
}

describe("OP17-118 Rocks.D.Xebec counter in hand", () => {
  test("with only Counter-less Characters it is a +2000 Counter that saves the Leader", () => {
    const { engine, xebecId } = setup([op04Chaka008, op17Streusen050]);
    const lifeBefore = engine.getView("south").players.south.lifeCount;
    expect(getCardCounter(engine.getState(), xebecId)).toBe(2000);

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    expect(counterOption(engine, xebecId)).toMatchObject({
      legal: true,
      label: "Rocks.D.Xebec (+2000)",
    });
    engine.asSouth().chooseCounter(xebecId);

    // 5000 + 2000 = 7000 > 6000: the attack fails and Xebec is trashed.
    const south = engine.getView("south").players.south;
    expect(south.lifeCount).toBe(lifeBefore);
    expect(south.trash.map((card) => card.instanceId)).toEqual([xebecId]);
    expect(south.hand.map((card) => card.instanceId)).not.toContain(xebecId);
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("with 0 Characters it has no Counter (OP17 FAQ) and cannot be used", () => {
    const { engine, xebecId } = setup([]);
    expect(getCardCounter(engine.getState(), xebecId)).toBe(0);

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    expect(counterOption(engine, xebecId)).toMatchObject({ legal: false });
    engine.expectFailure({
      type: "resolvePrompt",
      seat: "south",
      promptId: engine.pendingDecision("battleCounter", "south").id,
      selectedIds: [xebecId],
    });
  });

  test("a Character with a Counter on the field turns the +2000 Counter off", () => {
    const { engine, xebecId } = setup([op04Chaka008, eb01Doma005]);
    const lifeBefore = engine.getView("south").players.south.lifeCount;
    expect(getCardCounter(engine.getState(), xebecId)).toBe(0);

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    expect(counterOption(engine, xebecId)).toMatchObject({ legal: false });
    engine.asSouth().chooseCounter();
    expect(engine.getView("south").players.south.lifeCount).toBe(lifeBefore - 1);
  });

  test("only the copy in hand gains the Counter; other hand cards keep their own", () => {
    const { engine, xebecId } = setup([op04Chaka008]);
    const domaId = engine.findCardInZone("south", "hand", eb01Doma005);
    expect(getCardCounter(engine.getState(), xebecId)).toBe(2000);
    expect(getCardCounter(engine.getState(), domaId)).toBe(1000);

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    engine.asSouth().chooseCounter(xebecId, domaId);
    // 5000 + 2000 + 1000 = 8000 > 6000.
    const south = engine.getView("south").players.south;
    expect(south.trash.map((card) => card.instanceId)).toHaveLength(2);
    expect(south.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([xebecId, domaId]),
    );
  });
});
