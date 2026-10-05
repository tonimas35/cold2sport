import { describe, expect, test } from "vite-plus/test";
import {
  eb01ArmyWolves032,
  op02Blugori084,
  op02Minokoala086,
  op02Minotaur087,
  op02Sphinx088,
  op16LetSGoToTheNavyHeadquarters038,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// [Main] You may rest 6 of your DON!! cards: If you have 5 {Impel Down} type
// Characters with different card names, set your Leader and all of your
// Characters as active.
// [Counter] Your Leader gains +3000 power during this battle.
//
// The [Main] had no block in the catalog (catalog-check structure:main).
const FIVE_NAMES = [
  eb01ArmyWolves032,
  op02Blugori084,
  op02Sphinx088,
  op02Minokoala086,
  op02Minotaur087,
];

function setup(characters: { id: string }[]) {
  const engine = OnePieceTestEngine.create(
    {
      hand: [op16LetSGoToTheNavyHeadquarters038],
      character: characters.map((card): FixtureCardEntry => ({ card, rested: true })),
      activeDon: 7,
    },
    {},
    { firstPlayer: "north", activeSeat: "south" },
  );
  // The Leader attacks first so that it is rested too.
  const south = engine.asSouth();
  south.attack(south.leader(), south.opponentLeader());
  return engine;
}

function restedStates(engine: OnePieceTestEngine) {
  const south = engine.getView("south").players.south;
  return {
    leader: south.leader.rested,
    characters: south.characters.filter(Boolean).map((card) => card!.rested),
  };
}

describe("OP16-038 Let's Go!! To the Navy Headquarters!!", () => {
  test("[Main] with 5 differently named Impel Down Characters sets the Leader and all Characters active", () => {
    const engine = setup(FIVE_NAMES);
    const south = engine.asSouth();
    expect(restedStates(engine)).toEqual({
      leader: true,
      characters: [true, true, true, true, true],
    });

    south.play(op16LetSGoToTheNavyHeadquarters038);
    south.acceptOptional();

    expect(restedStates(engine)).toEqual({
      leader: false,
      characters: [false, false, false, false, false],
    });
    expect(south.view().players.south).toMatchObject({ activeDon: 0, restedDon: 7 });
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("[Main] two Characters with the same name do not count twice: nothing is set active", () => {
    const engine = setup([...FIVE_NAMES.slice(0, 4), op02Blugori084]);
    const south = engine.asSouth();

    south.play(op16LetSGoToTheNavyHeadquarters038);

    // The engine does not offer a cost whose effect cannot do anything.
    expect(south.hasPendingChoice()).toBe(false);
    expect(restedStates(engine)).toEqual({
      leader: true,
      characters: [true, true, true, true, true],
    });
    expect(south.view().players.south).toMatchObject({ activeDon: 6, restedDon: 1 });
  });

  test("[Main] declining the cost keeps the DON!! and the board", () => {
    const engine = setup(FIVE_NAMES);
    const south = engine.asSouth();

    south.play(op16LetSGoToTheNavyHeadquarters038);
    south.declineOptional();

    expect(restedStates(engine).leader).toBe(true);
    expect(south.view().players.south).toMatchObject({ activeDon: 6, restedDon: 1 });
  });
});
