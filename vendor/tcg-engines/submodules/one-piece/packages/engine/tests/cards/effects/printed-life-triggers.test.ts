import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01Fourtricks025,
  eb01MountainGod018,
  eb01Yamato007,
  eb04Emet051,
  op01RoronoaZoro001,
  op06AmaNoMurakumoSword056,
  op06Kamakiri102,
  op06Kawamatsu103,
  op08ItSToDieFor076,
  op09Fullalead099,
  op10Sanji005,
  op12JewelryBonney101,
  op13BrilliantPunk059,
  op13Higuma013,
  op14eb04IceTime028,
  op15IFindItEmbarrassingAsAHumanBeing097,
  op15ImpactDial115,
  op16AvaloPizarro102,
  op16BlackHole117,
  op16BlackVortex115,
  op16BoaSandersonia111,
  op16CaptainBuggySOurSavior057,
  op16CatarinaDevon104,
  op16DocQ109,
  op16GumGumTwinJetPistol039,
  op16JesusBurgess107,
  op16Laffitte114,
  op16Mahoroba101,
  op16MarshallDTeach080,
  op16SanjuanWolf106,
  op16VanAugur103,
  op16VascoShot110,
  op16Zehahahahaha116,
  op17CharlotteLinlin099,
  op17MaserSaber117,
  op17WoRoRoRoRoIThinkIVeSoberedUp076,
} from "@tcg/op-cards";

import {
  OnePieceTestEngine,
  type FixtureCardEntry,
  type PlayerFixture,
} from "../../../src/index.ts";

// Cards whose printed [Trigger] had no executable block in the catalog (found
// by `pnpm opbot catalog-check`, category structure:trigger). Before, a card
// with the `trigger` text but no block asked to activate a [Trigger] that did
// nothing and lost the card; a card with neither went to hand as if it had no
// [Trigger]. Each test reveals the card from North's Life with a South attack
// and activates the [Trigger] (10-1-5).

const ATTACKER = eb01MountainGod018; // cost 5, 7000 power

function revealFromLife(
  lifeCard: FixtureCardEntry,
  {
    north = {},
    south = {},
    lifeBelow = 0,
  }: { north?: PlayerFixture; south?: PlayerFixture; lifeBelow?: number } = {},
) {
  const engine = OnePieceTestEngine.create(
    {
      ...south,
      character: [{ card: ATTACKER, playedOnTurn: 0 }, ...(south.character ?? [])],
    },
    {
      ...north,
      life: [lifeCard, ...Array.from({ length: lifeBelow }, () => eb01Doma005)],
    },
    { firstPlayer: "north", activeSeat: "south" },
  );
  const southPlayer = engine.asSouth();
  southPlayer.attack(ATTACKER, southPlayer.opponentLeader());
  return engine;
}

function sorted(values: readonly (string | null | undefined)[]) {
  return [...values].map(String).sort((a, b) => a.localeCompare(b));
}

function southCharacterIds(engine: OnePieceTestEngine) {
  return engine
    .getView("south")
    .players.south.characters.filter((card) => card !== null)
    .map((card) => card!.instanceId);
}

function northCharacterCardIds(engine: OnePieceTestEngine) {
  return engine
    .getView("north")
    .players.north.characters.filter((card) => card !== null)
    .map((card) => card!.cardId);
}

function southPower(engine: OnePieceTestEngine, instanceId: string) {
  return engine
    .getView("south")
    .players.south.characters.find((card) => card?.instanceId === instanceId)?.power;
}

function expectClean(engine: OnePieceTestEngine) {
  expect(engine.getView("north").prompts).toHaveLength(0);
  expect(engine.getState().capabilityHistory).toHaveLength(0);
}

