// Official text: https://en.onepiece-cardgame.com/cardlist/?series=569021
// ST-21 FAQ: the −5000 and the K.O. may pick different Characters.
import type { EventCard } from "@tcg/op-types";
import { st21GumGumMolePistol017I18n } from "./st21-017-gum-gum-mole-pistol.i18n.ts";

export const st21GumGumMolePistol017: EventCard = {
  id: "ST21-017",
  canonicalId: "ST21-017",
  slug: "gum-gum-mole-pistol/st21-017",
  name: "Gum-Gum Mole Pistol",
  printings: [
    {
      id: "ST21-017",
      artId: "ST21-017",
      setCode: "ST21",
      collectorNumber: "017",
      rarity: "C",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/ST21-017.jpg",
      label: "Gum-Gum Mole Pistol (017)",
    },
  ],
  cardType: "event",
  color: ["red"],
  rarity: "C",
  setId: "ST21",
  cost: 4,
  trigger: "Activate this card's [Main] effect.",
  traits: ["The Four Emperors", "Straw Hat Crew"],
  effect:
    "[Main] Give up to 1 of your opponent's Characters −5000 power during this turn. Then, if you have a Character with 6000 power or more, K.O. up to 1 of your opponent's Characters with 2000 power or less.",
  effects: {
    effects: [
      {
        trigger: "main",
        actions: [
          {
            action: "modifyPower",
            target: {
              player: "opponent",
              zones: ["character"],
              count: { amount: 1, upTo: true },
            },
            value: -5000,
            duration: "thisTurn",
          },
          {
            // The "if" is checked after the −5000 resolves (4-10): current
            // power, so DON!! and other boosts count.
            action: "ko",
            target: {
              player: "opponent",
              zones: ["character"],
              count: { amount: 1, upTo: true },
              filters: [{ filter: "power", comparison: "lte", value: 2000 }],
            },
            condition: {
              condition: "hasCard",
              player: "self",
              zone: "character",
              filters: [{ filter: "power", comparison: "gte", value: 6000 }],
            },
          },
        ],
      },
      {
        trigger: "trigger",
        actions: [{ action: "activateEffect", effectTrigger: "main" }],
      },
    ],
  },
  i18n: st21GumGumMolePistol017I18n,
};
