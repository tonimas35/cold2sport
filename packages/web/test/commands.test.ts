/** Commands the page builds from descriptors and prompt answers. */
import { describe, expect, test } from "bun:test";
import {
  boardDescriptors,
  fromDescriptor,
  promptOptionCommand,
  promptSelectionCommand,
  selectionAllowed,
} from "../src/game/commands.ts";
import type { PromptOptionView, PromptView } from "../src/game/protocol.ts";

const option = (id: string, extra: Partial<PromptOptionView> = {}): PromptOptionView => ({
  id,
  label: id,
  enabled: true,
  card: null,
  don: null,
  skip: false,
  ...extra,
});

const prompt = (extra: Partial<PromptView>): PromptView => ({
  id: "prompt-1",
  mode: "select",
  choiceKind: "selectCards",
  intent: "battleBlocker",
  label: "",
  details: "",
  min: 0,
  max: 1,
  options: [],
  source: null,
  ...extra,
});

describe("descriptors", () => {
  test("simple moves become commands", () => {
    expect(fromDescriptor({ type: "endTurn", seat: "south", label: "End turn" }, 3)).toEqual({
      kind: "command",
      command: { type: "endTurn", seat: "south" },
    });
    expect(fromDescriptor({ type: "playCard", seat: "south", label: "Play", sourceId: "card-1", slotChoices: [2, 3] }, 3)).toEqual({
      kind: "command",
      command: { type: "playCard", seat: "south", instanceId: "card-1", slotIndex: 2 },
    });
    // Full board: no slot, the engine asks which Character to replace.
    expect(fromDescriptor({ type: "playCard", seat: "south", label: "Play", sourceId: "card-1", slotChoices: [] }, 3)).toEqual({
      kind: "command",
      command: { type: "playCard", seat: "south", instanceId: "card-1" },
    });
    expect(fromDescriptor({ type: "activateEffect", seat: "south", label: "Activate", sourceId: "card-9" }, 0)).toEqual({
      kind: "command",
      command: { type: "activateEffect", seat: "south", sourceInstanceId: "card-9", trigger: "activateMain" },
    });
  });

  test("attacks with several targets and DON!! with several active DON!! ask first", () => {
    expect(fromDescriptor({ type: "declareAttack", seat: "south", label: "Attack", sourceId: "a", targetIds: ["l"] }, 0)).toEqual({
      kind: "command",
      command: { type: "declareAttack", seat: "south", attackerId: "a", targetId: "l" },
    });
    expect(fromDescriptor({ type: "declareAttack", seat: "south", label: "Attack", sourceId: "a", targetIds: ["l", "c"] }, 0)).toEqual({
      kind: "choose",
      choice: { kind: "attack", attackerId: "a", targetIds: ["l", "c"] },
    });
    expect(fromDescriptor({ type: "attachDon", seat: "south", label: "DON", sourceId: "l" }, 1)).toEqual({
      kind: "command",
      command: { type: "attachDon", seat: "south", targetId: "l", amount: 1 },
    });
    expect(fromDescriptor({ type: "attachDon", seat: "south", label: "DON", sourceId: "l" }, 4)).toEqual({
      kind: "choose",
      choice: { kind: "don", targetId: "l", max: 4 },
    });
  });

  test("prompts are never answered through their descriptor", () => {
    expect(fromDescriptor({ type: "resolvePrompt", seat: "south", label: "x", promptId: "p" }, 0)).toEqual({ kind: "ignore" });
    const legal = [
      { type: "resolvePrompt" as const, seat: "south" as const, label: "x", promptId: "p" },
      { type: "keepHand" as const, seat: "south" as const, label: "Keep" },
    ];
    expect(boardDescriptors(legal).map((d) => d.type)).toEqual(["keepHand"]);
  });
});

describe("prompt answers", () => {
  test("the blocker's skip option is an empty selection", () => {
    const blocker = prompt({ options: [option("skip", { skip: true }), option("card-5")] });
    expect(promptSelectionCommand(blocker, ["skip"])).toEqual({
      type: "resolvePrompt",
      seat: "south",
      promptId: "prompt-1",
      selectedIds: [],
    });
    expect(promptSelectionCommand(blocker, ["card-5"]).type).toBe("resolvePrompt");
    expect(selectionAllowed(blocker, [])).toBe(true);
    expect(selectionAllowed(blocker, ["card-5"])).toBe(true);
  });

  test("selections respect min and max; orderings need every card", () => {
    const cost = prompt({ intent: "effectCostTrashFromHand", min: 1, max: 1, options: [option("a"), option("b")] });
    expect(selectionAllowed(cost, [])).toBe(false);
    expect(selectionAllowed(cost, ["a"])).toBe(true);
    expect(selectionAllowed(cost, ["a", "b"])).toBe(false);
    const order = prompt({ mode: "order", min: 2, max: 2, options: [option("a"), option("b")] });
    expect(selectionAllowed(order, ["b"])).toBe(false);
    expect(selectionAllowed(order, ["b", "a"])).toBe(true);
    expect(promptSelectionCommand(order, ["b", "a"])).toMatchObject({ selectedIds: ["b", "a"] });
  });

  test("pick-one prompts send the option id", () => {
    expect(promptOptionCommand(prompt({ mode: "choice" }), "yes")).toEqual({
      type: "resolvePrompt",
      seat: "south",
      promptId: "prompt-1",
      optionId: "yes",
    });
  });
});
