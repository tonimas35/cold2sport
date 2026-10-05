import { describe, expect, test } from "vite-plus/test";

import { OnePieceTestEngine } from "../../../index.ts";

describe("OP17-036 Withdraw Now and Allow Me to Save Face", () => {
  test("[Main] resting 6 DON!! rests a Character then K.O.s up to 2 rested cost-6-or-less", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: ["OP17-036", "EB01-005"],
        activeDon: 12,
      },
      { character: ["OP16-012", "OP16-002", "OP16-003"], activeDon: 5 },
    );

    engine.playCard("OP17-036");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    const rest = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (rest?.kind !== "selectEntity") throw new Error("Expected the rest target.");
    const restId = rest.candidates.find((c) => c.publicInfo?.cardId === "OP16-012")!.ref.id!;
    engine.resolveDecision("effectTargetSelection", { selectedIds: [restId] }, "south");
    const ko = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (ko?.kind !== "selectEntity") throw new Error("Expected the K.O. targets.");
    // Only the just-rested Benn is a "rested Character with cost 6 or less".
    expect(ko.candidates.map((candidate) => candidate.publicInfo?.cardId)).toEqual(["OP16-012"]);
    engine.resolveDecision(
      "effectTargetSelection",
      { selectedIds: [ko.candidates[0]!.ref.id] },
      "south",
    );

    const northTrash = engine.getView("south").players.north.trash.map((card) => card.cardId);
    expect(northTrash).toContain("OP16-012");
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Counter] up to 1 of your [Shanks], the Leader included, gains +4000 during the battle", () => {
    // OP17-020 Shanks Leader with OP17-022 Shanks and OP17-029 Hongo on the
    // field. North's Leader attacks with 2 DON!! (7000) against 5000.
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: "OP17-020",
        hand: ["OP17-036"],
        character: ["OP17-022", "OP17-029"],
        activeDon: 1,
      },
      { activeDon: 5 },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const leaderId = engine.leader("south");
    const shanksId = engine.findCardInZone("south", "character", "OP17-022");
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    engine.attachDon(engine.leader("north"), 2, "north");
    engine.asNorth().attack(engine.leader("north"), leaderId);
    // Hongo is a [Blocker]; South does not block.
    engine.asSouth().chooseBlocker();
    const counter = engine.pendingDecision("battleCounter", "south").steps[0];
    if (counter?.kind !== "selectEntity") throw new Error("Expected the Counter Step.");
    const eventId = engine.findCardInZone("south", "hand", "OP17-036");
    expect(counter.candidates.find((candidate) => candidate.ref.id === eventId)?.legal).toBe(true);
    engine.asSouth().chooseCounter("OP17-036");

    const target = engine.pendingDecision("effectTargetSelection", "south").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the [Shanks] target.");
    expect(target.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [leaderId, shanksId].sort(),
    );
    engine.asSouth().chooseTargets(leaderId);

    // 5000 + 4000 > 7000: no damage; the event cost 1 DON!!.
    const south = engine.getView("south").players.south;
    expect(south.lifeCount).toBe(lifeBefore);
    expect(south).toMatchObject({ activeDon: 0, restedDon: 1 });
    expect(south.trash.map((card) => card.cardId)).toEqual(["OP17-036"]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("[Optional] declined leaves the board unchanged", () => {
    const engine = OnePieceTestEngine.create({ hand: ["OP17-036"], activeDon: 3 }, {});

    engine.playCard("OP17-036");
    const gate = engine.getView("south").decisions?.[0] as
      | { extensions?: { resolutionIntent?: string } }
      | undefined;
    const gateIntent = gate?.extensions?.resolutionIntent;
    if (gateIntent === "effectOptional") {
      engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    } else if (gateIntent) {
      const gateStep = engine.pendingDecision(gateIntent as never, "south").steps[0];
      if (gateStep?.kind === "selectEntity" || gateStep?.kind === "orderItems") {
        engine.resolveDecision(gateIntent as never, { selectedIds: [] }, "south");
      } else if (gateStep?.kind === "chooseOption") {
        engine.resolveDecision(gateIntent as never, { optionId: "0" }, "south");
      }
    }

    expect(engine.getView("south").players.south.trash.map((c) => c.cardId)).toContain("OP17-036");
    expect(engine.getView("south").players.south.characters.filter(Boolean)).toHaveLength(0);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
  test("[On Play] decline path (subject-bound)", () => {
    const now = "OP17-036";
    const engine = OnePieceTestEngine.create({ hand: [now], activeDon: 3 }, {});
    const before = engine.getView("south").players.south;

    engine.playCard(now);
    const gate = engine.getView("south").decisions?.[0] as
      | { extensions?: { resolutionIntent?: string } }
      | undefined;
    const gateIntent = gate?.extensions?.resolutionIntent;
    if (gateIntent === "effectOptional") {
      engine.resolveDecision("effectOptional", { optionId: "no" }, "south");
    } else if (gateIntent) {
      const gateStep = engine.pendingDecision(gateIntent as never, "south").steps[0];
      if (gateStep?.kind === "selectEntity" || gateStep?.kind === "orderItems") {
        engine.resolveDecision(gateIntent as never, { selectedIds: [] }, "south");
      } else if (gateStep?.kind === "chooseOption") {
        engine.resolveDecision(gateIntent as never, { optionId: "0" }, "south");
      }
    }

    expect(engine.getView("south").players.south.trash.map((c) => c.cardId)).toContain(now);
    expect(engine.getView("south").players.south.handCount).toBe(Math.max(before.handCount - 1, 0));
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