describe("EB04-028 Ice Time [Trigger]", () => {
  test("returns up to 1 Character with a cost of 5 or less to its owner's hand", () => {
    const engine = revealFromLife(op14eb04IceTime028);
    const north = engine.asNorth();
    const attackerId = engine.findCardInZone("south", "character", ATTACKER);

    north.activateLifeTrigger();
    north.chooseTargets(attackerId);

    expect(southCharacterIds(engine)).not.toContain(attackerId);
    expect(engine.getView("south").players.south.hand.map((card) => card.instanceId)).toEqual([
      attackerId,
    ]);
    expectClean(engine);
  });
});

describe("EB04-051 Emet [Trigger]", () => {
  test("gives all opposing Characters -3000, then with 0 Life plays itself", () => {
    const engine = revealFromLife(eb04Emet051, { south: { character: [eb01Fourtricks025] } });
    const north = engine.asNorth();
    const fourtricksId = engine.findCardInZone("south", "character", eb01Fourtricks025);

    north.activateLifeTrigger();

    expect(southPower(engine, fourtricksId)).toBe(2000);
    expect(northCharacterCardIds(engine)).toEqual([eb04Emet051.id]);
    expectClean(engine);
  });

  test("with Life left it does not play itself", () => {
    const engine = revealFromLife(eb04Emet051, { lifeBelow: 1 });
    const north = engine.asNorth();
    const attackerId = engine.findCardInZone("south", "character", ATTACKER);

    north.activateLifeTrigger();

    expect(southPower(engine, attackerId)).toBe(4000);
    expect(northCharacterCardIds(engine)).toEqual([]);
    expect(north.view().players.north.trash.map((card) => card.cardId)).toEqual([eb04Emet051.id]);
  });
});

