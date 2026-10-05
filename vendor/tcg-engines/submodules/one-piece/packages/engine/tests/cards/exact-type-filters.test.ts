import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  eb02FakeStrawHatCrew005,
  eb02Nami017,
  eb04JewelryBonney002,
  getCard,
  op01Nami016,
  op07WeReGoingToClaimTheOnePiece077,
  op08CharlotteOven061,
  op08CharlottePudding058,
  op11CharlotteChiffon105,
  op11CharlotteKatakuri067,
  op11Usopp003,
  op14eb04IHaveAPlanToTakeDownOneOfTheFourEmperors019,
  op15PiratesDockingSix088,
  op17CharlottePerospero110,
  op17CharlottePudding109,
  op17MonkeyDLuffy079,
  op17RoronoaZoro095,
  op17Streusen113,
  st30LuffyAce001,
  st31Sanji001,
  st31ThousandSunny005,
  st34CharlotteBrulee003,
} from "@tcg/op-cards";
import type { OPCard } from "@tcg/op-types";

import { OnePieceTestEngine, type ProjectedDecision } from "../../src/index.ts";

/**
 * 2-4-3: text in { } brackets refers to cards with exactly that type; only a
 * type in " " quotation marks is matched as part of a type (2-4-3-1). The
 * catalog stores one entry per printed type, so these filters are exact:
 * {Straw Hat Crew} does not accept EB02-005 ({Fake Straw Hat Crew}) and
 * {Big Mom Pirates} does not accept OP11-105 Charlotte Chiffon
 * ({Firetank Pirates}/{Former Big Mom Pirates}). Before the types were split
 * the filters matched by substring and accepted both.
 *
 * Every card here is played in the OP-17 tournament meta. The last block
 * checks that every type filter of those cards is exact, including the types
 * (Egghead, Supernovas, Animal Kingdom Pirates, Elbaph...) for which no real
 * card tells the exact and substring readings apart.
 */

const FAKE = eb02FakeStrawHatCrew005;
const CHIFFON = op11CharlotteChiffon105;

function selection(decision: ProjectedDecision) {
  const step = decision.steps[0];
  if (step?.kind !== "selectEntity") throw new Error("Expected a card selection.");
  return {
    legal: (id: string) => step.candidates.find((candidate) => candidate.ref.id === id)?.legal,
    offered: (id: string) =>
      step.candidates.some((candidate) => candidate.ref.id === id && candidate.legal !== false),
  };
}

/** Plays a "look at N, reveal up to 1 {Type}" card and returns its search choice. */
function searchFromPlay(
  played: OPCard,
  deck: OPCard[],
  extra: { leaderCardId?: OPCard; activeDon?: number } = {},
) {
  const engine = OnePieceTestEngine.create(
    {
      leaderCardId: extra.leaderCardId,
      hand: [played],
      deck,
      activeDon: extra.activeDon ?? ("cost" in played ? played.cost : 0),
    },
    {},
    { firstPlayer: "north", activeSeat: "south" },
  );
  engine.playCard(played, "south");
  return { engine, search: selection(engine.pendingDecision("effectSearchSelection", "south")) };
}

