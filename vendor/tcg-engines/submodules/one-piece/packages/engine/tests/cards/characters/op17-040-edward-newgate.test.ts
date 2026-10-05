import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01MountainGod018,
  op03PortgasDAce001,
  op13MonkeyDLuffy001,
  op16Ramba016,
  op17EdwardNewgate040,
  op17RocksDXebec039,
  op17RocksDXebec118,
  op17Shiki048,
} from "@tcg/op-cards";

import { OnePieceTestEngine, type FixtureCardEntry } from "../../../src/index.ts";

// OP17-040 Edward.Newgate:
// [On Play] Draw 1 card.
// [Once Per Turn] When your Leader with a type including "Rocks Pirates"
// attacks or is attacked, you may trash 1 card from your hand to activate this
// effect. Your Leader gains +3000 power during this battle.
// OP17 FAQ: the "is attacked" part activates at the same timing as [On Your
// Opponent's Attack] effects, before [Blocker] or Counter.

function defending({
  leader = op17RocksDXebec039,
  hand = [eb01Doma005, op16Ramba016],
  character = [op17EdwardNewgate040],
}: {
  leader?: { id: string };
  hand?: FixtureCardEntry[];
  character?: FixtureCardEntry[];
} = {}) {
  const engine = OnePieceTestEngine.create(
    { leaderCardId: leader, hand, character, deck: 10 },
    {
      deck: 10,
      activeDon: 10,
      character: [{ card: eb01MountainGod018, playedOnTurn: 0 }],
    },
    { firstPlayer: "south", activeSeat: "north" },
  );
  // North's Leader attacks with 2 DON!!: 7000 against the Rocks Leader's 5000.
  engine.attachDon(engine.leader("north"), 2, "north");
  return engine;
}

function attacking({
  leader = op17RocksDXebec039,
  hand = [eb01Doma005, op16Ramba016],
  character = [op17EdwardNewgate040],
  deck = [op17RocksDXebec118, eb01Doma005, eb01Doma005],
}: {
  leader?: { id: string };
  hand?: FixtureCardEntry[];
  character?: FixtureCardEntry[];
  deck?: FixtureCardEntry[];
} = {}) {
  return OnePieceTestEngine.create(
    { leaderCardId: leader, hand, character, deck },
    { deck: 10, hand: [eb01Doma005] },
    { firstPlayer: "north", activeSeat: "south" },
  );
}

function orderOptions(engine: OnePieceTestEngine, seat: "north" | "south") {
  const step = engine.pendingDecision("effectOrderChoice", seat).steps[0];
  if (step?.kind !== "chooseOption") throw new Error("Expected the effect order choice.");
  return step.options;
}

function optionFor(engine: OnePieceTestEngine, seat: "north" | "south", sourceId: string) {
  const option = orderOptions(engine, seat).find((entry) => entry.targetId === sourceId);
  if (!option) throw new Error(`Expected an order option for ${sourceId}.`);
  return option.id;
}

