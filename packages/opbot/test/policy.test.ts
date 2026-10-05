/**
 * The improved fast policy (src/agents/policy.ts): one small constructed
 * position per override, each checked against the unmodified engine heuristic
 * (which must get it wrong, otherwise the test proves nothing), plus a
 * soundness run: the policy and rollouts built on it never send a command the
 * engine rejects in meta-deck games.
 */
import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  createMatch,
  createTestMatchState,
  type EngineCommand,
  type MatchSeat,
  type MatchState,
  type PlayerFixture,
} from "@tcg/op-engine";
import { createAgent } from "../src/agents/factory.ts";
import { createHeuristicAgent } from "../src/agents/heuristic.ts";
import { createIsmctsAgent } from "../src/agents/ismcts.ts";
import { createPolicyAgent, policyCommand } from "../src/agents/policy.ts";
import { createSearchAgent } from "../src/agents/search.ts";
import { matchConfig } from "../src/arena/game.ts";
import { loadDeckPool } from "../src/decks/pool.ts";
import { actingSeat, pendingJudgePrompt, pendingPrompt } from "../src/engine/actions.ts";
import { determinize } from "../src/engine/determinize.ts";
import { applyInPlace, cloneState } from "../src/engine/sim.ts";
import { HANDCRAFTED_MODEL } from "../src/eval/value.ts";
import { rollout } from "../src/search/rollout.ts";
import { createRng } from "../src/util/rng.ts";

const heuristic = createHeuristicAgent();

/** A mid-game position (turn 7) with `active` to move in its main phase. */
function position(south: PlayerFixture, north: PlayerFixture, active: MatchSeat = "south"): MatchState {
  return cloneState(createTestMatchState(south, north, { activeSeat: active, firstPlayer: active, turnNumber: 7 }));
}

function instanceOf(state: MatchState, seat: MatchSeat, cardId: string, zone = "hand"): string {
  const id = Object.keys(state.cards).find(
    (k) => state.cards[k]!.cardId === cardId && state.cards[k]!.controller === seat && state.cards[k]!.zone === zone,
  );
  if (!id) throw new Error(`${cardId} not found in ${seat}'s ${zone}`);
  return id;
}

function apply(state: MatchState, command: EngineCommand): void {
  if (!applyInPlace(state, command)) throw new Error(`rejected: ${JSON.stringify(command)}`);
}

function intent(state: MatchState): string | undefined {
  return pendingPrompt(state)?.resolutionContext?.intent;
}

function policy(state: MatchState, seat?: MatchSeat): EngineCommand {
  return policyCommand(state, seat ?? actingSeat(state)!, createRng("policy-test"), { model: HANDCRAFTED_MODEL });
}

function engineBot(state: MatchState, seat?: MatchSeat): EngineCommand {
  return heuristic.decide({ state, seat: seat ?? actingSeat(state)!, rng: createRng("policy-test") });
}

/** The policy without its DON!! rules (`policy:tempo=0`): the behaviour before them. */
function policyWithoutTempo(state: MatchState, seat?: MatchSeat): EngineCommand {
  return policyCommand(state, seat ?? actingSeat(state)!, createRng("policy-test"), { model: HANDCRAFTED_MODEL, tempo: false });
}

/** Answers prompts with the policy until one with `wanted` intent is pending. */
function advanceTo(state: MatchState, wanted: string): void {
  for (let i = 0; i < 20; i++) {
    const judge = pendingJudgePrompt(state);
    if (judge) {
      apply(state, { type: "judgeResolvePrompt", seat: "judge", promptId: judge.id, note: "test" });
      continue;
    }
    if (intent(state) === wanted) return;
    if (!pendingPrompt(state)) break;
    apply(state, policy(state));
  }
  throw new Error(`no ${wanted} prompt (pending: ${intent(state) ?? "none"})`);
}

function optionOf(command: EngineCommand): string | undefined {
  return command.type === "resolvePrompt" ? command.optionId : undefined;
}

function selectionOf(command: EngineCommand): string[] {
  return command.type === "resolvePrompt" ? [...(command.selectedIds ?? [])] : [];
}

