import { describe, expect, test } from "vite-plus/test";
import { op13Higuma013, op17Kaido058, op17Kaido062, op17XDrake075 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// OP17-062 Kaido: "[Blocker] [Your Turn] [Once Per Turn] When a DON!! card on
// your field is returned to your DON!! deck, add up to 1 DON!! card as active
// from your DON!! deck. Then, set up to 1 of your DON!! cards as active."
//
// South returns DON!! by paying X.Drake's "[On Play] DON!! −2" cost.
function setup() {
  return OnePieceTestEngine.create(
    {
      leaderCardId: op17Kaido058,
      character: [op17Kaido062],
      hand: [op17XDrake075, op17XDrake075],
      activeDon: 4,
      restedDon: 2,
      donDeckCount: 4,
    },
    { hand: [op13Higuma013, op13Higuma013, op13Higuma013] },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

function playDrakeReturningRestedDon(engine: OnePieceTestEngine) {
  const south = engine.asSouth();
  south.play(op17XDrake075);
  south.acceptOptional();
  south.choose("effectCostReturnDon", ["rested-don:0", "rested-don:1"]);
  // X.Drake's effect: trash 1 card from the opponent's hand, chosen face-down.
  const trash = south.pendingDecision("effectTrashFromHandSelection").steps[0];
  if (trash?.kind !== "selectEntity") throw new Error("Expected X.Drake's trash choice.");
  south.choose("effectTrashFromHandSelection", [trash.candidates[0]!.ref.id]);
}

describe("OP17-062 Kaido", () => {
  test("a returned DON!! adds 1 active DON!! from the DON!! deck, then sets 1 DON!! active", () => {
    const engine = setup();
    const south = engine.asSouth();

    playDrakeReturningRestedDon(engine);
    // X.Drake rested 2 DON!! and returned 2 rested DON!! to the DON!! deck.
    expect(south.view().players.south).toMatchObject({
      activeDon: 2,
      restedDon: 2,
      donDeckCount: 6,
    });

    const addDon = south.pendingDecision("effectAddDon").steps[0];
    if (addDon?.kind !== "chooseOption") throw new Error("Expected Kaido's DON!! add choice.");
    expect(addDon.options.map((option) => option.id)).toEqual(["0", "1"]);
    south.chooseAddDon(1);
    expect(south.view().players.south).toMatchObject({
      activeDon: 3,
      restedDon: 2,
      donDeckCount: 5,
    });

    south.chooseSetActiveDon(1);
    const view = south.view();
    expect(view.players.south).toMatchObject({ activeDon: 4, restedDon: 1, donDeckCount: 5 });
    expect(view.prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Once Per Turn] a second return in the same turn does not trigger it again", () => {
    const engine = setup();
    const south = engine.asSouth();

    playDrakeReturningRestedDon(engine);
    south.chooseAddDon(1);
    south.chooseSetActiveDon(1);

    south.play(op17XDrake075);
    south.acceptOptional();
    south.choose("effectCostReturnDon", ["active-don:0", "active-don:1"]);
    const trash = south.pendingDecision("effectTrashFromHandSelection").steps[0];
    if (trash?.kind !== "selectEntity") throw new Error("Expected X.Drake's trash choice.");
    south.choose("effectTrashFromHandSelection", [trash.candidates[0]!.ref.id]);

    const view = south.view();
    expect(view.prompts).toHaveLength(0);
    expect(view.players.south).toMatchObject({ activeDon: 0, restedDon: 3, donDeckCount: 7 });
  });

  test("[Your Turn] a DON!! returned during the opponent's turn does not trigger it", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17Kaido058,
        character: [op17Kaido062],
        activeDon: 2,
        donDeckCount: 4,
      },
      { character: [{ card: op13Higuma013, playedOnTurn: 0 }] },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const south = engine.asSouth();

    // The Kaido Leader's [On Your Opponent's Attack] DON!! −1 returns a DON!!.
    engine.asNorth().attack(op13Higuma013, engine.leader("south"));
    south.acceptOptional();
    south.chooseNoTargets();

    expect(() => south.pendingDecision("effectAddDon")).toThrow();
    expect(south.view().players.south).toMatchObject({ activeDon: 1, donDeckCount: 5 });
  });

  test("it can add and set nothing", () => {
    const engine = setup();
    const south = engine.asSouth();

    playDrakeReturningRestedDon(engine);
    south.chooseAddDon(0);
    south.chooseSetActiveDon(0);

    const view = south.view();
    expect(view.prompts).toHaveLength(0);
    expect(view.players.south).toMatchObject({ activeDon: 2, restedDon: 2, donDeckCount: 6 });
  });
});
