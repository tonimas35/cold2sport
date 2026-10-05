import { describe, expect, test } from "vite-plus/test";
import {
  eb01KouzukiOden001,
  op17EdwardNewgate001,
  op17EdwardNewgate005,
  op17RocksDXebec039,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// If your opponent has a Character with 10000 power or more, give this card in
// your hand −4 cost.
// [On Play] Your monocolored Leader's base power becomes 8000 until the end of
// your opponent's next End Phase.
//
// The [On Play] had no block in the catalog (catalog-check structure:onPlay).
// OP17 FAQ: "your monocolored Leader" is a Leader with only 1 color.
function setup(leader: { id: string }) {
  return OnePieceTestEngine.create(
    { leaderCardId: leader, hand: [op17EdwardNewgate005], activeDon: 10 },
    {},
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("OP17-005 Edward.Newgate", () => {
  test("a monocolored Leader's base power becomes 8000 until the end of the opponent's next turn", () => {
    const engine = setup(op17EdwardNewgate001);
    const south = engine.asSouth();
    expect(south.view().players.south.leader.power).toBe(5000);

    south.play(op17EdwardNewgate005);
    expect(south.view().players.south.leader.power).toBe(8000);
    expect(south.view().prompts).toHaveLength(0);

    south.endTurn();
    // Still 8000 during the opponent's turn.
    expect(engine.getView("south").players.south.leader.power).toBe(8000);

    engine.asNorth().endTurn();
    expect(engine.getView("south").players.south.leader.power).toBe(5000);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("any monocolored Leader qualifies, not only [Edward.Newgate]", () => {
    const engine = setup(op17RocksDXebec039);
    engine.asSouth().play(op17EdwardNewgate005);
    expect(engine.getView("south").players.south.leader.power).toBe(8000);
  });

  test("a multicolored Leader keeps its base power", () => {
    const engine = setup(eb01KouzukiOden001);
    engine.asSouth().play(op17EdwardNewgate005);
    expect(engine.getView("south").players.south.leader.power).toBe(5000);
  });
});
