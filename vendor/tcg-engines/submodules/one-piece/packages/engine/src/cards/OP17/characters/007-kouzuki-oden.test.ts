import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  op01Inuarashi034,
  op01Marco023,
  op02Atmos003,
  op17KouzukiOden007,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../index.ts";

describe("OP17-007 Kouzuki Oden", () => {
  test("under [Edward.Newgate] (OP17-001) it replays a Land-of-Wano Whitebeard Character of 6000 or less power", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP17-001",
        hand: [op17KouzukiOden007, op01Inuarashi034],
        activeDon: op17KouzukiOden007.cost,
      },
      {},
    );
    const inuarashiId = engine.findCardInZone("south", "hand", op01Inuarashi034);

    engine.playCard(op17KouzukiOden007, "south");
    const play = engine.pendingDecision("effectPlaySelection", "south").steps[0];
    if (play?.kind !== "selectEntity") throw new Error("Expected the replay choice.");
    expect(play.candidates.map((candidate) => candidate.ref.id)).toEqual([inuarashiId]);
    engine.resolveDecision("effectPlaySelection", { selectedIds: [inuarashiId] }, "south");

    const view = engine.getView("south").players.south;
    expect(view.characters.map((card) => card?.instanceId)).toContain(inuarashiId);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  // Printed "play up to 1 {Land of Wano} type Character card or Character card
  // with a type including "Whitebeard Pirates"": either type is enough
  // (2-4-3 for the exact type, 2-4-3-1 for the quoted part of a type).
  test("also plays a Character without {Land of Wano} whose type includes Whitebeard Pirates", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP17-001",
        hand: [op17KouzukiOden007, op01Marco023, eb01Doma005, op02Atmos003],
        activeDon: op17KouzukiOden007.cost,
      },
      {},
    );
    const formerId = engine.findCardInZone("south", "hand", op01Marco023);
    const alliesId = engine.findCardInZone("south", "hand", eb01Doma005);
    const exactId = engine.findCardInZone("south", "hand", op02Atmos003);

    engine.playCard(op17KouzukiOden007, "south");
    const play = engine.pendingDecision("effectPlaySelection", "south").steps[0];
    if (play?.kind !== "selectEntity") throw new Error("Expected the replay choice.");
    expect(play.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [formerId, alliesId, exactId].sort(),
    );
    engine.resolveDecision("effectPlaySelection", { selectedIds: [alliesId] }, "south");

    const view = engine.getView("south").players.south;
    expect(view.characters.map((card) => card?.instanceId)).toContain(alliesId);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("does not open under a Leader without the name or trait", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP13-001",
        hand: [op17KouzukiOden007, op01Inuarashi034],
        activeDon: op17KouzukiOden007.cost,
      },
      {},
    );

    engine.playCard(op17KouzukiOden007, "south");

    const view = engine.getView("south").players.south;
    expect(view.hand.map((card) => card.cardId)).toContain(op01Inuarashi034.id);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
