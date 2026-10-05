import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01Fourtricks025,
  op13Higuma013,
  op17RocksDXebec039,
  op17Streusen050,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [On Play] Look at 2 cards from the top of your deck, reorganize them in any
// order and place them at the top or bottom of your deck. Then, draw 1 card.
// OP17 FAQ: the two cards cannot be split (1 on top, 1 at the bottom).
function setup() {
  return OnePieceTestEngine.create(
    {
      leaderCardId: op17RocksDXebec039,
      hand: [op17Streusen050],
      deck: [eb01Doma005, eb01Fourtricks025, op13Higuma013],
      activeDon: 1,
    },
    {},
    { firstPlayer: "south", activeSeat: "south" },
  );
}

describe("OP17-050 Streusen", () => {
  test("orders the top 2, keeps both on top, then draws the card chosen to be first", () => {
    const engine = setup();
    const south = engine.asSouth();
    const [domaId, fourtricksId, higumaId] = engine.getState().players.south.deck;

    south.play(op17Streusen050);

    const order = south.pendingDecision("effectRearrangeDeckOrder").steps[0];
    expect(order).toMatchObject({ kind: "orderItems" });
    if (order?.kind !== "orderItems") throw new Error("Expected Streusen's ordering step.");
    expect(order.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [domaId, fourtricksId].sort(),
    );
    // Nothing is drawn before the looked-at cards are placed.
    expect(south.view().players.south.hand).toHaveLength(0);
    south.orderCards("effectRearrangeDeckOrder", [fourtricksId!, domaId!]);

    const position = south.pendingDecision("effectRearrangeDeckPosition").steps[0];
    if (position?.kind !== "chooseOption") throw new Error("Expected the top-or-bottom choice.");
    // One choice for both cards: there is no option to split them.
    expect(position.options.map((option) => option.id)).toEqual(["top", "bottom"]);
    south.chooseOption("effectRearrangeDeckPosition", "top");

    expect(south.view().players.south.hand.map((card) => card.instanceId)).toEqual([fourtricksId]);
    expect(engine.getState().players.south.deck).toEqual([domaId, higumaId]);
    expect(south.view().prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("placing both at the bottom draws the third card and keeps the chosen order below", () => {
    const engine = setup();
    const south = engine.asSouth();
    const [domaId, fourtricksId, higumaId] = engine.getState().players.south.deck;

    south.play(op17Streusen050);
    south.orderCards("effectRearrangeDeckOrder", [fourtricksId!, domaId!]);
    south.chooseOption("effectRearrangeDeckPosition", "bottom");

    expect(south.view().players.south.hand.map((card) => card.instanceId)).toEqual([higumaId]);
    expect(engine.getState().players.south.deck).toEqual([fourtricksId, domaId]);
    expect(south.view().prompts).toHaveLength(0);
  });
});