describe("OP06-056 Ama no Murakumo Sword [Trigger]", () => {
  test("activates its [Main]: bottom-decks a cost-2-or-less and a cost-1-or-less Character", () => {
    const engine = revealFromLife(op06AmaNoMurakumoSword056, {
      south: { character: [eb01Doma005, op13Higuma013] },
    });
    const north = engine.asNorth();
    const domaId = engine.findCardInZone("south", "character", eb01Doma005);
    const higumaId = engine.findCardInZone("south", "character", op13Higuma013);

    north.activateLifeTrigger();
    north.chooseTargets(domaId);
    north.chooseTargets(higumaId);

    expect(southCharacterIds(engine)).toEqual([
      engine.findCardInZone("south", "character", ATTACKER),
    ]);
    const deck = engine.getState().players.south.deck;
    expect(sorted(deck.slice(-2))).toEqual(sorted([domaId, higumaId]));
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});

describe("OP06-102 Kamakiri [Trigger]", () => {
  test("with 2 or less Life cards it plays itself", () => {
    const engine = revealFromLife(op06Kamakiri102, { lifeBelow: 2 });
    engine.asNorth().activateLifeTrigger();
    expect(northCharacterCardIds(engine)).toEqual([op06Kamakiri102.id]);
    expectClean(engine);
  });

  test("with 3 Life cards left it is not played", () => {
    const engine = revealFromLife(op06Kamakiri102, { lifeBelow: 3 });
    engine.asNorth().activateLifeTrigger();
    expect(northCharacterCardIds(engine)).toEqual([]);
    expect(engine.getView("north").players.north.trash.map((card) => card.cardId)).toEqual([
      op06Kamakiri102.id,
    ]);
  });
});

describe("OP06-103 Kawamatsu [Trigger]", () => {
  test("plays itself when the opponent has 3 or less Life cards", () => {
    const engine = revealFromLife(op06Kawamatsu103, { south: { life: 3 } });
    engine.asNorth().activateLifeTrigger();
    expect(northCharacterCardIds(engine)).toEqual([op06Kawamatsu103.id]);
    expectClean(engine);
  });

  test("is not played while the opponent has 4 Life cards", () => {
    const engine = revealFromLife(op06Kawamatsu103, { south: { life: 4 } });
    engine.asNorth().activateLifeTrigger();
    expect(northCharacterCardIds(engine)).toEqual([]);
  });
});

describe("OP08-076 It's to Die For... [Trigger]", () => {
  test("adds up to 1 active DON!! card from the DON!! deck", () => {
    const engine = revealFromLife(op08ItSToDieFor076);
    const north = engine.asNorth();
    const before = north.view().players.north;

    north.activateLifeTrigger();
    if (north.hasPendingChoice()) north.chooseAddDon(1);

    const after = north.view().players.north;
    expect(after.activeDon).toBe(before.activeDon + 1);
    expect(after.donDeckCount).toBe(before.donDeckCount - 1);
    expectClean(engine);
  });
});

describe("OP12-101 Jewelry Bonney [Trigger]", () => {
  test("plays itself when the Leader has the Supernovas type", () => {
    const engine = revealFromLife(op12JewelryBonney101, {
      north: { leaderCardId: op01RoronoaZoro001 },
    });
    engine.asNorth().activateLifeTrigger();
    expect(northCharacterCardIds(engine)).toEqual([op12JewelryBonney101.id]);
    expectClean(engine);
  });

  test("is not played under a Leader without the Supernovas type", () => {
    const engine = revealFromLife(op12JewelryBonney101, {
      north: { leaderCardId: op16MarshallDTeach080 },
    });
    engine.asNorth().activateLifeTrigger();
    expect(northCharacterCardIds(engine)).toEqual([]);
  });
});

describe("OP13-059 Brilliant Punk [Trigger]", () => {
  test("draws 1 card", () => {
    const engine = revealFromLife(op13BrilliantPunk059, { north: { deck: [op13Higuma013] } });
    engine.asNorth().activateLifeTrigger();
    expect(engine.getView("north").players.north.hand.map((card) => card.cardId)).toEqual([
      op13Higuma013.id,
    ]);
    expectClean(engine);
  });
});

describe("OP15-097 I Find It Embarrassing as a Human Being [Trigger]", () => {
  test("activates its [Main]: with 10 trash cards a base-cost-5-or-less Character cannot attack", () => {
    const engine = revealFromLife(op15IFindItEmbarrassingAsAHumanBeing097, {
      north: { trash: 10 },
      south: { character: [eb01Fourtricks025] },
    });
    const north = engine.asNorth();
    const fourtricksId = engine.findCardInZone("south", "character", eb01Fourtricks025);

    north.activateLifeTrigger();
    north.chooseTargets(fourtricksId);

    expect(
      engine.expectFailure({
        type: "declareAttack",
        seat: "south",
        attackerId: fourtricksId,
        targetId: north.leader(),
      }).accepted,
    ).toBe(false);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});

describe("OP15-115 Impact Dial [Trigger]", () => {
  test("K.O.s up to 1 opposing Character with a cost of 4 or less", () => {
    const engine = revealFromLife(op15ImpactDial115, {
      south: { character: [eb01Fourtricks025] },
    });
    const north = engine.asNorth();
    const fourtricksId = engine.findCardInZone("south", "character", eb01Fourtricks025);

    north.activateLifeTrigger();
    const target = north.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the K.O. target.");
    // The 5-cost attacker is not a legal target.
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([fourtricksId]);
    north.chooseTargets(fourtricksId);

    expect(engine.getView("south").players.south.trash.map((card) => card.instanceId)).toEqual([
      fourtricksId,
    ]);
    expectClean(engine);
  });
});

describe("OP16-039 Gum-Gum Twin Jet Pistol [Trigger]", () => {
  test("rests the opponent's Leader", () => {
    const engine = revealFromLife(op16GumGumTwinJetPistol039);
    expect(engine.getView("south").players.south.leader.rested).toBe(false);
    engine.asNorth().activateLifeTrigger();
    expect(engine.getView("south").players.south.leader.rested).toBe(true);
    expectClean(engine);
  });
});

describe.each([
  ["OP16-057 Captain Buggy's Our Savior!!", op16CaptainBuggySOurSavior057],
  ["OP16-116 Zehahahahaha!", op16Zehahahahaha116],
])("%s [Trigger]", (_name, card) => {
  test("draws 2 cards, then trashes 1 card from hand", () => {
    const engine = revealFromLife(card, { north: { deck: [op13Higuma013, eb01Fourtricks025] } });
    const north = engine.asNorth();

    north.activateLifeTrigger();
    const fourtricksId = engine.findCardInZone("north", "hand", eb01Fourtricks025);
    north.trashFromHand(fourtricksId);

    const view = north.view().players.north;
    expect(view.hand.map((entry) => entry.cardId)).toEqual([op13Higuma013.id]);
    expect(sorted(view.trash.map((entry) => entry.cardId))).toEqual(
      sorted([card.id, eb01Fourtricks025.id]),
    );
    expectClean(engine);
  });
});

describe("OP16-101 Mahoroba [Trigger]", () => {
  test("adds up to 1 [Yamato] from the trash to hand", () => {
    const engine = revealFromLife(op16Mahoroba101, {
      north: { trash: [eb01Yamato007, eb01Doma005] },
    });
    const north = engine.asNorth();
    const yamatoId = engine.findCardInZone("north", "trash", eb01Yamato007);

    north.activateLifeTrigger();
    const target = north.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the Yamato choice.");
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([yamatoId]);
    north.chooseTargets(yamatoId);

    expect(north.view().players.north.hand.map((card) => card.instanceId)).toEqual([yamatoId]);
    expectClean(engine);
  });
});

describe("OP16-102 Avalo Pizarro [Trigger]", () => {
  test("activates its [On K.O.]: draws 1, then plays [Fullalead] from the trash", () => {
    const engine = revealFromLife(op16AvaloPizarro102, {
      north: { trash: [op09Fullalead099], deck: [op13Higuma013] },
    });
    const north = engine.asNorth();
    const fullaleadId = engine.findCardInZone("north", "trash", op09Fullalead099);

    north.activateLifeTrigger();
    if (north.hasPendingChoice()) north.choosePlay(fullaleadId);

    const view = north.view().players.north;
    expect(view.stage?.instanceId).toBe(fullaleadId);
    expect(view.hand.map((card) => card.cardId)).toEqual([op13Higuma013.id]);
    expect(view.trash.map((card) => card.cardId)).toEqual([op16AvaloPizarro102.id]);
    expectClean(engine);
  });
});

describe("OP16-103 Van Augur [Trigger]", () => {
  test("activates its [Opponent's Turn] [On K.O.] under a Blackbeard Pirates Leader", () => {
    const engine = revealFromLife(op16VanAugur103, {
      north: { leaderCardId: op16MarshallDTeach080, deck: [op13Higuma013] },
    });
    const north = engine.asNorth();
    const attackerId = engine.findCardInZone("south", "character", ATTACKER);

    north.activateLifeTrigger();
    north.chooseTargets(attackerId);

    expect(southPower(engine, attackerId)).toBe(4000);
    expect(north.view().players.north.hand.map((card) => card.cardId)).toEqual([op13Higuma013.id]);
    expectClean(engine);
  });

  test("does nothing under a Leader without the Blackbeard Pirates type", () => {
    const engine = revealFromLife(op16VanAugur103, { north: { deck: [op13Higuma013] } });
    const north = engine.asNorth();
    const attackerId = engine.findCardInZone("south", "character", ATTACKER);

    north.activateLifeTrigger();

    expect(north.hasPendingChoice()).toBe(false);
    expect(southPower(engine, attackerId)).toBe(7000);
    expect(north.view().players.north.hand).toHaveLength(0);
  });
});

describe("OP16-104 Catarina Devon [Trigger]", () => {
  test("draws 1 and plays a cost-1 Blackbeard Pirates Character from the trash", () => {
    const engine = revealFromLife(op16CatarinaDevon104, {
      north: { trash: [op16DocQ109, eb01Doma005], deck: [op13Higuma013] },
    });
    const north = engine.asNorth();
    const docQId = engine.findCardInZone("north", "trash", op16DocQ109);

    north.activateLifeTrigger();
    const play = north.pendingDecision("effectPlaySelection").steps[0];
    if (play?.kind !== "selectEntity") throw new Error("Expected the play choice.");
    // Doma (cost 1) is not Blackbeard Pirates.
    expect(play.candidates.map((candidate) => candidate.ref.id)).toEqual([docQId]);
    north.choosePlay(docQId);

    const view = north.view().players.north;
    expect(view.characters.map((card) => card?.instanceId)).toContain(docQId);
    expect(view.hand.map((card) => card.cardId)).toEqual([op13Higuma013.id]);
    expect(sorted(view.trash.map((card) => card.cardId))).toEqual(
      sorted([eb01Doma005.id, op16CatarinaDevon104.id]),
    );
    expectClean(engine);
  });
});

describe("OP16-106 Sanjuan.Wolf [Trigger]", () => {
  test("activates its [On K.O.]: draws 1, then a Leader's base power becomes 7000 this turn", () => {
    const engine = revealFromLife(op16SanjuanWolf106, {
      north: { leaderCardId: op16MarshallDTeach080, deck: [op13Higuma013] },
    });
    const north = engine.asNorth();

    north.activateLifeTrigger();
    north.chooseTargets(north.leader());

    expect(north.view().players.north.leader.power).toBe(7000);
    expect(north.view().players.north.hand.map((card) => card.cardId)).toEqual([op13Higuma013.id]);
    expectClean(engine);
  });
});

describe("OP16-107 Jesus Burgess [Trigger]", () => {
  test("trashing 1 card from hand plays it", () => {
    const engine = revealFromLife(op16JesusBurgess107, { north: { hand: [op13Higuma013] } });
    const north = engine.asNorth();
    const higumaId = engine.findCardInZone("north", "hand", op13Higuma013);
    north.chooseCounter();

    north.activateLifeTrigger();
    north.acceptOptional();
    if (north.hasPendingChoice()) north.trashFromHand(higumaId);

    const view = north.view().players.north;
    expect(northCharacterCardIds(engine)).toEqual([op16JesusBurgess107.id]);
    expect(view.trash.map((card) => card.instanceId)).toEqual([higumaId]);
    expectClean(engine);
  });

  test("declining keeps the hand card and does not play it", () => {
    const engine = revealFromLife(op16JesusBurgess107, { north: { hand: [op13Higuma013] } });
    const north = engine.asNorth();
    const higumaId = engine.findCardInZone("north", "hand", op13Higuma013);
    north.chooseCounter();

    north.activateLifeTrigger();
    north.declineOptional();

    expect(northCharacterCardIds(engine)).toEqual([]);
    expect(north.view().players.north.hand.map((card) => card.instanceId)).toEqual([higumaId]);
  });
});

describe("OP16-109 Doc Q [Trigger]", () => {
  test("activates its [On K.O.]: draws 1 and K.O.s up to 2 cost-1-or-less Characters", () => {
    const engine = revealFromLife(op16DocQ109, {
      north: { leaderCardId: op16MarshallDTeach080, deck: [op13Higuma013] },
      south: { character: [eb01Doma005, op13Higuma013] },
    });
    const north = engine.asNorth();
    const domaId = engine.findCardInZone("south", "character", eb01Doma005);
    const higumaId = engine.findCardInZone("south", "character", op13Higuma013);

    north.activateLifeTrigger();
    north.chooseTargets(domaId, higumaId);

    expect(
      sorted(engine.getView("south").players.south.trash.map((card) => card.instanceId)),
    ).toEqual(sorted([domaId, higumaId]));
    expect(north.view().players.north.hand).toHaveLength(1);
    expectClean(engine);
  });
});

describe("OP16-110 Vasco Shot [Trigger]", () => {
  test("activates its [On K.O.]: draws 1 and rests a cost-6-or-less Character", () => {
    const engine = revealFromLife(op16VascoShot110, {
      north: { deck: [op13Higuma013] },
      south: { character: [eb01Fourtricks025] },
    });
    const north = engine.asNorth();
    const fourtricksId = engine.findCardInZone("south", "character", eb01Fourtricks025);

    north.activateLifeTrigger();
    north.chooseTargets(fourtricksId);

    expect(
      engine
        .getView("south")
        .players.south.characters.find((card) => card?.instanceId === fourtricksId)?.rested,
    ).toBe(true);
    expect(north.view().players.north.hand).toHaveLength(1);
    expectClean(engine);
  });
});

describe("OP16-111 Boa Sandersonia [Trigger]", () => {
  test("with 2 or less Life cards it plays itself", () => {
    const engine = revealFromLife(op16BoaSandersonia111, { lifeBelow: 1 });
    engine.asNorth().activateLifeTrigger();
    expect(northCharacterCardIds(engine)).toEqual([op16BoaSandersonia111.id]);
    expectClean(engine);
  });

  test("with 3 Life cards left it is not played", () => {
    const engine = revealFromLife(op16BoaSandersonia111, { lifeBelow: 3 });
    engine.asNorth().activateLifeTrigger();
    expect(northCharacterCardIds(engine)).toEqual([]);
  });
});

describe("OP16-114 Laffitte [Trigger]", () => {
  test("activates its [On K.O.]: K.O.s up to 1 opposing cost-4-or-less Character", () => {
    const engine = revealFromLife(op16Laffitte114, { south: { character: [eb01Fourtricks025] } });
    const north = engine.asNorth();
    const fourtricksId = engine.findCardInZone("south", "character", eb01Fourtricks025);

    north.activateLifeTrigger();
    north.chooseTargets(fourtricksId);

    expect(engine.getView("south").players.south.trash.map((card) => card.instanceId)).toEqual([
      fourtricksId,
    ]);
    expectClean(engine);
  });
});

describe("OP16-115 Black Vortex [Trigger]", () => {
  test("negates the effects of an opposing Character during this turn", () => {
    const engine = revealFromLife(op16BlackVortex115, { south: { character: [op10Sanji005] } });
    const north = engine.asNorth();
    const sanjiId = engine.findCardInZone("south", "character", op10Sanji005);
    // [Your Turn] This Character gains +3000 power.
    expect(southPower(engine, sanjiId)).toBe(6000);

    north.activateLifeTrigger();
    north.chooseTargets(sanjiId);

    expect(southPower(engine, sanjiId)).toBe(3000);
    expectClean(engine);
  });
});

describe("OP16-117 Black Hole [Trigger]", () => {
  test("adds up to 1 Blackbeard Pirates card from the trash to hand", () => {
    const engine = revealFromLife(op16BlackHole117, {
      north: { trash: [op16DocQ109, eb01Doma005] },
    });
    const north = engine.asNorth();
    const docQId = engine.findCardInZone("north", "trash", op16DocQ109);

    north.activateLifeTrigger();
    const target = north.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the trash choice.");
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([docQId]);
    north.chooseTargets(docQId);

    expect(north.view().players.north.hand.map((card) => card.instanceId)).toEqual([docQId]);
    expectClean(engine);
  });
});

describe("OP17-076 Wo Ro Ro Ro Ro... I Think I've Sobered Up [Trigger]", () => {
  // "DON!! -1: Draw 2 cards." has no "you may": activating the [Trigger] pays
  // the cost, and without a DON!! card on the field it cannot be activated
  // (8-3-1-3).
  test("DON!! -1: activating pays it and draws 2 cards", () => {
    const engine = revealFromLife(op17WoRoRoRoRoIThinkIVeSoberedUp076, {
      north: { activeDon: 1, deck: [op13Higuma013, eb01Fourtricks025] },
    });
    const north = engine.asNorth();
    const donDeckBefore = north.view().players.north.donDeckCount;

    north.activateLifeTrigger();

    const view = north.view().players.north;
    expect(view.activeDon).toBe(0);
    expect(view.donDeckCount).toBe(donDeckBefore + 1);
    expect(sorted(view.hand.map((card) => card.cardId))).toEqual(
      sorted([op13Higuma013.id, eb01Fourtricks025.id]),
    );
    expectClean(engine);
  });

  test("without DON!! on the field the [Trigger] cannot be activated; the card goes to hand", () => {
    const engine = revealFromLife(op17WoRoRoRoRoIThinkIVeSoberedUp076, {
      north: { activeDon: 0 },
    });
    const prompt = engine.getState().promptQueue.find((p) => p.status === "pending");
    expect(prompt?.options.find((option) => option.id === "activate")?.enabled).toBe(false);

    const north = engine.asNorth();
    north.declineLifeTrigger();

    const view = north.view().players.north;
    expect(view.hand.map((card) => card.cardId)).toEqual([op17WoRoRoRoRoIThinkIVeSoberedUp076.id]);
    expectClean(engine);
  });
});

describe("OP17-117 Maser Saber", () => {
  function saber(southHand: number) {
    return revealFromLife(op17MaserSaber117, {
      south: { hand: southHand, character: [eb01Fourtricks025] },
    });
  }

  test("[Trigger] the opponent trashes 3 cards from hand to avoid the K.O.", () => {
    const engine = saber(4);
    const north = engine.asNorth();
    const south = engine.asSouth();
    const fourtricksId = engine.findCardInZone("south", "character", eb01Fourtricks025);

    north.activateLifeTrigger();
    // South (North's opponent) chooses: trash 3 (option 0) or let the K.O. happen.
    south.chooseOption("effectActionChoice", "0");
    const handIds = engine.getState().players.south.hand;
    if (south.hasPendingChoice()) south.trashFromHand(...handIds.slice(0, 3));

    expect(south.view().players.south.hand).toHaveLength(1);
    expect(south.view().players.south.trash).toHaveLength(3);
    expect(southCharacterIds(engine)).toContain(fourtricksId);
    expectClean(engine);
  });

  test("[Trigger] if the opponent does not trash, K.O. a cost-6-or-less Character", () => {
    const engine = saber(4);
    const north = engine.asNorth();
    const south = engine.asSouth();
    const fourtricksId = engine.findCardInZone("south", "character", eb01Fourtricks025);

    north.activateLifeTrigger();
    south.chooseOption("effectActionChoice", "1");
    north.chooseTargets(fourtricksId);

    expect(south.view().players.south.hand).toHaveLength(4);
    expect(southCharacterIds(engine)).not.toContain(fourtricksId);
    expectClean(engine);
  });

  test("[Trigger] with fewer than 3 cards in hand the opponent cannot trash 3, so the K.O. happens", () => {
    const engine = saber(2);
    const north = engine.asNorth();
    const south = engine.asSouth();
    const fourtricksId = engine.findCardInZone("south", "character", eb01Fourtricks025);

    north.activateLifeTrigger();
    expect(south.hasPendingChoice()).toBe(false);
    north.chooseTargets(fourtricksId);

    expect(south.view().players.south.hand).toHaveLength(2);
    expect(southCharacterIds(engine)).not.toContain(fourtricksId);
  });

  test("[Counter] can target a [Charlotte Linlin] Leader", () => {
    const engine = OnePieceTestEngine.create(
      { character: [{ card: ATTACKER, playedOnTurn: 0 }] },
      { leaderCardId: op17CharlotteLinlin099, hand: [op17MaserSaber117], activeDon: 1 },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const north = engine.asNorth();
    const leaderId = north.leader();
    const lifeBefore = north.view().players.north.lifeCount;
    expect(north.view().players.north.leader.power).toBe(5000);

    engine.asSouth().attack(ATTACKER, leaderId);
    north.chooseCounter(op17MaserSaber117);
    const target = north.pendingDecision("effectTargetSelection").steps[0];
    if (target?.kind !== "selectEntity") throw new Error("Expected the +3000 target.");
    expect(target.candidates.map((candidate) => candidate.ref.id)).toEqual([leaderId]);
    north.chooseTargets(leaderId);

    // 7000 attacker against an 8000 Leader: no damage.
    expect(north.view().players.north.lifeCount).toBe(lifeBefore);
  });
});