/** North's Leader (2 DON!! given, 7000) attacks south's Leader; south has no hand, so damage follows. */
function attackSouthLeader(state: MatchState): void {
  const leader = state.players.north.leaderInstanceId;
  state.cards[leader]!.attachedDon = 2;
  apply(state, { type: "declareAttack", seat: "north", attackerId: leader, targetId: state.players.south.leaderInstanceId });
}

describe("up to N amounts", () => {
  test("adds the DON!! it paid for (Basil Hawkins OP17-073 [On Play])", () => {
    const state = position(
      { leaderCardId: "OP17-058", hand: ["OP17-073", "OP17-075"], deck: 20, life: 4, activeDon: 3, donDeckCount: 5 },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4 },
    );
    apply(state, { type: "playCard", seat: "south", instanceId: instanceOf(state, "south", "OP17-073") });
    advanceTo(state, "effectAddDon");
    expect(optionOf(engineBot(state))).toBe("0");
    expect(optionOf(policy(state))).toBe("1");
  });

  test("adds the Life card, but never empties the deck (Borsalino EB04-058)", () => {
    for (const [deck, expected] of [
      [20, "1"],
      [1, "0"],
    ] as const) {
      const state = position(
        { leaderCardId: "OP09-062", hand: ["EB04-058"], deck, life: 2, activeDon: 5 },
        { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4 },
      );
      apply(state, { type: "playCard", seat: "south", instanceId: instanceOf(state, "south", "EB04-058") });
      advanceTo(state, "effectAddToLifeFromDeck");
      expect(optionOf(engineBot(state))).toBe("0");
      expect(optionOf(policy(state))).toBe(expected);
    }
  });
});

describe("negative power", () => {
  test("−3000 on up to 2: the card it lets us attack first, then the strongest (Sweet 3 Generals OP17-114)", () => {
    const state = position(
      // 8 DON!!: 6 to play it and 2 for its cost, so only the 5000 Leader can attack afterwards.
      { leaderCardId: "OP08-058", hand: ["OP17-114"], deck: 20, life: 3, activeDon: 8 },
      {
        leaderCardId: "OP17-079",
        hand: 3,
        deck: 20,
        life: 4,
        character: [
          { cardId: "OP17-095", rested: true }, // 2000: already beaten by 5000
          "OP17-093", // 8000, active: cannot be attacked
          { cardId: "OP17-089", rested: true }, // 6000 rested: 3000 after the cut, our Leader beats it
        ],
      },
    );
    const [zoro, luffy, saul] = state.players.north.characterArea as string[];
    apply(state, { type: "playCard", seat: "south", instanceId: instanceOf(state, "south", "OP17-114") });
    advanceTo(state, "effectTargetSelection");
    expect(selectionOf(engineBot(state))).toEqual([]);
    expect(selectionOf(policy(state))).toEqual([saul!, luffy!]);
    expect(zoro).toBeDefined();
  });

  // Kaido has 9 DON!! in these two: with fewer, rule C (DON!! as a resource)
  // keeps the DON!! for next turn and the cost is not paid at all.
  test("when attacking, the attacked Character (Kaido OP17-058 [When Attacking])", () => {
    const state = position(
      { leaderCardId: "OP17-058", hand: [], deck: 20, life: 3, activeDon: 9, donDeckCount: 1 },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 3, character: [{ cardId: "OP17-095", rested: true }, "OP17-093"] },
    );
    const [zoro] = state.players.north.characterArea as string[];
    apply(state, { type: "declareAttack", seat: "south", attackerId: state.players.south.leaderInstanceId, targetId: zoro! });
    advanceTo(state, "effectTargetSelection");
    expect(selectionOf(engineBot(state))).toEqual([]);
    expect(selectionOf(policy(state))).toEqual([zoro!]);
  });

  test("when defending, the attacker (Kaido OP17-058 [On Your Opponent's Attack])", () => {
    const state = position(
      { leaderCardId: "OP17-058", hand: [], deck: 20, life: 3, activeDon: 9, donDeckCount: 1 },
      {
        leaderCardId: "OP17-079",
        hand: 3,
        deck: 20,
        life: 3,
        character: ["OP17-093", { cardId: "OP17-089", rested: true }],
        activeDon: 4,
      },
      "north",
    );
    const [luffy, saul] = state.players.north.characterArea as string[];
    apply(state, { type: "declareAttack", seat: "north", attackerId: luffy!, targetId: state.players.south.leaderInstanceId });
    advanceTo(state, "effectTargetSelection");
    expect(selectionOf(engineBot(state))).toEqual([]);
    expect(selectionOf(policy(state))[0]).toBe(luffy!);
    expect(saul).toBeDefined();
  });
});

