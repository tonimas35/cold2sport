import { describe, expect, test } from "vite-plus/test";
import {
  op07CaptainJohn082,
  op08Kaido079,
  op17CaptainJohn044,
  op17Kyo045,
  op17RocksDXebec118,
  op17Shiki048,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../index.ts";

// {Rocks Pirates} is an exact type (2-4-3): OP07-082 Captain John and
// OP08-079 Kaido are {Former Rocks Pirates} and cannot be replayed.
describe("OP17-118 Rocks.D.Xebec", () => {
  test("draws 1 and replays {Rocks Pirates} Characters within a total cost of 9", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [op17RocksDXebec118, op17Kyo045, op17Shiki048, op07CaptainJohn082, op08Kaido079],
        deck: ["OP16-096", "OP16-095"],
        activeDon: op17RocksDXebec118.cost,
      },
      {},
    );
    const kyoId = engine.findCardInZone("south", "hand", op17Kyo045);

    engine.playCard(op17RocksDXebec118, "south");
    // Draw 1 happened as part of the On Play.
    expect(engine.getView("south").players.south.hand.length).toBeGreaterThanOrEqual(2);

    const play = engine.pendingDecision("effectPlaySelection", "south").steps[0];
    if (play?.kind !== "selectEntity") throw new Error("Expected the replay choice.");
    const candidates = play.candidates.map((candidate) => candidate.ref.id);
    expect(candidates).toContain(kyoId);
    expect(candidates).toContain(engine.findCardInZone("south", "hand", op17Shiki048));
    expect(candidates).not.toContain(engine.findCardInZone("south", "hand", op07CaptainJohn082));
    expect(candidates).not.toContain(engine.findCardInZone("south", "hand", op08Kaido079));
    // The replay takes only Kyo (cost 2); Kyo's own [On Play] draws 1 more.
    engine.resolveDecision("effectPlaySelection", { selectedIds: [kyoId] }, "south");

    const view = engine.getView("south").players.south;
    expect(view.characters.map((card) => card?.instanceId)).toContain(kyoId);
    expect(view.hand.map((card) => card.cardId)).toContain(op17Shiki048.id);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });

  test("a pair within the total cost replays both Rocks cards", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [op17RocksDXebec118, op17Kyo045, op17CaptainJohn044],
        deck: ["OP16-096", "OP16-095"],
        activeDon: op17RocksDXebec118.cost,
      },
      {},
    );
    const kyoId = engine.findCardInZone("south", "hand", op17Kyo045);
    const johnId = engine.findCardInZone("south", "hand", op17CaptainJohn044);

    engine.playCard(op17RocksDXebec118, "south");
    const play = engine.pendingDecision("effectPlaySelection", "south").steps[0];
    if (play?.kind !== "selectEntity") throw new Error("Expected the replay choice.");
    // Kyo (2) + Captain John (4) total 6 — well under the cap.
    engine.resolveDecision("effectPlaySelection", { selectedIds: [kyoId, johnId] }, "south");

    const view = engine.getView("south").players.south;
    expect(view.characters.map((card) => card?.instanceId)).toContain(kyoId);
    expect(view.characters.map((card) => card?.instanceId)).toContain(johnId);
    expect(engine.getView("south").prompts).toHaveLength(0);
  });
});
