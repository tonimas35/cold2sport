import { describe, expect, test } from "vite-plus/test";
import { eb03Ain002, st21MonkeyDLuffy014, st30LuffyAce001 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [Rush]
// [When Attacking] Give up to 1 rested DON!! card to your Leader or 1 of your
// Characters.
describe("ST21-014 Monkey.D.Luffy", () => {
  test("attacks the turn it is played and gives 1 rested DON!! to a chosen Character", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: st30LuffyAce001,
        hand: [st21MonkeyDLuffy014],
        character: [eb03Ain002],
        activeDon: 5,
        restedDon: 2,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const ainId = south.findOnField(eb03Ain002);

    south.play(st21MonkeyDLuffy014);
    const luffyId = south.findOnField(st21MonkeyDLuffy014);
    expect(south.view().players.south).toMatchObject({ activeDon: 0, restedDon: 7 });
    south.attack(luffyId, south.opponentLeader());

    const count = south.pendingDecision("effectGiveDonCount").steps[0];
    if (count?.kind !== "chooseOption") throw new Error("Expected the DON!! count choice.");
    expect(count.options.map((option) => option.id)).toEqual(["0", "1"]);
    south.chooseAmount(1);

    const recipient = south.pendingDecision("effectTargetSelection").steps[0];
    if (recipient?.kind !== "selectEntity") throw new Error("Expected the DON!! recipient.");
    expect(recipient.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [south.leader(), ainId, luffyId].sort(),
    );
    south.chooseTargets(ainId);

    const view = south.view().players.south;
    expect(view.characters.find((card) => card?.instanceId === ainId)?.attachedDon).toBe(1);
    expect(view.characters.find((card) => card?.instanceId === ainId)?.power).toBe(7000);
    expect(view.restedDon).toBe(6);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("the DON!! is optional: choosing 0 gives nothing", () => {
    const engine = OnePieceTestEngine.create(
      { hand: [st21MonkeyDLuffy014], activeDon: 5 },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    south.play(st21MonkeyDLuffy014);
    south.attack(st21MonkeyDLuffy014, south.opponentLeader());
    south.chooseAmount(0);

    const view = south.view().players.south;
    expect(view.restedDon).toBe(5);
    expect(view.leader.attachedDon ?? 0).toBe(0);
    expect(view.characters.every((card) => (card?.attachedDon ?? 0) === 0)).toBe(true);
    expect(south.view().prompts.filter((prompt) => prompt.seat === "south")).toHaveLength(0);
  });
});