describe("removal and recursion", () => {
  test("K.O. up to 2 takes 2 (Conquest of the Sea OP08-077)", () => {
    const state = position(
      { leaderCardId: "OP08-058", hand: ["OP08-077"], deck: 20, life: 3, activeDon: 8 },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, character: ["OP17-095", "OP17-087", "OP17-082"] },
    );
    apply(state, { type: "playCard", seat: "south", instanceId: instanceOf(state, "south", "OP08-077") });
    advanceTo(state, "effectTargetSelection");
    expect(selectionOf(engineBot(state)).length).toBe(1);
    expect(selectionOf(policy(state)).length).toBe(2);
  });

  test("Return up to 1 Character (either side) returns the opponent's (Rocks Pirates OP17-056)", () => {
    const state = position(
      { leaderCardId: "OP17-039", hand: ["OP17-056"], deck: 20, life: 3, activeDon: 6, character: ["OP17-045"] },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, character: ["OP17-095"] },
    );
    const [zoro] = state.players.north.characterArea as string[];
    apply(state, { type: "playCard", seat: "south", instanceId: instanceOf(state, "south", "OP17-056") });
    advanceTo(state, "effectTargetSelection");
    expect(selectionOf(engineBot(state))).toEqual([]);
    expect(selectionOf(policy(state))).toEqual([zoro!]);
  });

  test("[Trigger] adds the best card from our trash (OP17-096)", () => {
    const state = position(
      {
        leaderCardId: "OP17-079",
        hand: [],
        deck: 20,
        life: ["OP17-096", "OP17-095"],
        trash: ["OP17-095", "OP17-093", "OP17-087"],
      },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, activeDon: 4 },
      "north",
    );
    attackSouthLeader(state);
    advanceTo(state, "effectTargetSelection");
    expect(selectionOf(engineBot(state))).toEqual([]);
    expect(selectionOf(policy(state))).toEqual([instanceOf(state, "south", "OP17-093", "trash")]);
  });
});

describe("life triggers", () => {
  test("[Trigger] Play this card. is activated whatever the cost (Smoothie OP17-106, cost 5)", () => {
    const state = position(
      { leaderCardId: "OP08-058", hand: [], deck: 20, life: ["OP17-106", "OP17-107"] },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, activeDon: 4 },
      "north",
    );
    attackSouthLeader(state);
    advanceTo(state, "lifeTrigger");
    expect(optionOf(engineBot(state, "south"))).toBe("skip");
    const command = policy(state, "south");
    expect(optionOf(command)).toBe("activate");
    apply(state, command);
    expect(state.cards[instanceOf(state, "south", "OP17-106", "character")]).toBeDefined();
  });

  test("a [Trigger] whose condition fails goes to hand (Baby 5 OP12-112 with a one-color Leader)", () => {
    const state = position(
      { leaderCardId: "OP17-079", hand: [], deck: 20, life: ["OP12-112", "OP17-095"] },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, activeDon: 4 },
      "north",
    );
    attackSouthLeader(state);
    advanceTo(state, "lifeTrigger");
    expect(optionOf(engineBot(state, "south"))).toBe("activate");
    expect(optionOf(policy(state, "south"))).toBe("skip");
  });
});

