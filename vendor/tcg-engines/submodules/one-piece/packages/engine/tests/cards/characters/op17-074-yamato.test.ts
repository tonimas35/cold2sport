import { describe, expect, test } from "vite-plus/test";
import { op17Kaido058, op17Yamato074 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// OP17-074 Yamato: "[Blocker] [On Play] Add up to 1 DON!! card as rested from
// your DON!! deck."
function setup(donDeckCount: number) {
  return OnePieceTestEngine.create(
    { leaderCardId: op17Kaido058, hand: [op17Yamato074], activeDon: 5, donDeckCount },
    {},
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("OP17-074 Yamato", () => {
  test("[On Play] adds 1 DON!! card from the DON!! deck as rested", () => {
    const engine = setup(5);
    const south = engine.asSouth();

    south.play(op17Yamato074);
    const addDon = south.pendingDecision("effectAddDon").steps[0];
    if (addDon?.kind !== "chooseOption") throw new Error("Expected Yamato's DON!! add choice.");
    expect(addDon.options.map((option) => option.id)).toEqual(["0", "1"]);
    south.chooseAddDon(1);

    // Yamato's cost rests 3 of the 5 active DON!!; the added DON!! comes in rested.
    const view = south.view();
    expect(view.players.south).toMatchObject({ activeDon: 2, restedDon: 4, donDeckCount: 4 });
    expect(view.players.south.characters.map((card) => card?.cardId)).toContain(op17Yamato074.id);
    expect(view.prompts).toHaveLength(0);
  });

  test("[On Play] may add no DON!!", () => {
    const engine = setup(5);
    const south = engine.asSouth();

    south.play(op17Yamato074);
    south.chooseAddDon(0);

    const view = south.view();
    expect(view.players.south).toMatchObject({ activeDon: 2, restedDon: 3, donDeckCount: 5 });
    expect(view.prompts).toHaveLength(0);
  });

  test("[On Play] with an empty DON!! deck there is nothing to add", () => {
    const engine = setup(0);
    const south = engine.asSouth();

    south.play(op17Yamato074);

    const view = south.view();
    expect(view.prompts).toHaveLength(0);
    expect(view.players.south).toMatchObject({ activeDon: 2, restedDon: 3, donDeckCount: 0 });
  });
});
