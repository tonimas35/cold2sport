// Official text: https://en.onepiece-cardgame.com/cardlist/?series=569030
// ST-30 FAQ: with no Characters the Leader does not get −2000; the
// [Opponent's Turn] boost cannot give this Leader +3000 (its name is
// "Luffy & Ace", neither [Portgas.D.Ace] nor [Monkey.D.Luffy]).
import type { LeaderCard } from "@tcg/op-types";
import { st30LuffyAce001I18n } from "./st30-001-luffy-ace.i18n.ts";

export const st30LuffyAce001: LeaderCard = {
  id: "ST30-001",
  canonicalId: "ST30-001",
  slug: "luffy-ace/st30-001",
  name: "Luffy & Ace",
  printings: [
    {
      id: "ST30-001",
      artId: "ST30-001",
      setCode: "ST30",
      collectorNumber: "001",
      rarity: "L",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/ST30-001.jpg",
      label: "Luffy & Ace (001)",
    },
  ],
  cardType: "leader",
  color: ["red", "green"],
  rarity: "L",
  setId: "ST30",
  power: 6000,
  life: 4,
  traits: ["Impel Down", "Whitebeard Pirates", "Straw Hat Crew"],
  attribute: ["strike", "special"],
  effect:
    "If you have a Character with 7000 base power or more, give this Leader −2000 power.\n[Opponent's Turn] All of your [Portgas.D.Ace] and [Monkey.D.Luffy] cards gain +3000 power.",
  effects: {
    permanentEffects: [
      {
        // "Base" power is the printed value (4-9-2): given DON!! and +power
        // effects do not count; an effect that sets base power does (4-9-2-1).
        conditions: [
          {
            condition: "hasCard",
            player: "self",
            zone: "character",
            filters: [{ filter: "basePower", comparison: "gte", value: 7000 }],
          },
        ],
        actions: [
          {
            action: "modifyPower",
            target: {
              player: "self",
              zones: ["leader"],
              count: { amount: 1 },
              self: true,
            },
            value: -2000,
            duration: "permanent",
          },
        ],
      },
      {
        // [Opponent's Turn] (10-2-12); [Name] means that card name (2-1-2),
        // so the Leader itself never matches.
        conditions: [{ condition: "turn", value: "opponent" }],
        actions: [
          {
            action: "modifyPower",
            target: {
              player: "self",
              zones: ["leader", "character"],
              count: { amount: "all" },
              filters: [
                {
                  filter: "anyOf",
                  filters: [
                    { filter: "name", value: "Portgas.D.Ace" },
                    { filter: "name", value: "Monkey.D.Luffy" },
                  ],
                },
              ],
            },
            value: 3000,
            duration: "permanent",
          },
        ],
      },
    ],
  },
  i18n: st30LuffyAce001I18n,
};