describe("effects that would do nothing", () => {
  test("an Event whose [Main] cost cannot be paid is not played (Rocks Pirates OP17-056 with 3 DON!!)", () => {
    const fixture = (activeDon: number): MatchState =>
      position(
        { leaderCardId: "OP17-039", hand: ["OP17-056"], deck: 20, life: 3, activeDon },
        { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, character: ["OP17-095"] },
      );
    const poor = fixture(3);
    const event = instanceOf(poor, "south", "OP17-056");
    expect(engineBot(poor)).toMatchObject({ type: "playCard", instanceId: event });
    expect(policy(poor)).not.toMatchObject({ type: "playCard" });
    // With 5+ DON!! the same play is useful and the policy keeps it.
    const rich = fixture(6);
    expect(policy(rich)).toMatchObject({ type: "playCard", instanceId: instanceOf(rich, "south", "OP17-056") });
  });

  test("an Event whose effect needs DON!! given is not played without it (Divine Departure OP13-076)", () => {
    const fixture = (leaderDon: number): MatchState => {
      const state = position(
        { leaderCardId: "OP15-058", hand: ["OP13-076"], deck: 20, life: 3, activeDon: 6 },
        { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, character: ["OP17-093"] },
      );
      state.cards[state.players.south.leaderInstanceId]!.attachedDon = leaderDon;
      return state;
    };
    const none = fixture(0);
    expect(engineBot(none)).toMatchObject({ type: "playCard", instanceId: instanceOf(none, "south", "OP13-076") });
    expect(policy(none)).not.toMatchObject({ type: "playCard" });
    const given = fixture(1);
    expect(policy(given)).toMatchObject({ type: "playCard", instanceId: instanceOf(given, "south", "OP13-076") });
  });

  test("an [Activate: Main] with no target is not used (Ace & Sabo & Luffy OP13-007)", () => {
    const state = position(
      { leaderCardId: "OP13-004", hand: [], deck: 20, life: 3, activeDon: 3, character: ["OP13-007"] },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4 },
    );
    expect(engineBot(state)).toMatchObject({ type: "activateEffect" });
    expect(policy(state)).not.toMatchObject({ type: "activateEffect" });
  });

  test("an optional cost is declined when the effect has no target (Kaido OP17-058 with no opposing Character)", () => {
    const state = position(
      { leaderCardId: "OP17-058", hand: [], deck: 20, life: 3, activeDon: 3 },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 3 },
    );
    apply(state, {
      type: "declareAttack",
      seat: "south",
      attackerId: state.players.south.leaderInstanceId,
      targetId: state.players.north.leaderInstanceId,
    });
    advanceTo(state, "effectOptional");
    expect(optionOf(engineBot(state))).toBe("yes");
    expect(optionOf(policy(state))).toBe("no");
  });

  test("an optional cost is declined when the DON!! deck is empty (Pudding OP08-058)", () => {
    const fixture = (donDeckCount: number): MatchState => {
      const state = position(
        { leaderCardId: "OP08-058", hand: [], deck: 20, life: 4, activeDon: 3, donDeckCount },
        { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 3 },
      );
      apply(state, {
        type: "declareAttack",
        seat: "south",
        attackerId: state.players.south.leaderInstanceId,
        targetId: state.players.north.leaderInstanceId,
      });
      advanceTo(state, "effectOptional");
      return state;
    };
    const empty = fixture(0);
    expect(optionOf(engineBot(empty))).toBe("yes");
    expect(optionOf(policy(empty))).toBe("no");
    expect(optionOf(policy(fixture(3)))).toBe("yes");
  });
});

