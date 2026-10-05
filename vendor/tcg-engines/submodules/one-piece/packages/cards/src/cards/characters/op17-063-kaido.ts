import type { CharacterCard } from "@tcg/op-types";
import { op17Kaido063I18n } from "./op17-063-kaido.i18n.ts";

export const op17Kaido063: CharacterCard = {
  id: "OP17-063",
  canonicalId: "OP17-063",
  slug: "kaido/op17-063",
  name: "Kaido",
  printings: [
    {
      id: "OP17-063",
      artId: "OP17-063",
      setCode: "OP17",
      collectorNumber: "063",
      rarity: "SR",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/OP17-063_rHqjXa5.jpg",
      label: "Kaido (063)",
    },
    {
      id: "OP17-063_p1",
      artId: "OP17-063_p1",
      setCode: "OP17",
      collectorNumber: "063",
      rarity: "SR",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/OP17-063_p1_cE0dG6Y.jpg",
      label: "Kaido (063) (Alternate Art)",
    },
  ],
  cardType: "character",
  color: ["purple"],
  rarity: "SR",
  setId: "OP17",
  cost: 10,
  power: 12000,
  traits: ["The Four Emperors", "Animal Kingdom Pirates"],
  attribute: "strike",
  effect:
    "All Character cards in your hand without a Counter have a +1000 Counter.\n[Activate: Main] [Once Per Turn] DON!! -1: If this Character was played on this turn, negate the effect of up to 1 of your opponent's Characters with a cost of 6 or less during this turn, and K.O. it.",
  effects: {
    // "All Character cards in your hand without a Counter have a +1000
    // Counter." Only the highest Counter applies (2-10-4), so with OP16-118
    // Ace an 8000-power card is Counter +2000, not +3000 (OP17 FAQ).
    permanentEffects: [
      {
        actions: [
          {
            action: "modifyCounter",
            target: {
              player: "self",
              zones: ["hand"],
              count: { amount: "all" },
              filters: [
                { filter: "cardCategory", value: "character" },
                { filter: "counter", comparison: "eq", value: 0 },
              ],
            },
            value: 1000,
            duration: "permanent",
          },
        ],
      },
    ],
    effects: [
      {
        trigger: "activateMain",
        costs: [
          {
            cost: "returnDon",
            amount: 1,
          },
        ],
        actions: [
          {
            action: "conditional",
            predicate: {
              condition: "playedThisTurn",
            },
            whenTrue: [
              {
                action: "negateEffects",
                target: {
                  player: "opponent",
                  zones: ["character"],
                  count: {
                    amount: 1,
                    upTo: true,
                  },
                  filters: [
                    {
                      filter: "cost",
                      comparison: "lte",
                      value: 6,
                    },
                  ],
                },
                duration: "thisTurn",
              },
              // "and K.O. it": the Character chosen for the negate, so
              // choosing none K.O.s nothing.
              {
                action: "ko",
                target: {
                  player: "opponent",
                  zones: ["character"],
                  count: {
                    amount: 1,
                  },
                },
                previousActionTargets: true,
              },
            ],
          },
        ],
        optional: true,
        oncePerTurn: true,
      },
    ],
  },
  i18n: op17Kaido063I18n,
};