describe("OP17-040 Edward.Newgate — your Rocks Leader is attacked", () => {
  test("trashing 1 card gives the Leader +3000 before the Counter Step, for this battle only", () => {
    const engine = defending();
    const newgateId = engine.asSouth().findOnField(op17EdwardNewgate040);
    const domaId = engine.findCardInZone("south", "hand", eb01Doma005);
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    const optional = engine.pendingDecision("effectOptional", "south");
    expect(optional.source?.id).toBe(newgateId);
    expect(() => engine.pendingDecision("battleCounter", "south")).toThrow();

    engine.asSouth().acceptOptional();
    engine.asSouth().choose("effectCostTrashFromHand", [domaId]);
    expect(engine.getView("south").players.south.leader.power).toBe(8000);
    expect(engine.pendingDecision("battleCounter", "south")).toBeDefined();

    engine.asSouth().chooseCounter();
    // 7000 < 8000: no damage. The +3000 ends with the battle.
    const south = engine.getView("south").players.south;
    expect(south.lifeCount).toBe(lifeBefore);
    expect(south.trash.map((card) => card.instanceId)).toEqual([domaId]);
    expect(south.leader.power).toBe(5000);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("once per turn: after it resolves, a second attack this turn is not offered it", () => {
    const engine = defending();
    const domaId = engine.findCardInZone("south", "hand", eb01Doma005);

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    engine.asSouth().acceptOptional();
    engine.asSouth().choose("effectCostTrashFromHand", [domaId]);
    engine.asSouth().chooseCounter();

    engine.asNorth().attack(eb01MountainGod018, engine.leader("south"));
    expect(() => engine.pendingDecision("effectOptional", "south")).toThrow();
    expect(engine.pendingDecision("battleCounter", "south")).toBeDefined();
    expect(engine.getView("south").players.south.leader.power).toBe(5000);
  });

  test("declining keeps it available for the next attack this turn", () => {
    const engine = defending();
    const ramba = engine.findCardInZone("south", "hand", op16Ramba016);
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    engine.asSouth().declineOptional();
    engine.asSouth().chooseCounter();
    expect(engine.getView("south").players.south.lifeCount).toBe(lifeBefore - 1);

    engine.asNorth().attack(eb01MountainGod018, engine.leader("south"));
    engine.asSouth().acceptOptional();
    // The Life card taken above is now in hand too, so the cost asks which card.
    engine.asSouth().choose("effectCostTrashFromHand", [ramba]);
    expect(engine.getView("south").players.south.leader.power).toBe(8000);
  });

  test("does not activate when a Character is attacked", () => {
    const engine = defending({
      character: [op17EdwardNewgate040, { card: op16Ramba016, rested: true }],
    });
    const rambaId = engine.asSouth().findOnField(op16Ramba016);

    engine.asNorth().attack(engine.leader("north"), rambaId);
    expect(() => engine.pendingDecision("effectOptional", "south")).toThrow();
    expect(engine.pendingDecision("battleCounter", "south")).toBeDefined();
  });

  test("does not activate when the Leader's type does not include Rocks Pirates", () => {
    const engine = defending({ leader: op13MonkeyDLuffy001 });

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    expect(() => engine.pendingDecision("effectOptional", "south")).toThrow();
    expect(engine.getView("south").players.south.leader.power).toBe(5000);
  });

  test("is not offered with no card in hand to trash", () => {
    const engine = defending({ hand: [] });
    const lifeBefore = engine.getView("south").players.south.lifeCount;

    // With an empty hand there is no Counter Step choice either, so the
    // battle runs to damage without any prompt: 7000 against 5000.
    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    expect(engine.getView("south").prompts).toHaveLength(0);
    expect(engine.getView("south").players.south.lifeCount).toBe(lifeBefore - 1);
  });
});

describe("OP17-040 Edward.Newgate — your Rocks Leader attacks", () => {
  test("the turn player chooses the order against the Leader's own [When Attacking]", () => {
    const engine = attacking();
    const newgateId = engine.asSouth().findOnField(op17EdwardNewgate040);
    const leaderId = engine.leader("south");
    const domaId = engine.findCardInZone("south", "hand", eb01Doma005);

    engine.asSouth().attack(leaderId, engine.leader("north"));
    expect(orderOptions(engine, "south").map((option) => option.targetId)).toEqual(
      expect.arrayContaining([leaderId, newgateId]),
    );
    expect(orderOptions(engine, "south")).toHaveLength(2);

    // Newgate first: trash Doma, Leader +3000.
    engine.asSouth().chooseOption("effectOrderChoice", optionFor(engine, "south", newgateId));
    expect(engine.pendingDecision("effectOptional", "south").source?.id).toBe(newgateId);
    engine.asSouth().acceptOptional();
    engine.asSouth().choose("effectCostTrashFromHand", [domaId]);
    expect(engine.getView("south").players.south.leader.power).toBe(8000);

    // Then the Leader: trash the last card, reveal Xebec (Rocks Pirates), draw 2.
    expect(engine.pendingDecision("effectOptional", "south").source?.id).toBe(leaderId);
    engine.asSouth().acceptOptional();
    const south = engine.getView("south").players.south;
    expect(south.hand).toHaveLength(2);
    expect(south.hand.map((card) => card.cardId)).toContain(op17RocksDXebec118.id);
    expect(south.trash).toHaveLength(2);
    expect(engine.pendingDecision("battleCounter", "north")).toBeDefined();
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("resolving the Leader first lets Newgate trash a card the Leader drew", () => {
    const engine = attacking({ hand: [eb01Doma005] });
    const newgateId = engine.asSouth().findOnField(op17EdwardNewgate040);
    const leaderId = engine.leader("south");

    engine.asSouth().attack(leaderId, engine.leader("north"));
    engine.asSouth().chooseOption("effectOrderChoice", optionFor(engine, "south", leaderId));
    engine.asSouth().acceptOptional();
    // The only hand card paid the Leader's cost; the reveal drew 2.
    expect(engine.getView("south").players.south.hand).toHaveLength(2);

    expect(engine.pendingDecision("effectOptional", "south").source?.id).toBe(newgateId);
    engine.asSouth().acceptOptional();
    const drawnXebec = engine.findCardInZone("south", "hand", op17RocksDXebec118);
    engine.asSouth().choose("effectCostTrashFromHand", [drawnXebec]);
    expect(engine.getView("south").players.south.leader.power).toBe(8000);
    expect(engine.getView("south").players.south.hand).toHaveLength(1);
  });

  test("with a single card in hand, resolving Newgate first leaves the Leader's cost unpaid", () => {
    const engine = attacking({ hand: [eb01Doma005] });
    const newgateId = engine.asSouth().findOnField(op17EdwardNewgate040);

    engine.asSouth().attack(engine.leader("south"), engine.leader("north"));
    engine.asSouth().chooseOption("effectOrderChoice", optionFor(engine, "south", newgateId));
    engine.asSouth().acceptOptional();

    expect(engine.getView("south").players.south.leader.power).toBe(8000);
    expect(engine.getView("south").players.south.hand).toHaveLength(0);
    // The Leader's optional cost can no longer be paid, so it is not offered.
    expect(() => engine.pendingDecision("effectOptional", "south")).toThrow();
    expect(engine.pendingDecision("battleCounter", "north")).toBeDefined();
  });

  test("does not activate when a Character attacks", () => {
    const engine = attacking({
      character: [op17EdwardNewgate040, { card: op16Ramba016, playedOnTurn: 0 }],
    });

    engine.asSouth().attack(op16Ramba016, engine.leader("north"));
    expect(() => engine.pendingDecision("effectOrderChoice", "south")).toThrow();
    expect(() => engine.pendingDecision("effectOptional", "south")).toThrow();
    expect(engine.pendingDecision("battleCounter", "north")).toBeDefined();
  });

  test("with a non-Rocks Leader only the Leader's own [When Attacking] activates, unordered", () => {
    const engine = attacking({ leader: op03PortgasDAce001 });

    engine.asSouth().attack(engine.leader("south"), engine.leader("north"));
    expect(() => engine.pendingDecision("effectOrderChoice", "south")).toThrow();
    // Ace's own "When this Leader attacks" (trash Events/Stages) resolves directly.
    expect(engine.pendingDecision("battleCounter", "north")).toBeDefined();
    expect(engine.getView("south").players.south.leader.power).toBe(5000);
  });
});

describe("OP17-040 Edward.Newgate — simultaneous [On Your Opponent's Attack] effects", () => {
  test("the defending player chooses which of their cards' effects activates first", () => {
    const engine = defending({
      hand: [op17RocksDXebec118, eb01Doma005, op16Ramba016],
      character: [op17EdwardNewgate040, op17Shiki048],
    });
    const newgateId = engine.asSouth().findOnField(op17EdwardNewgate040);
    const shikiId = engine.asSouth().findOnField(op17Shiki048);
    const godId = engine.asNorth().findOnField(eb01MountainGod018);

    engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
    expect(
      orderOptions(engine, "south")
        .map((option) => option.targetId)
        .sort((a, b) => (a ?? "").localeCompare(b ?? "")),
    ).toEqual([newgateId, shikiId].sort((a, b) => a.localeCompare(b)));

    // Shiki first: its cost needs a Rocks Pirates card, so Xebec pays it.
    engine.asSouth().chooseOption("effectOrderChoice", optionFor(engine, "south", shikiId));
    expect(engine.pendingDecision("effectOptional", "south").source?.id).toBe(shikiId);
    engine.asSouth().acceptOptional();
    engine.asSouth().chooseTargets(godId);
    // Then Newgate, trashing one of the two cards left.
    expect(engine.pendingDecision("effectOptional", "south").source?.id).toBe(newgateId);
    engine.asSouth().acceptOptional();
    engine
      .asSouth()
      .choose("effectCostTrashFromHand", [engine.findCardInZone("south", "hand", eb01Doma005)]);

    const view = engine.getView("south");
    expect(view.players.south.leader.power).toBe(8000);
    expect(view.players.north.characters.find((card) => card?.instanceId === godId)?.power).toBe(
      4000,
    );
    expect(view.players.south.hand.map((card) => card.cardId)).toEqual([op16Ramba016.id]);
    expect(engine.pendingDecision("battleCounter", "south")).toBeDefined();
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });
});
