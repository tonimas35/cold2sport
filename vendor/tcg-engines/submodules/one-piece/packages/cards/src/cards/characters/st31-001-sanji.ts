// Official text: https://en.onepiece-cardgame.com/cardlist/?series=569031
import type { CharacterCard } from "@tcg/op-types";
import { st31Sanji001I18n } from "./st31-001-sanji.i18n.ts";

export const st31Sanji001: CharacterCard = {
  id: "ST31-001",
  canonicalId: "ST31-001",
  slug: "sanji/st31-001",
  name: "Sanji",
  printings: [
    {
      id: "ST31-001",
      artId: "ST31-001",
      setCode: "ST31",
      collectorNumber: "001",
      rarity: "SR",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/ST31-001.jpg",
      label: "Sanji (001)",
    },
  ],
  cardType: "character",
  color: ["red"],
  rarity: "SR",
  setId: "ST31",
  cost: 5,
  power: 3000,
  counter: 1000,
  traits: ["Straw Hat Crew"],
  attribute: "strike",
  effect:
    "[DON!! x2] This Character gains [Rush].\n(This card can attack on the turn in which it is played.)\n[On Play] Draw 1 card and play up to 1 {Straw Hat Crew} type Character card with a cost of 5 or less other than [Sanji] from your hand.",
  effects: {
    permanentEffects: [
      {
        conditions: [{ condition: "donAttached", amount: 2 }],
        actions: [
          {
            action: "grantKeyword",
            target: {
              player: "self",
              zones: ["character"],
              count: { amount: 1 },
              self: true,
            },
            keyword: "rush",
            duration: "permanent",
          },
        ],
      },
    ],
    effects: [
      {
        trigger: "onPlay",
        // The draw resolves first, so the card just drawn may be the one played.
        actions: [
          { action: "draw", player: "self", amount: 1 },
          {
            action: "play",
            source: { player: "self", zone: "hand" },
            count: { amount: 1, upTo: true },
            filters: [
              { filter: "cardCategory", value: "character" },
              { filter: "trait", value: "Straw Hat Crew", match: "includes" },
              { filter: "cost", comparison: "lte", value: 5 },
              { filter: "excludeName", value: "Sanji" },
            ],
          },
        ],
      },
    ],
  },
  i18n: st31Sanji001I18n,
};
