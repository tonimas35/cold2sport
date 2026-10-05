/**
 * The heuristic prompt resolver must not submit a target selection that breaks
 * an upper-bound total ("K.O. your opponent's Characters with a total cost of
 * 4 or less", OP17-119 Loki). The engine lists every opposing Character in
 * that prompt, including ones that break the total on their own, and rejects
 * a selection over the total; before this, the bot picked the strongest
 * candidate regardless and lost the game to an illegal command.
 */
import { describe, expect, test } from "vite-plus/test";
import { eb01Doma005, op15PiratesDockingSix088, op17Loki119 } from "@tcg/op-cards";

import { OnePieceTestEngine } from "../testing/test-engine.ts";
import { heuristicPromptResolver } from "./heuristic-strategy.ts";

function lokiPrompt(northCharacters: (typeof eb01Doma005)[]) {
  const engine = OnePieceTestEngine.create(
    { hand: [op17Loki119], activeDon: op17Loki119.cost },
    { character: northCharacters, activeDon: 3 },
  );
  engine.playCard(op17Loki119, "south");
  const prompt = engine
    .getState()
    .promptQueue.find(
      (candidate) =>
        candidate.status === "pending" &&
        candidate.resolutionContext?.intent === "effectTargetSelection",
    );
  if (!prompt) throw new Error("Expected Loki's K.O. choice.");
  return { engine, prompt };
}

describe("heuristic resolver: upper-bound total constraints", () => {
  test("skips a stronger Character that alone breaks the total cost of 4", () => {
    const { engine, prompt } = lokiPrompt([op15PiratesDockingSix088, eb01Doma005]);
    const dockingSixId = engine.findCardInZone("north", "character", op15PiratesDockingSix088);
    const domaId = engine.findCardInZone("north", "character", eb01Doma005);
    // Docking Six is cost 11 on the field, yet the prompt still offers it.
    expect(prompt.options.map((option) => option.id)).toContain(dockingSixId);

    const command = heuristicPromptResolver(engine.getState(), prompt);

    expect(command).toMatchObject({ type: "resolvePrompt", selectedIds: [domaId] });
    expect(engine.exec(command!).accepted).toBe(true);
    const north = engine.getView("north").players.north;
    expect(north.trash.map((card) => card.instanceId)).toEqual([domaId]);
    expect(north.characters.map((card) => card?.instanceId)).toContain(dockingSixId);
  });

  test("selects nothing when no Character fits the total", () => {
    const { engine, prompt } = lokiPrompt([op15PiratesDockingSix088]);

    const command = heuristicPromptResolver(engine.getState(), prompt);

    expect(command).toMatchObject({ type: "resolvePrompt", selectedIds: [] });
    expect(engine.exec(command!).accepted).toBe(true);
    expect(engine.getView("north").players.north.trash).toEqual([]);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
