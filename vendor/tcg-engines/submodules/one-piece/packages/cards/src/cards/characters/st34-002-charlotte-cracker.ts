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
          // "If A, B. Then, C.": a "Then" clause after an "if" clause that is
          // not resolved cannot be resolved either (4-10-2, 8-3-3; OP14/EB04
          // FAQ for OP14-078 and OP14-112), so both actions carry the Leader
          // check. An empty DON!! deck does not stop the K.O. (ST34 FAQ).
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
              match: "exact",
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
            condition: {
              condition: "leaderTrait",
              trait: "Big Mom Pirates",
              match: "exact",
            },
          },
        ],
      },
    ],
  },
  i18n: st34CharlotteCracker002I18n,
};