describe("choose one (lookahead)", () => {
  /** South plays Linlin OP17-112: draw 1, then choose +1 own Life or the opponent's top Life to their hand. */
  function linlin(southLife: number, northLife: number): MatchState {
    const state = position(
      { leaderCardId: "OP08-058", hand: ["OP17-112"], deck: 20, life: southLife, activeDon: 10 },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: northLife },
    );
    apply(state, { type: "playCard", seat: "south", instanceId: instanceOf(state, "south", "OP17-112") });
    advanceTo(state, "effectActionChoice");
    return state;
  }

  test("takes the opponent's last Life card", () => {
    const state = linlin(2, 1);
    expect(optionOf(engineBot(state))).toBe("0");
    expect(optionOf(policy(state))).toBe("1");
  });

  test("adds to its own Life when that is worth more", () => {
    expect(optionOf(policy(linlin(1, 5)))).toBe("0");
  });

  test("is deterministic and leaves the state untouched", () => {
    const state = linlin(2, 1);
    const before = JSON.stringify(state);
    const a = policyCommand(state, "south", createRng("x"), { model: HANDCRAFTED_MODEL });
    const b = policyCommand(state, "south", createRng("x"), { model: HANDCRAFTED_MODEL });
    expect(a).toEqual(b);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("DON!! as a resource (tempo)", () => {
  const playEvent = (state: MatchState, cardId: string) =>
    apply(state, { type: "playCard", seat: "south", instanceId: instanceOf(state, "south", cardId) });
  const activateLeader = (state: MatchState) =>
    apply(state, {
      type: "activateEffect",
      seat: "south",
      sourceInstanceId: state.players.south.leaderInstanceId,
      trigger: "activateMain",
    });

  // A. Return order
  test("A: pays DON!! −X with rested DON!! before active ones (X.Drake OP17-075 [On Play] DON!! −2)", () => {
    const state = position(
      // 10 DON!! and an empty DON!! deck: the DON!! −2 costs nothing next turn (rule C).
      { leaderCardId: "OP17-058", hand: ["OP17-075"], deck: 20, life: 4, activeDon: 4, restedDon: 6, donDeckCount: 0 },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4 },
    );
    playEvent(state, "OP17-075");
    advanceTo(state, "effectCostReturnDon");
    expect(selectionOf(engineBot(state))).toEqual(["active-don:0", "active-don:1"]);
    expect(selectionOf(policyWithoutTempo(state))).toEqual(["active-don:0", "active-don:1"]);
    const command = policy(state);
    expect(selectionOf(command)).toEqual(["rested-don:0", "rested-don:1"]);
    apply(state, command);
    // The 2 DON!! left active after paying for X.Drake can still go to an attacker.
    expect(state.players.south.activeDon).toBe(2);
  });

  test("A: then DON!! on a card that already attacked, then on one still to attack, active DON!! last (Mamaragan OP15-078)", () => {
    const state = position(
      {
        leaderCardId: "OP15-058",
        hand: ["OP15-078"],
        deck: 20,
        life: 4,
        activeDon: 2,
        donDeckCount: 2,
        character: [{ cardId: "OP15-061", rested: true, attachedDon: 1 }],
      },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4 },
    );
    const leader = state.players.south.leaderInstanceId;
    const [ohm] = state.players.south.characterArea as string[];
    state.cards[leader]!.attachedDon = 1;
    playEvent(state, "OP15-078");
    advanceTo(state, "effectCostReturnDon");
    expect(selectionOf(engineBot(state))).toEqual(["active-don:0", "active-don:1"]);
    expect(selectionOf(policy(state))).toEqual([`attached-don:${ohm}:0`, `attached-don:${leader}:0`]);
  });

  // B. Giving DON!!
  test("B: the Enel Leader's 4 DON!! go to a Character that can still attack, not to the one just played (OP15-058)", () => {
    const state = position(
      {
        leaderCardId: "OP15-058",
        hand: [],
        deck: 20,
        life: 4,
        activeDon: 1,
        donDeckCount: 5,
        character: ["OP15-061", { cardId: "OP15-118", playedOnTurn: 7 }],
      },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4 },
    );
    const [ohm, enel] = state.players.south.characterArea as string[];
    activateLeader(state);
    advanceTo(state, "effectGiveDonCount");
    // "Up to 4": still the useful maximum (override 1).
    expect(optionOf(engineBot(state))).toBe("0");
    expect(optionOf(policy(state))).toBe("4");
    advanceTo(state, "effectTargetSelection");
    expect(selectionOf(engineBot(state))).toEqual([enel!]);
    expect(selectionOf(policyWithoutTempo(state))).toEqual([enel!]);
    expect(selectionOf(policy(state))).toEqual([ohm!]);
  });

  test("B: to the Double Attack attacker that needs them to reach the Leader, not to the strongest (Holly OP15-071)", () => {
    const state = position(
      {
        leaderCardId: "OP15-058",
        hand: [],
        deck: 20,
        life: 4,
        activeDon: 1,
        donDeckCount: 5,
        // Holly (played this turn) gives Ohm [Double Attack]; Law (5000) reaches the Leader alone.
        character: ["OP15-061", "ST10-010", { cardId: "OP15-071", playedOnTurn: 7 }],
      },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4 },
    );
    const [ohm, law] = state.players.south.characterArea as string[];
    activateLeader(state);
    advanceTo(state, "effectTargetSelection");
    expect(selectionOf(engineBot(state))).toEqual([law!]);
    expect(selectionOf(policy(state))).toEqual([ohm!]);
  });

  // C. Tempo
  /** South's Kaido Leader attacks north's Leader; north has a Character to give −2000. */
  function kaidoAttacks(activeDon: number, donDeckCount: number, character: PlayerFixture["character"] = []): MatchState {
    const state = position(
      { leaderCardId: "OP17-058", hand: [], deck: 20, life: 3, activeDon, donDeckCount, character },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 3, character: [{ cardId: "OP17-095", rested: true }] },
    );
    apply(state, {
      type: "declareAttack",
      seat: "south",
      attackerId: state.players.south.leaderInstanceId,
      targetId: state.players.north.leaderInstanceId,
    });
    advanceTo(state, "effectOptional");
    return state;
  }

  test("C: Kaido keeps its DON!! for next turn instead of paying DON!! −1 for −2000 (OP17-058 [When Attacking])", () => {
    const early = kaidoAttacks(5, 5);
    expect(optionOf(engineBot(early))).toBe("yes");
    expect(optionOf(policyWithoutTempo(early))).toBe("yes");
    expect(optionOf(policy(early))).toBe("no");
    // At 9 DON!! the next DON!! phase refills it (10 at most): free.
    expect(optionOf(policy(kaidoAttacks(9, 1)))).toBe("yes");
  });

  test("C: unless a Kaido OP17-062 in play gives the DON!! back this turn", () => {
    expect(optionOf(policy(kaidoAttacks(5, 5, ["OP17-062"])))).toBe("yes");
  });

  test("C (i): on defence the DON!! −1 is paid when −2000 makes the attack fail (OP17-058 [On Your Opponent's Attack])", () => {
    const defend = (attackerCardId: string): MatchState => {
      const state = position(
        { leaderCardId: "OP17-058", hand: [], deck: 20, life: 3, activeDon: 5, donDeckCount: 5 },
        // Jaguar.D.Saul 6000, Monkey.D.Luffy 8000 against Kaido's 5000.
        { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 3, character: ["OP17-089", "OP17-093"], activeDon: 4 },
        "north",
      );
      apply(state, {
        type: "declareAttack",
        seat: "north",
        attackerId: instanceOf(state, "north", attackerCardId, "character"),
        targetId: state.players.south.leaderInstanceId,
      });
      advanceTo(state, "effectOptional");
      return state;
    };
    expect(optionOf(policy(defend("OP17-089")))).toBe("yes"); // 4000 < 5000: no damage
    const luffy = defend("OP17-093"); // 6000 still hits: keep the DON!!
    expect(optionOf(engineBot(luffy, "south"))).toBe("yes");
    expect(optionOf(policy(luffy, "south"))).toBe("no");
  });

  test("C (ii): Charlotte Linlin ST34-004's DON!! −4 adds a Life card at 2 Life, not at 4", () => {
    const linlin = (life: number): MatchState => {
      const state = position(
        { leaderCardId: "OP17-058", hand: ["ST34-004", "OP17-074"], deck: 20, life, activeDon: 10, donDeckCount: 0 },
        { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, character: ["OP17-093"] },
      );
      playEvent(state, "ST34-004");
      advanceTo(state, "effectOptional");
      return state;
    };
    const healthy = linlin(4);
    expect(optionOf(engineBot(healthy))).toBe("yes");
    expect(optionOf(policy(healthy))).toBe("no"); // 8 DON!! next turn instead of 10
    expect(optionOf(policy(linlin(2)))).toBe("yes");
  });

  test("C: a DON!! −X Event waits until it costs nothing next turn (Mamaragan OP15-078 in the Kaido deck)", () => {
    const fixture = (activeDon: number, donDeckCount: number): MatchState =>
      position(
        { leaderCardId: "OP17-058", hand: ["OP15-078"], deck: 20, life: 4, activeDon, donDeckCount },
        { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, character: ["OP17-095"] },
      );
    const six = fixture(6, 4);
    const mamaragan = instanceOf(six, "south", "OP15-078");
    expect(engineBot(six)).toMatchObject({ type: "playCard", instanceId: mamaragan });
    expect(policyWithoutTempo(six)).toMatchObject({ type: "playCard", instanceId: mamaragan });
    expect(policy(six)).not.toMatchObject({ type: "playCard" });
    const ten = fixture(10, 0);
    expect(policy(ten)).toMatchObject({ type: "playCard", instanceId: instanceOf(ten, "south", "OP15-078") });
  });

  // D. Sequencing
  test("D (1): a DON!! −X Event that would take DON!! from a card still to attack waits for the attack (El Thor OP15-075)", () => {
    const state = position(
      // Ohm holds the only 3 DON!! on the field: 5000, enough for the Leader.
      {
        leaderCardId: "OP15-058",
        hand: ["OP15-075"],
        deck: 20,
        life: 4,
        donDeckCount: 3,
        character: [{ cardId: "OP15-061", attachedDon: 3 }],
      },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, character: [{ cardId: "OP17-095", rested: true }] },
    );
    const [ohm] = state.players.south.characterArea as string[];
    const elThor = instanceOf(state, "south", "OP15-075");
    // Before: El Thor now, its DON!! −1 paid by Ohm, which drops to 4000.
    const before = cloneState(state);
    const old = policyWithoutTempo(before);
    expect(old).toMatchObject({ type: "playCard", instanceId: elThor });
    apply(before, old);
    expect(before.cards[ohm!]!.attachedDon).toBe(2);
    // Now: attack first; once Ohm has attacked, its DON!! pay for El Thor.
    expect(policy(state)).not.toMatchObject({ type: "playCard" });
    state.cards[ohm!]!.rested = true;
    expect(policy(state)).toMatchObject({ type: "playCard", instanceId: elThor });
  });

  test("D (2): DON!! −X Events go before the Enel Leader's refill, which gives them back, and not after it (Mamaragan OP15-078)", () => {
    const fixture = (refillUsed: boolean): MatchState => {
      const state = position(
        { leaderCardId: "OP15-058", hand: ["OP15-078"], deck: 20, life: 4, activeDon: 3, donDeckCount: 3 },
        { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4, character: ["OP17-095"] },
      );
      if (refillUsed) state.cards[state.players.south.leaderInstanceId]!.usedEffectKeys.push("activateMain:0");
      return state;
    };
    const before = fixture(false);
    // The refill adds up to 5 DON!! from the DON!! deck: the 2 returned come straight back.
    expect(policy(before)).toMatchObject({ type: "playCard", instanceId: instanceOf(before, "south", "OP15-078") });
    const after = fixture(true);
    const mamaragan = instanceOf(after, "south", "OP15-078");
    expect(policyWithoutTempo(after)).toMatchObject({ type: "playCard", instanceId: mamaragan });
    // After it, 3 DON!! instead of 5 next turn.
    expect(policy(after)).not.toMatchObject({ type: "playCard" });
  });
});

