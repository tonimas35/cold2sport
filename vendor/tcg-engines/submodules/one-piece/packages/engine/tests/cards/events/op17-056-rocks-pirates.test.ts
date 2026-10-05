import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01Fourtricks025,
  op08Buckin051,
  op17Kyo045,
  op17RocksDXebec039,
  op17RocksPirates056,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [Main] You may rest 5 of your DON!! cards: Return up to 1 Character with a
// cost of 6 or less to the owner's hand.
// [Counter] Up to 1 of your Leader with a type including "Rocks Pirates" or up
// to 1 of your Characters with a type including "Rocks Pirates" gains +2000
// power during this battle.
//
// "A type including" matches part of a type (2-4-3-1), so OP08-051 Buckin
// ({Former Rocks Pirates}) is a legal target and a non-Rocks Character is not.
function setup({ kyoRested = false } = {}) {
  return OnePieceTestEngine.create(
    {
      character: [{ card: eb01Fourtricks025, playedOnTurn: 0 }],
    },
    {
      leaderCardId: op17RocksDXebec039,
      hand: [op17RocksPirates056],
      character: [{ card: op17Kyo045, rested: kyoRested }, op08Buckin051, eb01Doma005],
    },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("OP17-056 Rocks Pirates", () => {
  test("[Counter] costs no DON!! and gives the attacked Rocks Pirates Leader +2000, repelling the attack", () => {
    const engine = setup();
    const south = engine.asSouth();
    const north = engine.asNorth();
    const leaderId = north.leader();
    const eventId = engine.findCardInZone("north", "hand", op17RocksPirates056);
    const lifeBefore = north.view().players.north.lifeCount;
    expect(north.view().players.north.activeDon).toBe(0);

    south.attack(eb01Fourtricks025, leaderId);
    const counter = north.pendingDecision("battleCounter").steps[0];
    if (counter?.kind !== "selectEntity") throw new Error("Expected the Counter step.");
    expect(counter.candidates.map((candidate) => candidate.ref.id)).toContain(eventId);
    north.chooseCounter(op17RocksPirates056);

    const target = north.pendingDecision("effectTargetSelection").steps[0];
    expect(target).toMatchObject({ kind: "selectEntity", min: 0, max: 1 });
    if (target?.kind !== "selectEntity") throw new Error("Expected the +2000 target.");
    expect(target.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [leaderId, north.findOnField(op17Kyo045), north.findOnField(op08Buckin051)].sort(),
    );
    expect(north.view().players.north.leader?.power).toBe(5000);
    north.chooseTargets(leaderId);

    const view = north.view();
    expect(view.players.north.lifeCount).toBe(lifeBefore);
    expect(view.players.north.trash.map((card) => card.instanceId)).toEqual([eventId]);
    expect(view.prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Counter] saves an attacked Rocks Pirates Character, and the +2000 ends with the battle", () => {
    const engine = setup({ kyoRested: true });
    const south = engine.asSouth();
    const north = engine.asNorth();
    const kyoId = north.findOnField(op17Kyo045);
    const powerOf = (instanceId: string) =>
      north.view().players.north.characters.find((card) => card?.instanceId === instanceId)?.power;

    // Kyo 4000 would lose to a 5000 attacker; with +2000 it holds at 6000.
    south.attack(eb01Fourtricks025, kyoId);
    north.chooseCounter(op17RocksPirates056);
    north.chooseTargets(kyoId);

    expect(powerOf(kyoId)).toBe(4000);
    expect(north.view().players.north.trash.map((card) => card.cardId)).toEqual([
      op17RocksPirates056.id,
    ]);
    expect(north.view().prompts).toHaveLength(0);
  });
});
