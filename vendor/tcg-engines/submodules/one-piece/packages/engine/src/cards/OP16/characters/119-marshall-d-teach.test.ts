import { describe, expect, test } from "vite-plus/test";

import { OnePieceTestEngine } from "../../../index.ts";

describe("OP16-119 Marshall.D.Teach", () => {
  test("[On Play] looks at 3, may put a card on top of Life, and bottom-orders the rest", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: ["OP16-119"],
        deck: ["OP13-013", "OP16-004", "OP13-013", "OP13-013", "OP13-013"],
        activeDon: 8,
      },
      {},
    );
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    engine.playCard("OP16-119");
    const search = engine.pendingDecision("effectSearchSelection", "south").steps[0];
    if (search?.kind !== "selectEntity") throw new Error("Expected the search choice.");
    const curiel = search.candidates.find(
      (candidate) => candidate.publicInfo?.cardId === "OP16-004",
    );
    if (!curiel) throw new Error("Expected Curiel among the looked cards.");
    engine.resolveDecision("effectSearchSelection", { selectedIds: [curiel.ref.id!] }, "south");

    const order = engine.pendingDecision("effectSearchRemainderOrder", "south").steps[0];
    if (order?.kind !== "orderItems") throw new Error("Expected the remainder order.");
    engine.resolveDecision(
      "effectSearchRemainderOrder",
      { selectedIds: order.candidates.map((candidate) => candidate.ref.id) },
      "south",
    );

    const south = engine.getView("south").players.south;
    expect(south.lifeCount).toBe(lifeBefore + 1);
    const state = engine.getState();
    expect(state.cards[state.players.south.life[0]!]!.cardId).toBe("OP16-004");
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("the opponent's view of the face-down Life card's logs carries no card ids", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: ["OP16-119"],
        deck: ["OP13-013", "OP16-004", "OP13-013", "OP13-013", "OP13-013"],
        activeDon: 8,
      },
      {},
    );
    const curielId = engine.findCardInZone("south", "deck", "OP16-004");

    engine.playCard("OP16-119");
    engine.resolveDecision("effectSearchSelection", { selectedIds: [curielId] }, "south");
    const order = engine.pendingDecision("effectSearchRemainderOrder", "south").steps[0];
    if (order?.kind !== "orderItems") throw new Error("Expected the remainder order.");
    engine.resolveDecision(
      "effectSearchRemainderOrder",
      { selectedIds: order.candidates.map((candidate) => candidate.ref.id) },
      "south",
    );

    // North cannot see the card placed face-down in south's Life: no log line
    // of its view names it, by card id or instance id.
    const northLogs = engine.getView("north").logs;
    const mentionsCuriel = (log: (typeof northLogs)[number]) =>
      log.sourceCardId === "OP16-004" ||
      log.sourceInstanceId === curielId ||
      log.targetIds.includes(curielId);
    expect(northLogs.filter(mentionsCuriel)).toEqual([]);
    const northLifeLogs = northLogs.filter(
      (log) => log.visibility === "private" && log.message.includes("Life"),
    );
    expect(northLifeLogs.length).toBeGreaterThan(0);
    for (const log of northLifeLogs) {
      expect(log).toMatchObject({ sourceCardId: null, sourceInstanceId: null, targetIds: [] });
    }
    // South, who placed it, keeps the ids; public lines keep theirs for both.
    expect(engine.getView("south").logs.some(mentionsCuriel)).toBe(true);
    expect(
      northLogs.find((log) => log.visibility === "public" && log.message.includes("plays")),
    ).toMatchObject({ sourceCardId: "OP16-119" });
  });

  test("declining the Life add keeps the Life area untouched", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: ["OP16-119"],
        deck: ["OP13-013", "OP13-013", "OP13-013", "OP13-013", "OP13-013"],
        activeDon: 8,
      },
      {},
    );
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    engine.playCard("OP16-119");
    const search = engine.pendingDecision("effectSearchSelection", "south").steps[0];
    if (search?.kind !== "selectEntity") throw new Error("Expected the search choice.");
    engine.resolveDecision("effectSearchSelection", { selectedIds: [] }, "south");

    const order = engine.pendingDecision("effectSearchRemainderOrder", "south").steps[0];
    if (order?.kind !== "orderItems") throw new Error("Expected the remainder order.");
    engine.resolveDecision(
      "effectSearchRemainderOrder",
      { selectedIds: order.candidates.map((candidate) => candidate.ref.id) },
      "south",
    );

    expect(engine.getView("south").players.south.lifeCount).toBe(lifeBefore);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
