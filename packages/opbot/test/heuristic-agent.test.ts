/**
 * The engine's heuristic bot does not handle "up to N DON!!" count prompts
 * (`chooseOption`); its fallback picks options[0] = "0", so OP15-058 Enel's
 * leader effect adds and gives nothing. Our improved policy (agents/policy.ts)
 * takes the maximum. The `heuristic` and `aggressive` agents stay the engine's
 * bots unchanged: they are the "existing bot" baselines of the arena.
 */
import { describe, expect, test } from "bun:test";
import { applyCommand, createTestMatchState, type MatchState } from "@tcg/op-engine";
import { createAggressiveAgent, createHeuristicAgent } from "../src/agents/heuristic.ts";
import { createPolicyAgent } from "../src/agents/policy.ts";
import { pendingPrompt } from "../src/engine/actions.ts";
import { createRng } from "../src/util/rng.ts";
import type { Agent } from "../src/agents/types.ts";

/** South: Enel Leader (6-card DON!! deck), 1 Character, 2 active DON!!, turn 3. */
function enelPosition(): MatchState {
  return createTestMatchState(
    { leaderCardId: "OP15-058", character: ["EB01-005"], activeDon: 2, donDeckCount: 4 },
    {},
    { firstPlayer: "south", activeSeat: "south", turnNumber: 3 },
  );
}

/** Activates Enel's [Activate: Main] and lets `agent` answer every prompt it raises. */
function activateEnelWith(agent: Agent): { state: MatchState; answers: string[] } {
  let state = enelPosition();
  const leaderId = state.players.south.leaderInstanceId;
  const activated = applyCommand(state, {
    type: "activateEffect",
    seat: "south",
    sourceInstanceId: leaderId,
    trigger: "activateMain",
  });
  expect(activated.accepted).toBe(true);
  state = activated.state;
  const answers: string[] = [];
  const rng = createRng("heuristic-agent-test");
  for (let prompt = pendingPrompt(state); prompt; prompt = pendingPrompt(state)) {
    const intent = (prompt.resolutionContext as { intent?: string } | null)?.intent ?? "?";
    const command = agent.decide({ state, seat: "south", rng });
    answers.push(`${intent}=${"optionId" in command ? command.optionId : JSON.stringify(command)}`);
    const result = applyCommand(state, command);
    expect(result.accepted).toBe(true);
    state = result.state;
    expect(answers.length).toBeLessThan(10);
  }
  return { state, answers };
}

describe("'up to N DON!!' count prompts (OP15-058 Enel)", () => {
  for (const [name, create] of [
    ["policy", () => createPolicyAgent()],
    ["policy-honest", () => createPolicyAgent({ honest: true })],
  ] as const) {
    test(`${name}: Enel's leader effect adds and gives every DON!! it can`, () => {
      const { state, answers } = activateEnelWith(create());
      // 1 active + 3 rested (the whole DON!! deck), then the 3 rested ones given.
      expect(answers).toEqual(["effectAddDon=1", "effectAddDon=3", "effectGiveDonCount=3"]);
      const south = state.players.south;
      expect(south.donDeckCount).toBe(0);
      expect(south.activeDon).toBe(3);
      expect(south.restedDon).toBe(0);
      const character = south.characterArea.find(Boolean)!;
      expect(state.cards[character]!.attachedDon).toBe(3);
    });
  }

  for (const [name, create] of [
    ["heuristic", createHeuristicAgent],
    ["aggressive", createAggressiveAgent],
  ] as const) {
    test(`${name} stays the engine's bot: it answers 0 (baseline unchanged)`, () => {
      const { state, answers } = activateEnelWith(create());
      expect(answers[0]).toBe("effectAddDon=0");
      expect(state.players.south.donDeckCount).toBeGreaterThan(0);
    });
  }
});
