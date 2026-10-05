/** Test helpers: the deck files from disk and a scripted "first legal option" human. */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { EngineCommand } from "@tcg/op-engine";
import { checkModel, type ValueModel } from "@opbot/core/web";
import valueModel from "@opbot/core/models/value.json";
import { createDeckCatalog, type DeckFiles } from "../src/decks/catalog.ts";
import {
  fromDescriptor,
  promptOptionCommand,
  promptSelectionCommand,
} from "../src/game/commands.ts";
import type { GameView } from "../src/game/protocol.ts";

export const REPO = resolve(import.meta.dir, "../../..");

function readDir(dir: string): Record<string, string> {
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".txt"))
      .map((f) => [join(dir, f), readFileSync(join(dir, f), "utf8")]),
  );
}

export function deckFiles(): DeckFiles {
  return {
    meta: readDir(join(REPO, "decks/meta-op17-postban")),
    test: readDir(join(REPO, "decks/engine-test")),
  };
}

export const catalog = createDeckCatalog(deckFiles());

export const model = valueModel as unknown as ValueModel;
checkModel(model);

/**
 * The simplest human: answers prompts with the first enabled option (or the
 * smallest selection), keeps its hand, and in its main phase takes the first
 * legal move until it has made `movesPerTurn` moves, then ends the turn.
 */
export function firstLegalCommand(view: GameView, movesThisTurn: number, movesPerTurn = 6): EngineCommand {
  const prompt = view.prompt;
  if (prompt) {
    if (prompt.mode === "choice") {
      const option = prompt.options.find((o) => o.enabled) ?? prompt.options[0]!;
      return promptOptionCommand(prompt, option.id);
    }
    if (prompt.mode === "order") return promptSelectionCommand(prompt, prompt.options.map((o) => o.id));
    const picks = prompt.options.filter((o) => o.enabled && !o.skip).slice(0, prompt.min).map((o) => o.id);
    return promptSelectionCommand(prompt, picks);
  }
  const keep = view.legal.find((d) => d.type === "keepHand");
  if (keep) return { type: "keepHand", seat: "south" };
  if (movesThisTurn < movesPerTurn) {
    for (const descriptor of view.legal) {
      if (descriptor.type === "endTurn" || descriptor.type === "concede") continue;
      const outcome = fromDescriptor(descriptor, view.humanActiveDon);
      if (outcome.kind === "command") return outcome.command;
      if (outcome.kind === "choose") {
        const choice = outcome.choice;
        return choice.kind === "attack"
          ? { type: "declareAttack", seat: "south", attackerId: choice.attackerId, targetId: choice.targetIds[0]! }
          : { type: "attachDon", seat: "south", targetId: choice.targetId, amount: 1 };
      }
    }
  }
  return { type: "endTurn", seat: "south" };
}
