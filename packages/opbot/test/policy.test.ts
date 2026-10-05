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
import { createHeuristicAgent } from "../src/agents/heuristic.ts";
import { createPolicyAgent, policyCommand } from "../src/agents/policy.ts";
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

  test("when attacking, the attacked Character (Kaido OP17-058 [When Attacking])", () => {
    const state = position(
      { leaderCardId: "OP17-058", hand: [], deck: 20, life: 3, activeDon: 3 },
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
      { leaderCardId: "OP17-058", hand: [], deck: 20, life: 3, activeDon: 2 },
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