describe("search: 'up to N' counts follow the policy, not rollout noise", () => {
  /** Basil Hawkins OP17-073 [On Play]: "add up to 1 DON!! card as active". */
  function hawkins(): MatchState {
    const state = position(
      { leaderCardId: "OP17-058", hand: ["OP17-073", "OP17-075"], deck: 20, life: 4, activeDon: 3, donDeckCount: 5 },
      { leaderCardId: "OP17-079", hand: 3, deck: 20, life: 4 },
    );
    apply(state, { type: "playCard", seat: "south", instanceId: instanceOf(state, "south", "OP17-073") });
    advanceTo(state, "effectAddDon");
    return state;
  }

  test("flat search: the policy's maximum, without simulations; rollout=policy0 left it to the rollouts", () => {
    const search = createSearchAgent({ simulations: 32, horizonTurns: 1, maxCandidates: 12, model: HANDCRAFTED_MODEL });
    expect(optionOf(search.decide({ state: hawkins(), seat: "south", rng: createRng("e") }))).toBe("1");
    expect(search.lastReport()!.iterations).toBe(0);
    const old = createSearchAgent({ simulations: 32, horizonTurns: 1, maxCandidates: 12, model: HANDCRAFTED_MODEL, rolloutPolicy: "policy0" });
    old.decide({ state: hawkins(), seat: "south", rng: createRng("e") });
    expect(old.lastReport()!.iterations).toBeGreaterThan(0);
    expect(old.lastReport()!.actions.map((a) => a.key).sort()).toEqual(["opt:0", "opt:1"]);
  });

  test("ISMCTS: the same answer, and inside the tree the count has a single branch", () => {
    const ismcts = createIsmctsAgent({ iterations: 16, horizonTurns: 1, model: HANDCRAFTED_MODEL });
    expect(optionOf(ismcts.decide({ state: hawkins(), seat: "south", rng: createRng("e") }))).toBe("1");
    expect(ismcts.lastResult()).toBeUndefined();
  });

  test("agent specs: policy:tempo=0 and rollout=policy0", () => {
    expect(createAgent("policy:tempo=0").id).toBe("policy:tempo=0");
    expect(createAgent("policy-honest:tempo=0").honest).toBe(true);
    expect(() => createAgent("policy:tempo=2")).toThrow();
    expect(() => createAgent("search:sims=8,rollout=policy0")).not.toThrow();
    expect(() => createAgent("search:sims=8,rollout=nope")).toThrow();
  });
});

