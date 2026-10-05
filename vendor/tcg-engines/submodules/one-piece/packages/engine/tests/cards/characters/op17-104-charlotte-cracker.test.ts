import { describe, expect, test } from "vite-plus/test";
import {
  op08CharlottePudding058,
  op13Higuma013,
  op17CharlotteCracker104,
  op17CharlottePudding109,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// OP17-104 Charlotte Cracker: "[Your Turn] [On Play] You may rest 2 of your
// DON!! cards: If your Leader has the {Big Mom Pirates} type, add up to 1 card
// from the top of your deck to the top of your Life cards.
// [Trigger] Play this card."

// North's Leader attacks South's Leader, whose top Life card is Cracker.
function takeDamageWithCrackerOnTop() {
  const engine = OnePieceTestEngine.create(
    {
      leaderCardId: op08CharlottePudding058,
      life: [op17CharlotteCracker104, op13Higuma013],
      activeDon: 2,
    },
    {},
    { firstPlayer: "south", activeSeat: "north" },
  );
  engine.asNorth().attack(engine.leader("north"), engine.leader("south"));
  return engine;
}

describe("OP17-104 Charlotte Cracker", () => {
  test("[Trigger] plays the card from Life; its [Your Turn] [On Play] does not activate", () => {
    const engine = takeDamageWithCrackerOnTop();
    const south = engine.asSouth();

    expect(south.pendingDecision("lifeTrigger").title).toContain("[Trigger]");
    south.activateLifeTrigger();

    const view = south.view();
    expect(view.players.south.characters.filter(Boolean).map((card) => card?.cardId)).toEqual([
      op17CharlotteCracker104.id,
    ]);
    expect(view.players.south.hand).toHaveLength(0);
    expect(view.players.south.lifeCount).toBe(1);
    // OP17 FAQ: played during the opponent's turn, the [Your Turn] [On Play]
    // cannot activate, so no rest-2-DON!! choice appears.
    expect(view.prompts).toHaveLength(0);
    expect(view.players.south).toMatchObject({ activeDon: 2, restedDon: 0 });
  });

  test("[Trigger] declined, the card goes to the hand", () => {
    const engine = takeDamageWithCrackerOnTop();
    const south = engine.asSouth();

    south.declineLifeTrigger();

    const view = south.view();
    expect(view.players.south.hand.map((card) => card.cardId)).toEqual([
      op17CharlotteCracker104.id,
    ]);
    expect(view.players.south.characters.filter(Boolean)).toHaveLength(0);
    expect(view.prompts).toHaveLength(0);
  });

  test("it is a card with a [Trigger] for OP17-109 Pudding's trash cost", () => {
    // "[On Play] You may trash 1 card with a [Trigger] from your hand: Draw 3
    // cards." Higuma has no [Trigger], so Cracker is the only card that pays.
    const engine = OnePieceTestEngine.create(
      {
        hand: [op17CharlottePudding109, op17CharlotteCracker104, op13Higuma013],
        deck: 5,
        activeDon: 3,
      },
      {},
    );
    const south = engine.asSouth();
    const crackerId = engine.findCardInZone("south", "hand", op17CharlotteCracker104);

    south.play(op17CharlottePudding109);
    expect(south.pendingDecision("effectOptional").title).toContain("Charlotte Pudding");
    south.acceptOptional();

    const view = south.view();
    expect(view.players.south.trash.map((card) => card.instanceId)).toEqual([crackerId]);
    expect(view.players.south.hand.map((card) => card.cardId)).toContain(op13Higuma013.id);
    expect(view.players.south.hand).toHaveLength(4);
    expect(view.prompts).toHaveLength(0);
  });

  test("[On Play] resting 2 DON!! with a Big Mom Pirates Leader adds the top deck card to Life", () => {
    const engine = OnePieceTestEngine.create(
      {
        leaderCardId: op08CharlottePudding058,
        hand: [op17CharlotteCracker104],
        deck: 5,
        life: 2,
        activeDon: 5,
      },
      {},
    );
    const south = engine.asSouth();

    south.play(op17CharlotteCracker104);
    south.acceptOptional();
    south.chooseOption("effectAddToLifeFromDeck", "1");

    const view = south.view();
    expect(view.players.south).toMatchObject({ activeDon: 0, restedDon: 5, lifeCount: 3 });
    expect(view.prompts).toHaveLength(0);
  });
});
