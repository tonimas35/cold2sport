/**
 * Our action layer and fast simulator on the engine mechanics added for the
 * Shanks deck audit: alternative ("A or B") activation costs, "rest N of your
 * cards" paid with DON!!, Counter Step selections whose DON!! −X costs must fit
 * the field, and declined activations that are not offered again at once.
 * Every enumerated action must be accepted by the official engine, and the
 * fast simulator must reach the same state.
 */
import { expect, test } from "bun:test";
import { applyCommand, createTestMatchState, type MatchState } from "@tcg/op-engine";
import { enumerateActions, type Action } from "../src/engine/actions.ts";
import { applyInPlace, cloneState, stateFingerprint } from "../src/engine/sim.ts";

/** Applies `action` through both paths and checks they agree; returns the fast state. */
function step(state: MatchState, action: Action): MatchState {
  const reference = applyCommand(JSON.parse(JSON.stringify(state)), action.command);
  if (!reference.accepted) throw new Error(`rejected ${action.key}: ${reference.reason}`);
  const fast = cloneState(state);
  expect(applyInPlace(fast, action.command)).toBe(true);
  expect(stateFingerprint(fast)).toBe(stateFingerprint(reference.state));
  return fast;
}

function allAccepted(state: MatchState, actions: Action[]): void {
  const frozenView = JSON.parse(JSON.stringify(state));
  for (const action of actions) {
    const result = applyCommand(frozenView, action.command);
    expect(result.accepted ? action.key : `${action.key}: ${result.reason}`).toBe(action.key);
  }
}

function find(actions: Action[], key: string): Action {
  const action = actions.find((a) => a.key === key);
  if (!action) throw new Error(`no action ${key} among ${actions.map((a) => a.key).join(" ")}`);
  return action;
}

function shanksState(hand: string[], activeDon: number): MatchState {
  return cloneState(
    createTestMatchState(
      { leaderCardId: "OP17-020", hand, activeDon },
      { character: [{ cardId: "OP13-013", rested: true }] },
      { firstPlayer: "north", activeSeat: "south" },
    ),
  );
}

test("OP17-020 Shanks: the alternative cost is a choice of two legal actions", () => {
  let state = shanksState(["EB01-005"], 5);
  const leader = state.players.south.leaderInstanceId;

  state = step(state, find(enumerateActions(state, "south"), `act:${leader}`));
  state = step(state, find(enumerateActions(state, "south"), "opt:yes"));
  const choice = enumerateActions(state, "south");
  expect(choice.map((a) => a.key)).toEqual(["opt:0", "opt:1"]);
  allAccepted(state, choice);

  // Resting the DON!!: the hand card stays.
  const rested = step(state, find(choice, "opt:1"));
  expect(rested.players.south.hand).toHaveLength(1);
  expect(rested.players.south.activeDon).toBe(4);
  // Trashing the card: every DON!! stays active.
  const trashed = step(state, find(choice, "opt:0"));
  expect(trashed.players.south.hand).toHaveLength(0);
  expect(trashed.players.south.activeDon).toBe(5);
});

test("OP17-020 Shanks: with an empty hand it is activated by resting a DON!!", () => {
  let state = shanksState([], 2);
  const leader = state.players.south.leaderInstanceId;

  state = step(state, find(enumerateActions(state, "south"), `act:${leader}`));
  state = step(state, find(enumerateActions(state, "south"), "opt:yes"));
  // No choice is left: straight to the freeze target.
  const targets = enumerateActions(state, "south");
  expect(targets.every((a) => a.key.startsWith("sel:"))).toBe(true);
  expect(state.players.south.activeDon).toBe(1);
});

test("activate, decline, activate: the repeated activation cannot be declined (no loop)", () => {
  let state = shanksState(["EB01-005"], 5);
  const leader = state.players.south.leaderInstanceId;

  state = step(state, find(enumerateActions(state, "south"), `act:${leader}`));
  expect(enumerateActions(state, "south").map((a) => a.key)).toEqual(["opt:yes", "opt:no"]);
  state = step(state, find(enumerateActions(state, "south"), "opt:no"));
  const main = enumerateActions(state, "south");
  allAccepted(state, main);

  // Declining did not activate it, so it is still legal; but activated again
  // with nothing done in between, it commits to paying.
  const again = step(state, find(main, `act:${leader}`));
  expect(enumerateActions(again, "south").map((a) => a.key)).toEqual(["opt:yes"]);

  // After another action it may be declined again.
  state = step(state, find(main, `don:${leader}:1`));
  state = step(state, find(enumerateActions(state, "south"), `act:${leader}`));
  expect(enumerateActions(state, "south").map((a) => a.key)).toEqual(["opt:yes", "opt:no"]);
});

test("rest 1 of your cards: active DON!! cards are offered, grouped as one choice", () => {
  // OP14-020 Mihawk: "You may rest 1 of your cards: ...".
  let state = cloneState(
    createTestMatchState(
      { leaderCardId: "OP14-020", activeDon: 3, restedDon: 1 },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    ),
  );
  const leader = state.players.south.leaderInstanceId;

  state = step(state, find(enumerateActions(state, "south"), `act:${leader}`));
  state = step(state, find(enumerateActions(state, "south"), "opt:yes"));
  const rest = enumerateActions(state, "south");
  expect(rest.map((a) => a.key).sort()).toEqual([`sel:${leader}`, "sel:active-don"].sort());
  allAccepted(state, rest);
  const afterDon = step(state, find(rest, "sel:active-don"));
  expect(afterDon.cards[leader]!.rested).toBe(false);
});

test("Counter Step: subsets whose DON!! −X costs exceed the field are not enumerated", () => {
  // Two OP01-118 Ulti-Mortar ([Counter] cost 1, DON!! −2) with 3 DON!!: each
  // alone fits, both together need 2 + 4 > 3.
  let state = cloneState(
    createTestMatchState(
      { hand: ["OP01-118", "OP01-118"], activeDon: 3 },
      { character: ["OP16-012"], activeDon: 5 },
      { firstPlayer: "north", activeSeat: "north" },
    ),
  );
  const attacker = state.players.north.characterArea.find((id) => id !== null)!;
  expect(
    applyInPlace(state, {
      type: "declareAttack",
      seat: "north",
      attackerId: attacker,
      targetId: state.players.south.leaderInstanceId,
    }),
  ).toBe(true);
  const counters = enumerateActions(state, "south");
  expect(counters.map((a) => a.key).sort()).toEqual(["counter:", "counter:OP01-118"].sort());
  allAccepted(state, counters);
  state = step(state, find(counters, "counter:OP01-118"));
  expect(state.capabilityHistory).toHaveLength(0);
});
