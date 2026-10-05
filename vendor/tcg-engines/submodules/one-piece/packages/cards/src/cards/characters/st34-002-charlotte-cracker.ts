// Official text (EN, with errata): https://en.onepiece-cardgame.com/cardlist/?series=569034
import type { CharacterCard } from "@tcg/op-types";
import { st34CharlotteCracker002I18n } from "./st34-002-charlotte-cracker.i18n.ts";

export const st34CharlotteCracker002: CharacterCard = {
  id: "ST34-002",
  canonicalId: "ST34-002",
  slug: "charlotte-cracker/st34-002",
  name: "Charlotte Cracker",
  printings: [
    {
      id: "ST34-002",
      artId: "ST34-002",
      setCode: "ST34",
      collectorNumber: "002",
      rarity: "C",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/ST34-002.jpg",
      label: "Charlotte Cracker (002)",
    },
  ],
  cardType: "character",
  color: ["purple"],
  rarity: "C",
  setId: "ST34",
  cost: 4,
  power: 5000,
  counter: 1000,
  traits: ["Big Mom Pirates"],
  attribute: "slash",
  effect:
    "[On Play] If your Leader has the {Big Mom Pirates} type, add up to 1 DON!! card from your DON!! deck and rest it. Then, K.O. up to 1 of your opponent's Characters with a cost of 2 or less.",
  effects: {
    effects: [
      {
        trigger: "onPlay",
        actions: [
          // The "If" gates only the DON!! add; "Then, K.O." resolves whatever
          // the Leader is (4-10-2, 8-3-3; same convention as OP07-109).
          {
            action: "addDon",
            count: {
              amount: 1,
              upTo: true,
            },
            state: "rested",
            condition: {
              condition: "leaderTrait",
              trait: "Big Mom Pirates",
              match: "includes",
            },
          },
          {
            action: "ko",
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
                  value: 2,
                },
              ],
            },
          },
        ],
      },
    ],
  },
  i18n: st34CharlotteCracker002I18n,
};
