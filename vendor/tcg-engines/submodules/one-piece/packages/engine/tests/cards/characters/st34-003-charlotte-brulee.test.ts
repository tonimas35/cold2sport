import { describe, expect, test } from "vite-plus/test";
import {
  eb01Doma005,
  eb01Fourtricks025,
  op08CountNiwatori071,
  op11CognacMamaMash081,
  op13Higuma013,
  st34CharlotteBrulee003,
} from "@tcg/op-cards";

import { OnePieceTestEngine } from "../../../src/index.ts";

// [On Play] Look at 3 cards from the top of your deck; reveal up to 1
// {Big Mom Pirates} type card and add it to your hand. Then, place the rest at
// the bottom of your deck in any order.
describe("ST34-003 Charlotte Brulee", () => {
  test("adds the only Big Mom Pirates card of the top 3 to hand and puts the rest at the bottom in the chosen order", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [st34CharlotteBrulee003],
        deck: [op08CountNiwatori071, eb01Doma005, op13Higuma013, eb01Fourtricks025],
        activeDon: 1,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const [niwatoriId, domaId, higumaId, untouchedId] = engine.getState().players.south.deck;

    south.play(st34CharlotteBrulee003);

    const search = south.pendingDecision("effectSearchSelection").steps[0];
    expect(search?.kind).toBe("selectEntity");
    if (search?.kind !== "selectEntity") throw new Error("Expected Brulee's search selection.");
    expect(search).toMatchObject({ min: 0, max: 1 });
    expect(search.candidates.map((candidate) => candidate.ref.id)).toEqual(
      expect.arrayContaining([niwatoriId, domaId, higumaId]),
    );
    expect(
      search.candidates.filter((candidate) => candidate.legal).map((candidate) => candidate.ref.id),
    ).toEqual([niwatoriId]);
    south.chooseSearch(niwatoriId!);

    const remainder = south.pendingDecision("effectSearchRemainderOrder").steps[0];
    expect(remainder?.kind).toBe("orderItems");
    if (remainder?.kind !== "orderItems") throw new Error("Expected Brulee's remainder order.");
    expect(remainder.candidates.map((candidate) => candidate.ref.id).sort()).toEqual(
      [domaId, higumaId].sort(),
    );
    south.orderCards("effectSearchRemainderOrder", [higumaId!, domaId!]);

    const view = south.view();
    expect(view.players.south.hand.map((card) => card.instanceId)).toEqual([niwatoriId]);
    expect(engine.getState().players.south.deck).toEqual([untouchedId, higumaId, domaId]);
    expect(view.prompts).toHaveLength(0);
    expect(engine.getState().capabilityHistory).toHaveLength(0);
  });

  test("can reveal a Big Mom Pirates Event, not only a Character", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [st34CharlotteBrulee003],
        deck: [eb01Doma005, op11CognacMamaMash081, op13Higuma013, eb01Fourtricks025],
        activeDon: 1,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const cognacId = engine.findCardInZone("south", "deck", op11CognacMamaMash081);

    south.play(st34CharlotteBrulee003);

    const search = south.pendingDecision("effectSearchSelection").steps[0];
    if (search?.kind !== "selectEntity") throw new Error("Expected Brulee's search selection.");
    expect(
      search.candidates.filter((candidate) => candidate.legal).map((candidate) => candidate.ref.id),
    ).toEqual([cognacId]);
    south.chooseSearch(cognacId);
    const remainder = south.pendingDecision("effectSearchRemainderOrder").steps[0];
    if (remainder?.kind !== "orderItems") throw new Error("Expected Brulee's remainder order.");
    south.orderCards(
      "effectSearchRemainderOrder",
      remainder.candidates.map((candidate) => candidate.ref.id),
    );

    expect(south.view().players.south.hand.map((card) => card.instanceId)).toEqual([cognacId]);
    expect(south.view().prompts).toHaveLength(0);
  });

  test("with no Big Mom Pirates card in the top 3, reveals nothing and puts all 3 at the bottom", () => {
    const engine = OnePieceTestEngine.create(
      {
        hand: [st34CharlotteBrulee003],
        deck: [eb01Doma005, op13Higuma013, eb01Fourtricks025, op08CountNiwatori071],
        activeDon: 1,
      },
      {},
      { firstPlayer: "north", activeSeat: "south" },
    );
    const south = engine.asSouth();
    const [firstId, secondId, thirdId, fourthId] = engine.getState().players.south.deck;

    south.play(st34CharlotteBrulee003);

    const search = south.pendingDecision("effectSearchSelection").steps[0];
    if (search?.kind !== "selectEntity") throw new Error("Expected Brulee's search selection.");
    expect(search.candidates.filter((candidate) => candidate.legal)).toHaveLength(0);
    south.chooseNoSearch();
    south.orderCards("effectSearchRemainderOrder", [thirdId!, firstId!, secondId!]);

    expect(south.view().players.south.hand).toHaveLength(0);
    expect(engine.getState().players.south.deck).toEqual([fourthId, thirdId, firstId, secondId]);
    expect(south.view().prompts).toHaveLength(0);
  });
});
