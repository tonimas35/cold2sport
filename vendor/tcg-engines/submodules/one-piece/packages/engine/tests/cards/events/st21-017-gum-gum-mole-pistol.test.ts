import { describe, expect, test } from "vite-plus/test";
import {
  eb01Blueno017,
  eb01Fourtricks025,
  eb02Karoo001,
  eb03Ain002,
  st21GumGumMolePistol017,
  st30LuffyAce001,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// [Main] Give up to 1 of your opponent's Characters −5000 power during this
// turn. Then, if you have a Character with 6000 power or more, K.O. up to 1 of
// your opponent's Characters with 2000 power or less.
// [Trigger] Activate this card's [Main] effect.
function setup(own: FixtureCardEntry[]) {
  return OnePieceTestEngine.create(
    {
      leaderCardId: st30LuffyAce001,
      hand: [st21GumGumMolePistol017],
      character: own,
      activeDon: 4,
    },
    {
      character: [
        { card: eb03Ain002, playedOnTurn: 0 },
        { card: eb01Blueno017, playedOnTurn: 0 },
        { card: eb02Karoo001, playedOnTurn: 0 },
      ],
    },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

describe("ST21-017 Gum-Gum Mole Pistol", () => {
  test("gives −5000, then with a 6000-power Character K.O.s a different 2000-or-less Character (ST-21 FAQ)", () => {
    const engine = setup([eb03Ain002]);
    const south = engine.asSouth();
    const ainId = engine.findCardInZone("north", "character", eb03Ain002);
    const bluenoId = engine.findCardInZone("north", "character", eb01Blueno017);
    const karooId = engine.findCardInZone("north", "character", eb02Karoo001);

    south.play(st21GumGumMolePistol017);
    south.chooseTargets(ainId);
    const powerOf = (id: string) =>
      south.view().players.north.characters.find((card) => card?.instanceId === id)?.power;
    expect(powerOf(ainId)).toBe(1000);

    const ko = south.pendingDecision("effectTargetSelection").steps[0];
    if (ko?.kind !== "selectEntity") throw new Error("Expected the K.O. target.");
    const legalIds = ko.candidates
      .filter((candidate) => candidate.legal !== false)
      .map((candidate) => candidate.ref.id);
    // The −5000 is already applied: Ain (1000) qualifies, Karoo (7000) does not.
    expect(legalIds.sort()).toEqual([ainId, bluenoId].sort());
    expect(legalIds).not.toContain(karooId);
    south.chooseTargets(bluenoId);

    const north = south.view().players.north;
    expect(north.trash.map((card) => card.instanceId)).toEqual([bluenoId]);
    expect(powerOf(ainId)).toBe(1000);
    expect(south.view().players.south.trash.map((card) => card.cardId)).toEqual([
      st21GumGumMolePistol017.id,
    ]);
    expect(engine.getState().capabilityHistory).toHaveLength(0);

    south.endTurn();
    expect(powerOf(ainId)).toBe(6000);
  });

  test("the 6000 check reads current power: a 5000 Character with 1 DON!! given counts", () => {
    const engine = setup([{ card: eb01Fourtricks025, attachedDon: 1 }]);
    const south = engine.asSouth();
    const bluenoId = engine.findCardInZone("north", "character", eb01Blueno017);

    south.play(st21GumGumMolePistol017);
    south.chooseNoTargets();
    south.chooseTargets(bluenoId);
    expect(south.view().players.north.trash.map((card) => card.instanceId)).toEqual([bluenoId]);
  });

  test("without a Character with 6000 power or more there is no K.O.", () => {
    const engine = setup([eb01Fourtricks025]);
    const south = engine.asSouth();
    const ainId = engine.findCardInZone("north", "character", eb03Ain002);

    south.play(st21GumGumMolePistol017);
    south.chooseTargets(ainId);
    expect(south.view().prompts).toHaveLength(0);
    expect(south.view().players.north.characters.filter(Boolean)).toHaveLength(3);
  });

  test("[Trigger] activates the [Main] effect for the defending player", () => {
    const engine = OnePieceTestEngine.create(
      {
        character: [
          { card: eb02Karoo001, playedOnTurn: 0 },
          { card: eb01Blueno017, playedOnTurn: 0 },
        ],
      },
      {
        leaderCardId: st30LuffyAce001,
        life: [st21GumGumMolePistol017],
        character: [{ card: eb03Ain002, playedOnTurn: 0 }],
      },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const north = engine.asNorth();
    const karooId = south.findOnField(eb02Karoo001);
    const bluenoId = south.findOnField(eb01Blueno017);

    south.attack(karooId, south.opponentLeader());
    north.activateLifeTrigger();
    north.chooseTargets(karooId);
    expect(
      south.view().players.south.characters.find((card) => card?.instanceId === karooId)?.power,
    ).toBe(2000);
    // North's Ain (6000) meets the condition: K.O. one of south's 2000-power Characters.
    north.chooseTargets(bluenoId);
    expect(south.view().players.south.trash.map((card) => card.instanceId)).toEqual([bluenoId]);
    expect(north.view().players.north.trash.map((card) => card.cardId)).toContain(
      st21GumGumMolePistol017.id,
    );
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});