describe("exact {Straw Hat Crew} filters do not accept {Fake Straw Hat Crew}", () => {
  const searches: Array<[string, OPCard, OPCard | undefined]> = [
    ["OP01-016 Nami", op01Nami016, undefined],
    ["EB02-017 Nami", eb02Nami017, undefined],
    ["EB04-002 Jewelry Bonney", eb04JewelryBonney002, undefined],
    ["ST31-005 Thousand Sunny", st31ThousandSunny005, st30LuffyAce001],
    [
      "OP14-019 I Have a Plan to Take Down One of the Four Emperors!!",
      op14eb04IHaveAPlanToTakeDownOneOfTheFourEmperors019,
      undefined,
    ],
  ];
  for (const [name, card, leader] of searches) {
    test(`${name}: reveals a Straw Hat Crew card but not Fake Straw Hat Crew`, () => {
      const { engine, search } = searchFromPlay(
        card,
        [FAKE, op11Usopp003, eb01Doma005, eb01Doma005, eb01Doma005, eb01Doma005],
        { leaderCardId: leader },
      );
      expect(search.legal(engine.findCardInZone("south", "deck", FAKE))).toBe(false);
      expect(search.legal(engine.findCardInZone("south", "deck", op11Usopp003))).toBe(true);
    });
  }

  test("ST31-001 Sanji: plays a Straw Hat Crew Character from hand but not Fake Straw Hat Crew", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: st30LuffyAce001,
        hand: [st31Sanji001, FAKE, op11Usopp003],
        deck: [eb01Doma005, eb01Doma005],
        activeDon: st31Sanji001.cost,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const fakeId = engine.findCardInZone("south", "hand", FAKE);
    const usoppId = engine.findCardInZone("south", "hand", op11Usopp003);

    engine.playCard(st31Sanji001, "south");
    const play = selection(engine.pendingDecision("effectPlaySelection", "south"));
    expect(play.offered(usoppId)).toBe(true);
    expect(play.offered(fakeId)).toBe(false);
  });

  test("OP15-088 Pirates Docking Six: replays a Straw Hat Crew Character from trash but not Fake Straw Hat Crew", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op17MonkeyDLuffy079,
        hand: [op15PiratesDockingSix088],
        trash: [FAKE, op17RoronoaZoro095],
        activeDon: 5,
        deck: 10,
      },
      {},
    );
    const fakeId = engine.findCardInZone("south", "trash", FAKE);
    const zoroId = engine.findCardInZone("south", "trash", op17RoronoaZoro095);

    engine.playCard(op15PiratesDockingSix088, "south");
    engine.resolveDecision("effectOptional", { optionId: "yes" }, "south");
    const play = selection(engine.pendingDecision("effectPlaySelection", "south"));
    expect(play.offered(zoroId)).toBe(true);
    expect(play.offered(fakeId)).toBe(false);
  });
});

describe("exact {Big Mom Pirates} filters do not accept {Former Big Mom Pirates}", () => {
  for (const [name, card] of [
    ["OP17-113 Streusen", op17Streusen113],
    ["ST34-003 Charlotte Brulee", st34CharlotteBrulee003],
  ] as const) {
    test(`${name}: reveals a Big Mom Pirates card but not Charlotte Chiffon`, () => {
      const { engine, search } = searchFromPlay(card, [
        CHIFFON,
        op08CharlotteOven061,
        eb01Doma005,
        eb01Doma005,
      ]);
      expect(search.legal(engine.findCardInZone("south", "deck", CHIFFON))).toBe(false);
      expect(search.legal(engine.findCardInZone("south", "deck", op08CharlotteOven061))).toBe(true);
    });
  }

  test("OP07-077 We're Going to Claim the One Piece!!!: reveals a Big Mom Pirates card but not Charlotte Chiffon", () => {
    const { engine, search } = searchFromPlay(
      op07WeReGoingToClaimTheOnePiece077,
      [CHIFFON, op08CharlotteOven061, eb01Doma005, eb01Doma005, eb01Doma005, eb01Doma005],
      { leaderCardId: op08CharlottePudding058 },
    );
    expect(search.legal(engine.findCardInZone("south", "deck", CHIFFON))).toBe(false);
    expect(search.legal(engine.findCardInZone("south", "deck", op08CharlotteOven061))).toBe(true);
  });

  test("OP17-109 Charlotte Pudding [Trigger]: reveals a Big Mom Pirates card but not Charlotte Chiffon", () => {
    const engine = OnePieceTestEngine.create(
      { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
      {
        life: [op17CharlottePudding109],
        deck: [CHIFFON, op08CharlotteOven061, eb01Doma005, eb01Doma005, eb01Doma005],
      },
      { firstPlayer: "north", activeSeat: "south" },
    );
    const attackerId = engine.findCardInZone("south", "character", eb01MountainGod018);
    engine.declareAttack(attackerId, engine.leader("north"), "south");
    engine.resolveDecision("lifeTrigger", { optionId: "activate" }, "north");

    const search = selection(engine.pendingDecision("effectSearchSelection", "north"));
    expect(search.legal(engine.findCardInZone("north", "deck", CHIFFON))).toBe(false);
    expect(search.legal(engine.findCardInZone("north", "deck", op08CharlotteOven061))).toBe(true);
  });

  test("OP17-110 Charlotte Perospero: plays a Big Mom Pirates Character from hand but not Charlotte Chiffon", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [op17CharlottePerospero110, CHIFFON, op08CharlotteOven061],
        activeDon: op17CharlottePerospero110.cost,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const chiffonId = engine.findCardInZone("south", "hand", CHIFFON);
    const ovenId = engine.findCardInZone("south", "hand", op08CharlotteOven061);

    engine.playCard(op17CharlottePerospero110, "south");
    engine.acceptLeadingOptional("south");
    const play = selection(engine.pendingDecision("effectPlaySelection", "south"));
    expect(play.offered(ovenId)).toBe(true);
    expect(play.offered(chiffonId)).toBe(false);
  });

  test("OP11-067 Charlotte Katakuri: [End of Your Turn] sets Big Mom Pirates Characters active but not Charlotte Chiffon", () => {
    const engine = OnePieceTestEngine.create({
      character: [
        { card: op11CharlotteKatakuri067, rested: true },
        { card: CHIFFON, rested: true },
        { card: op08CharlotteOven061, rested: true },
      ],
      donDeckCount: 1,
    });
    const chiffonId = engine.findCardInZone("south", "character", CHIFFON);
    const ovenId = engine.findCardInZone("south", "character", op08CharlotteOven061);

    engine.endTurn("south");
    const target = selection(engine.pendingDecision("effectTargetSelection", "south"));
    expect(target.offered(ovenId)).toBe(true);
    expect(target.offered(chiffonId)).toBe(false);
  });
});

