import type { EventCard } from "@tcg/op-types";
import { op11XCalibur020I18n } from "./op11-020-x-calibur.i18n.ts";

export const op11XCalibur020: EventCard = {
  id: "OP11-020",
  canonicalId: "OP11-020",
  slug: "x-calibur",
  name: "X Calibur",
  printings: [
    {
      id: "OP11-020",
      artId: "OP11-020",
      setCode: "OP11",
      collectorNumber: "020",
      rarity: "UC",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/OP11-020.jpg",
    },
  ],
  cardType: "event",
  color: ["red"],
  rarity: "UC",
  setId: "OP11",
  cost: 2,
  trigger: "Up to 1 of your Leader or Character cards gains +1000 power during this turn.",
  traits: ["Navy", "SWORD", "Drake Pirates"],
  effect:
    "[Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if your opponent has a Character with 6000 power or more, up to 1 of your Leader or Character cards gains +1000 power during this turn.",
  // The import had another card's [Main] and [Trigger] here; this is the
  // printed OP11-020 text (official card list).
  effects: {
    effects: [
      {
        trigger: "counter",
        actions: [
          {
            action: "modifyPower",
            target: {
              player: "self",
              zones: ["leader", "character"],
              count: { amount: 1, upTo: true },
            },
            value: 2000,
            duration: "thisBattle",
          },
          {
            action: "modifyPower",
            target: {
              player: "self",
              zones: ["leader", "character"],
              count: { amount: 1, upTo: true },
            },
            value: 1000,
            duration: "thisTurn",
            condition: {
              condition: "hasCard",
              player: "opponent",
              zone: "character",
              filters: [{ filter: "power", comparison: "gte", value: 6000 }],
            },
          },
        ],
      },
      {
        trigger: "trigger",
        actions: [
          {
            action: "modifyPower",
            target: {
              player: "self",
              zones: ["leader", "character"],
              count: { amount: 1, upTo: true },
            },
            value: 1000,
            duration: "thisTurn",
          },
        ],
      },
    ],
  },
  i18n: op11XCalibur020I18n,
};