const GAMES = Number(process.env.POLICY_GAMES ?? 12);

test(`policy and its rollouts never send a rejected command (${GAMES} meta-deck games)`, () => {
  const decks = loadDeckPool(resolve(import.meta.dir, "../../../decks/meta-op17-postban"));
  const agents = { policy: createPolicyAgent({ model: HANDCRAFTED_MODEL }), honest: createPolicyAgent({ model: HANDCRAFTED_MODEL, honest: true }) };
  let decisions = 0;
  let rejected = 0;
  let rollouts = 0;
  let broken = 0;
  let finished = 0;
  for (let g = 0; g < GAMES; g++) {
    const spec = {
      seed: `policy-${g}`,
      decks: { south: decks[g % decks.length]!, north: decks[(3 * g + 1) % decks.length]! },
      firstSeat: (g % 2 === 0 ? "south" : "north") as MatchSeat,
    };
    const rng = createRng(spec.seed);
    const state = cloneState(createMatch(matchConfig(spec)));
    for (const c of [
      { type: "chooseJoKenPo", seat: "south", choice: "rock" },
      { type: "chooseJoKenPo", seat: "north", choice: "scissors" },
      { type: "chooseFirstPlayer", seat: "south", firstPlayer: spec.firstSeat },
      { type: "keepHand", seat: "south" },
      { type: "keepHand", seat: "north" },
      { type: "startGame", seat: spec.firstSeat },
    ] as const) {
      apply(state, c);
    }
    for (let step = 0; step < 1500 && state.status !== "finished"; step++) {
      const judge = pendingJudgePrompt(state);
      if (judge) {
        apply(state, { type: "judgeResolvePrompt", seat: "judge", promptId: judge.id, note: "test" });
        continue;
      }
      const seat = actingSeat(state)!;
      if (step % 5 === 0) {
        const world = determinize(state, seat, rng);
        const r = rollout(world, seat, state.turnNumber, { horizonTurns: 2, maxSteps: 300, model: HANDCRAFTED_MODEL }, rng);
        rollouts++;
        if (r.broken) broken++;
      }
      const agent = seat === "south" ? agents.policy : agents.honest;
      const command = agent.decide({ state, seat, rng });
      decisions++;
      if (!applyInPlace(state, command)) {
        rejected++;
        break; // the state may be corrupted: stop this game
      }
    }
    if (state.status === "finished") finished++;
  }
  expect(rejected).toBe(0);
  expect(broken).toBe(0);
  expect(rollouts).toBeGreaterThan(GAMES * 20);
  expect(finished).toBe(GAMES);
  expect(decisions).toBeGreaterThan(GAMES * 50);
}, 600_000);
