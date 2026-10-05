import { describe, expect, test } from "vite-plus/test";
import {
  op14eb04King031,
  op16PortgasDAce118,
  op16Ramba016,
  op17Kaido058,
  op17Kaido062,
  op17Kaido063,
  op17KundaliDragonSwarm077,
  op17XDrake075,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";
import { getCardCounter } from "../../../src/shared.ts";

// OP17-063 Kaido: "All Character cards in your hand without a Counter have a
// +1000 Counter.
// [Activate: Main] [Once Per Turn] DON!! −1: If this Character was played on
// this turn, negate the effect of up to 1 of your opponent's Characters with a
// cost of 6 or less during this turn, and K.O. it."

// North's 5000 Leader (no DON!!) attacks South's 5000 Leader, so any +1000
// Counter repels the attack.
function defend(character: FixtureCardEntry[], hand: FixtureCardEntry[]) {
  return OnePieceTestEngine.create(
    { leaderCardId: op17Kaido058, character, hand },
    { activeDon: 5 },
    { firstPlayer: "south", activeSeat: "north" },
  );
}

function counterOption(engine: OnePieceTestEngine, instanceId: string) {
  const step = engine.pendingDecision("battleCounter", "south").steps[0];
  if (step?.kind !== "selectEntity") throw new Error("Expected the Counter Step selection.");
  const candidate = step.candidates.find((entry) => entry.ref.id === instanceId);
  if (!candidate) throw new Error(`Expected ${instanceId} among the Counter Step options.`);
  return candidate;
}

function activate({ playedThisTurn = true } = {}) {
  return OnePieceTestEngine.create(
    {
      leaderCardId: op17Kaido058,
      character: [{ card: op17Kaido063, playedOnTurn: playedThisTurn ? 1 : 0 }],
      activeDon: 2,
      donDeckCount: 2,
    },
    { character: [op17XDrake075, op17Kaido062] },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("OP17-063 Kaido", () => {
  test("Character cards in hand without a Counter have a +1000 Counter that repels an attack", () => {
    const engine = defend(
      [op17Kaido063],
      [op14eb04King031, op17XDrake075, op17KundaliDragonSwarm077],
    );
    const kingId = engine.findCardInZone("south", "hand", op14eb04King031);
    const drakeId = engine.findCardInZone("south", "hand", op17XDrake075);
    const eventId = engine.findCardInZone("south", "hand", op17KundaliDragonSwarm077);
    const state = engine.getState();
    expect(getCardCounter(state, kingId)).toBe(1000);
    // A printed Counter is kept as it is, and an Event is not a Character card.
    expect(getCardCounter(state, drakeId)).toBe(2000);
    expect(getCardCounter(state, eventId)).toBe(0);
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    expect(counterOption(engine, kingId)).toMatchObject({ legal: true, label: "King (+1000)" });
    engine.asSouth().chooseCounter(kingId);

    // 5000 + 1000 > 5000: the attack is repelled and King goes to the trash.
    const south = engine.getView("south").players.south;
    expect(south.lifeCount).toBe(lifeBefore);
    expect(south.trash.map((card) => card.instanceId)).toEqual([kingId]);
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("the Counter comes only from a Kaido on the field (2-8-2) and two copies do not stack (2-10-4)", () => {
    const inHand = defend([], [op17Kaido063, op14eb04King031]);
    expect(
      getCardCounter(inHand.getState(), inHand.findCardInZone("south", "hand", op14eb04King031)),
    ).toBe(0);
    expect(
      getCardCounter(inHand.getState(), inHand.findCardInZone("south", "hand", op17Kaido063)),
    ).toBe(0);
    inHand.asNorth().attack(inHand.leader("north"), inHand.leader("south"));
    expect(
      counterOption(inHand, inHand.findCardInZone("south", "hand", op14eb04King031)),
    ).toMatchObject({ legal: false });

    const twoCopies = defend([op17Kaido063, op17Kaido063], [op14eb04King031]);
    expect(
      getCardCounter(
        twoCopies.getState(),
        twoCopies.findCardInZone("south", "hand", op14eb04King031),
      ),
    ).toBe(1000);
  });

  test("with OP16-118 Ace on the field an 8000-power card without a Counter has Counter +2000 (OP17 FAQ)", () => {
    // OP17 FAQ (OP17-063): with "OP16-118 Portgas.D.Ace" on the field, Character
    // cards in hand with 8000 power and no Counter are treated as Counter
    // +2000. A card with several Counters uses only the highest (2-10-4).
    const engine = defend([op17Kaido063, op16PortgasDAce118], [op16Ramba016, op14eb04King031]);
    const state = engine.getState();
    expect(getCardCounter(state, engine.findCardInZone("south", "hand", op16Ramba016))).toBe(2000);
    // King has 7000 power, so only Kaido's +1000 applies.
    expect(getCardCounter(state, engine.findCardInZone("south", "hand", op14eb04King031))).toBe(
      1000,
    );
  });

  test("[Activate: Main] DON!! −1 negates a cost-6-or-less Character and K.O.s that same Character", () => {
    const engine = activate();
    const south = engine.asSouth();
    const drakeId = engine.findCardInZone("north", "character", op17XDrake075);
    const bigKaidoId = engine.findCardInZone("north", "character", op17Kaido062);

    south.activateMain(op17Kaido063);
    south.acceptOptional();
    const target = south.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the negate target.");
    expect(target).toMatchObject({ min: 0, max: 1 });
    // The cost-10 Kaido is not a legal choice.
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([drakeId]);
    south.chooseTargets(drakeId);

    // "and K.O. it": the negated X.Drake is K.O.'d without a second choice.
    const view = south.view();
    expect(view.prompts).toHaveLength(0);
    expect(view.players.north.trash.map((card) => card.instanceId)).toEqual([drakeId]);
    expect(view.players.north.characters.map((card) => card?.instanceId)).toContain(bigKaidoId);
    expect(view.players.south).toMatchObject({ activeDon: 1, donDeckCount: 3 });
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Activate: Main] choosing no Character to negate K.O.s nothing", () => {
    const engine = activate();
    const south = engine.asSouth();

    south.activateMain(op17Kaido063);
    south.acceptOptional();
    south.chooseNoTargets();

    const view = south.view();
    expect(view.prompts).toHaveLength(0);
    expect(view.players.north.characters.filter(Boolean)).toHaveLength(2);
    expect(view.players.north.trash).toHaveLength(0);
    expect(view.players.south).toMatchObject({ activeDon: 1, donDeckCount: 3 });
  });

  test("[Activate: Main] when Kaido was not played this turn it pays DON!! −1 and does nothing", () => {
    const engine = activate({ playedThisTurn: false });
    const south = engine.asSouth();

    south.activateMain(op17Kaido063);
    south.acceptOptional();

    const view = south.view();
    expect(view.prompts).toHaveLength(0);
    expect(view.players.north.characters.filter(Boolean)).toHaveLength(2);
    expect(view.players.south).toMatchObject({ activeDon: 1, donDeckCount: 3 });
  });

  test("[Activate: Main] can be declined without paying DON!! −1", () => {
    const engine = activate();
    const south = engine.asSouth();

    south.activateMain(op17Kaido063);
    south.declineOptional();

    const view = south.view();
    expect(view.prompts).toHaveLength(0);
    expect(view.players.north.characters.filter(Boolean)).toHaveLength(2);
    expect(view.players.south).toMatchObject({ activeDon: 2, donDeckCount: 2 });
  });
});
