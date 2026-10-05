import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  op03ThunderBolt121,
  op13Higuma013,
  op17Gloriosa046,
  op17Marco015,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// If one of your Characters would be removed from the field by your opponent's
// effect, you may K.O. this Character instead.
// [On K.O.] You may trash 1 card with a type including "Whitebeard Pirates"
// from your hand: Play this Character card from your trash.
//
// The replacement had no block in the catalog (catalog-check
// structure:replacement). OP17 FAQ: Marco covers himself too, and when he and
// another Character are K.O.'d at the same time, only Marco is K.O.'d.
function setup({
  hand = [] as FixtureCardEntry[],
  northHand = [op17Gloriosa046] as FixtureCardEntry[],
} = {}) {
  return OnePieceTestEngine.create(
    { hand, character: [op17Marco015, op13Higuma013] },
    { hand: northHand, activeDon: 10 },
    { firstPlayer: "south", activeSeat: "north" },
  );
}

function southCharacterIds(engine: OnePieceTestEngine) {
  return engine
    .getView("south")
    .players.south.characters.filter((card) => card !== null)
    .map((card) => card!.instanceId);
}

describe("OP17-015 Marco", () => {
  test("an opposing bottom-deck effect on another Character is replaced by K.O.'ing Marco", () => {
    const engine = setup();
    const south = engine.asSouth();
    const north = engine.asNorth();
    const marcoId = south.findOnField(op17Marco015);
    const higumaId = south.findOnField(op13Higuma013);

    north.play(op17Gloriosa046);
    north.chooseTargets(higumaId);
    south.chooseOption("effectRemovalReplacement", "yes");

    expect(southCharacterIds(engine)).toEqual([higumaId]);
    expect(south.view().players.south.trash.map((card) => card.instanceId)).toEqual([marcoId]);
    expect(engine.getState().players.south.deck).not.toContain(higumaId);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("an opposing K.O. effect is replaced too, and Marco's [On K.O.] can bring him back", () => {
    const engine = setup({ hand: [eb01Doma005], northHand: [op03ThunderBolt121] });
    const south = engine.asSouth();
    const north = engine.asNorth();
    const marcoId = south.findOnField(op17Marco015);
    const higumaId = south.findOnField(op13Higuma013);
    const domaId = engine.findCardInZone("south", "hand", eb01Doma005);

    north.play(op03ThunderBolt121);
    north.acceptOptional();
    north.chooseTargets(higumaId);
    south.chooseOption("effectKoReplacement", "yes");
    // Marco was K.O.'d: his [On K.O.] trashes a Whitebeard Pirates card
    // (Doma's type includes it) to play him again from the trash.
    south.acceptOptional();

    expect(new Set(southCharacterIds(engine))).toEqual(new Set([higumaId, marcoId]));
    expect(south.view().players.south.trash.map((card) => card.instanceId)).toEqual([domaId]);
  });

  test("declining lets the removal happen", () => {
    const engine = setup();
    const south = engine.asSouth();
    const north = engine.asNorth();
    const marcoId = south.findOnField(op17Marco015);
    const higumaId = south.findOnField(op13Higuma013);

    north.play(op17Gloriosa046);
    north.chooseTargets(higumaId);
    south.chooseOption("effectRemovalReplacement", "no");

    expect(southCharacterIds(engine)).toEqual([marcoId]);
    expect(engine.getState().players.south.deck.at(-1)).toBe(higumaId);
  });

  test("a K.O. in battle is not an opponent's effect, so it is not replaced", () => {
    const engine = OnePieceTestEngine.create(
      { character: [op17Marco015, { card: op13Higuma013, rested: true }] },
      { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
      { firstPlayer: "south", activeSeat: "north" },
    );
    const south = engine.asSouth();
    const north = engine.asNorth();
    const marcoId = south.findOnField(op17Marco015);
    const higumaId = south.findOnField(op13Higuma013);

    north.attack(eb01MountainGod018, higumaId);

    expect(south.hasPendingChoice()).toBe(false);
    expect(southCharacterIds(engine)).toEqual([marcoId]);
  });
});
