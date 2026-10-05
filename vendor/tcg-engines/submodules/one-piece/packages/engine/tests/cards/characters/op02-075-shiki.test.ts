import { describe, expect, test } from "vite-plus/test";
import { eb01MountainGod018, op02Shiki075 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";
import { SOUTH_ATTACKS_WITHOUT_TURN_SETUP } from "../events/battle-fixture.shared.ts";

describe("OP02-075 Shiki", () => {
  test("returns DON!! for its Life Trigger and plays itself", () => {
    const engine = OnePieceTestEngine.create(
      { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
      { life: [op02Shiki075], activeDon: 1 },
      SOUTH_ATTACKS_WITHOUT_TURN_SETUP,
    );
    const attacker = engine.findCardInZone("south", "character", eb01MountainGod018);
    const donDeckBefore = engine.getView("north").players.north.donDeckCount;

    engine.declareAttack(attacker, engine.leader("north"), "south");
    engine.resolveDecision("lifeTrigger", { optionId: "activate" }, "north");
    // Life Trigger activation is the only opt-out; returnDon is then mandatory.
    // With a single DON!! available the cost pays automatically.

    const view = engine.getView("north");
    expect(view.players.north.characters.some((card) => card?.cardId === op02Shiki075.id)).toBe(
      true,
    );
    expect(view.players.north.donDeckCount).toBe(donDeckBefore + 1);
    expect(view.players.north.trash.some((card) => card.cardId === op02Shiki075.id)).toBe(false);
    expect(view.prompts).toHaveLength(0);
  });

  test("does not offer a second opt-out after Life Trigger activation", () => {
    const engine = OnePieceTestEngine.create(
      { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
      { life: [op02Shiki075], activeDon: 2 },
      SOUTH_ATTACKS_WITHOUT_TURN_SETUP,
    );
    const attacker = engine.findCardInZone("south", "character", eb01MountainGod018);
    const donDeckBefore = engine.getView("north").players.north.donDeckCount;

    engine.declareAttack(attacker, engine.leader("north"), "south");
    engine.resolveDecision("lifeTrigger", { optionId: "activate" }, "north");

    // After lifeTrigger "activate", returnDon is mandatory (engine may auto-pay).
    // There is no effectOptional Skip that would abandon playThisCard.
    expect(() => engine.pendingDecision("effectOptional", "north")).toThrow(
      /Could not find a pending effectOptional/,
    );
    const view = engine.getView("north");
    expect(view.players.north.characters.some((card) => card?.cardId === op02Shiki075.id)).toBe(
      true,
    );
    expect(view.players.north.donDeckCount).toBe(donDeckBefore + 1);
  });

  test("cannot pay or play itself from Life without a DON!! card to return", () => {
    const engine = OnePieceTestEngine.create(
      { character: [{ card: eb01MountainGod018, playedOnTurn: 0 }] },
      { life: [op02Shiki075] },
      SOUTH_ATTACKS_WITHOUT_TURN_SETUP,
    );
    const attacker = engine.findCardInZone("south", "character", eb01MountainGod018);
    const shiki = engine.findCardInZone("north", "life", op02Shiki075);
    const donDeckBefore = engine.getView("north").players.north.donDeckCount;

    engine.declareAttack(attacker, engine.leader("north"), "south");
    // 8-4-1-3 / 8-3-1-3: the [Trigger]'s DON!! −1 cannot be paid in full, so
    // the [Trigger] cannot be activated at all; the only answer left is to add
    // Shiki to hand (10-1-5-2) instead of losing it to the trash.
    const trigger = engine
      .getState()
      .promptQueue.find(
        (p) => p.status === "pending" && p.resolutionContext?.intent === "lifeTrigger",
      );
    expect(trigger?.options.find((option) => option.id === "activate")?.enabled).toBe(false);
    engine.expectFailure({
      type: "resolvePrompt",
      seat: "north",
      promptId: trigger!.id,
      optionId: "activate",
    });
    engine.resolveDecision("lifeTrigger", { optionId: "skip" }, "north");

    const view = engine.getView("north");
    expect(view.players.north.characters.some((card) => card?.instanceId === shiki)).toBe(false);
    expect(view.players.north.hand.map((card) => card.instanceId)).toContain(shiki);
    expect(view.players.north.donDeckCount).toBe(donDeckBefore);
    expect(view.prompts).toHaveLength(0);
  });
});
