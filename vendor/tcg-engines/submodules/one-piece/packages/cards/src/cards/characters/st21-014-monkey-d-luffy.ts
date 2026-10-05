// Official text: https://en.onepiece-cardgame.com/cardlist/?series=569021
import type { CharacterCard } from "@tcg/op-types";
import { st21MonkeyDLuffy014I18n } from "./st21-014-monkey-d-luffy.i18n.ts";

export const st21MonkeyDLuffy014: CharacterCard = {
  id: "ST21-014",
  canonicalId: "ST21-014",
  slug: "monkey-d-luffy/st21-014",
  name: "Monkey.D.Luffy",
  printings: [
    {
      id: "ST21-014",
      artId: "ST21-014",
      setCode: "ST21",
      collectorNumber: "014",
      rarity: "SR",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/ST21-014.jpg",
      label: "Monkey.D.Luffy (014)",
    },
  ],
  cardType: "character",
  color: ["red"],
  rarity: "SR",
  setId: "ST21",
  cost: 5,
  power: 6000,
  traits: ["The Four Emperors", "Straw Hat Crew"],
  attribute: "strike",
  effect:
    "[Rush] (This card can attack on the turn in which it is played.)\n[When Attacking] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.",
  effects: {
    keywords: ["rush"],
    effects: [
      {
        trigger: "whenAttacking",
        actions: [
          {
            action: "giveDon",
            target: {
              player: "self",
              zones: ["leader", "character"],
              count: { amount: 1 },
            },
            count: { amount: 1, upTo: true },
            donState: "rested",
          },
        ],
      },
    ],
  },
  i18n: st21MonkeyDLuffy014I18n,
};