describe("other meta-deck type filters are exact", () => {
  type TraitCheck = { kind: "filter" | "leaderTrait"; value: string; match: string };

  function traitChecks(card: OPCard): TraitCheck[] {
    const checks: TraitCheck[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if (record.filter === "trait") {
        const values = Array.isArray(record.value) ? record.value : [record.value];
        for (const value of values) {
          checks.push({
            kind: "filter",
            value: String(value),
            match: typeof record.match === "string" ? record.match : "exact",
          });
        }
      }
      if (record.condition === "leaderTrait") {
        // leaderTrait without `match` is a substring check (effects/conditions.ts).
        checks.push({
          kind: "leaderTrait",
          value: String(record.trait),
          match: typeof record.match === "string" ? record.match : "includes",
        });
      }
      Object.values(record).forEach(walk);
    };
    walk(card.effects);
    return checks;
  }

  // Every type on these cards is printed as "{Type}" (official card list).
  // Besides the values tested above with real cards, they filter on types
  // (Egghead, Supernovas, Animal Kingdom Pirates) where only a future card
  // could tell the exact and substring readings apart.
  const printedExact: Array<[OPCard, string[]]> = [
    [getCard("ST14-017"), ["Straw Hat Crew"]],
    [op01Nami016, ["Straw Hat Crew"]],
    [eb04JewelryBonney002, ["Egghead", "Straw Hat Crew"]],
    [op14eb04IHaveAPlanToTakeDownOneOfTheFourEmperors019, ["Supernovas", "Straw Hat Crew"]],
    [op07WeReGoingToClaimTheOnePiece077, ["Animal Kingdom Pirates", "Big Mom Pirates"]],
    [op17CharlottePudding109, ["Big Mom Pirates"]],
  ];
  for (const [card, values] of printedExact) {
    test(`${card.id} ${card.name}: every {Type} filter matches the exact type`, () => {
      const checks = traitChecks(card);
      expect(checks.length).toBeGreaterThan(0);
      for (const check of checks) {
        expect(values).toContain(check.value);
        expect(check).toMatchObject({ match: "exact" });
      }
    });
  }

  for (const id of [
    "EB04-030",
    "EB04-031",
    "EB04-032",
    "OP08-062",
    "OP08-077",
    "OP09-078",
    "OP17-027",
    "OP17-061",
    "OP17-069",
    "OP17-073",
    "OP17-080",
    "OP17-081",
    "OP17-086",
    "OP17-089",
    "OP17-094",
    "OP17-096",
    "OP17-103",
    "OP17-104",
    "ST34-002",
  ]) {
    test(`${id}: every type filter and Leader type condition is exact`, () => {
      const checks = traitChecks(getCard(id));
      expect(checks.length).toBeGreaterThan(0);
      for (const check of checks) expect(check).toMatchObject({ match: "exact" });
    });
  }
});
