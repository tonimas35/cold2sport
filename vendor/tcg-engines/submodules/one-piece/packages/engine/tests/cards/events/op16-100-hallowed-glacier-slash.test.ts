import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, op16HallowedGlacierSlash100, op16Yamato079 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [Main] You may rest 2 of your DON!! cards: If your opponent's Character has
// been K.O.'d during this turn, set your Leader [Yamato] as active.
// [Counter] Your Leader gains +3000 power during this battle.
//
// The [Main] had no block in the catalog (catalog-check structure:main). The
// engine now records the turn a player's Character was last K.O.'d.
function setup(leader: { id: string } = op16Yamato079) {
  return OnePieceTestEngine.create(
    { leaderCardId: leader, hand: [op16HallowedGlacierSlash100], activeDon: 3 },
    { character: [{ card: eb01Doma005, rested: true }] },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("OP16-100 Hallowed Glacier Slash", () => {
  test("[Main] after K.O.'ing an opposing Character this turn, the [Yamato] Leader becomes active", () => {
    const engine = setup();
    const south = engine.asSouth();
    const domaId = engine.findCardInZone("north", "character", eb01Doma005);

    // 5000 Leader against a rested 3000 Character: K.O. in battle.
    south.attack(south.leader(), domaId);
    expect(south.view().players.north.trash.map((card) => card.instanceId)).toEqual([domaId]);
    expect(south.view().players.south.leader.rested).toBe(true);

    south.play(op16HallowedGlacierSlash100);
    south.acceptOptional();

    expect(south.view().players.south.leader.rested).toBe(false);
    expect(south.view().players.south).toMatchObject({ activeDon: 0, restedDon: 3 });
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Main] without a K.O. this turn the Leader stays rested", () => {
    const engine = setup();
    const south = engine.asSouth();

    south.attack(south.leader(), south.opponentLeader());
    south.play(op16HallowedGlacierSlash100);

    // The engine does not offer a cost whose effect cannot do anything.
    expect(south.hasPendingChoice()).toBe(false);
    expect(south.view().players.south.leader.rested).toBe(true);
    expect(south.view().players.south).toMatchObject({ activeDon: 2, restedDon: 1 });
  });

  test("[Main] a Leader that is not [Yamato] stays rested", () => {
    const engine = setup({ id: "OP13-001" });
    const south = engine.asSouth();
    const domaId = engine.findCardInZone("north", "character", eb01Doma005);

    south.attack(south.leader(), domaId);
    south.play(op16HallowedGlacierSlash100);
    south.acceptOptional();

    expect(south.view().players.south.leader.rested).toBe(true);
  });

  test("[Main] declining keeps the DON!! active", () => {
    const engine = setup();
    const south = engine.asSouth();
    const domaId = engine.findCardInZone("north", "character", eb01Doma005);

    south.attack(south.leader(), domaId);
    south.play(op16HallowedGlacierSlash100);
    south.declineOptional();

    expect(south.view().players.south.leader.rested).toBe(true);
    expect(south.view().players.south).toMatchObject({ activeDon: 2, restedDon: 1 });
  });
});
