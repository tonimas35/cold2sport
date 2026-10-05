import type { CharacterCard } from "@tcg/op-types";
import { st26MonkeyDLuffy005I18n } from "./st26-005-monkey-d-luffy.i18n.ts";

export const st26MonkeyDLuffy005: CharacterCard = {
  id: "ST26-005",
  canonicalId: "ST26-005",
  slug: "monkey-d-luffy/st26-005",
  name: "Monkey.D.Luffy",
  printings: [
    {
      id: "ST26-005",
      artId: "ST26-005_p1",
      setCode: "ST26",
      collectorNumber: "005",
      rarity: "SR",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/ST26-005_p1.jpg",
      label: "Monkey.D.Luffy (SP)",
    },
  ],
  cardType: "character",
  color: ["purple"],
  rarity: "SR",
  setId: "ST26",
  cost: 6,
  power: 7000,
  traits: ["Straw Hat Crew"],
  attribute: "strike",
  effect:
    "[On Play]/[When Attacking] DON!! -2 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader is multicolored and your opponent has 5 or more DON!! cards on their field, your {Straw Hat Crew} type Leader's base power becomes 7000 until the end of your opponent's next End Phase.",
  effects: {
    effects: [
      {
        trigger: "onPlay",
        // DON!! -2 reads "You may return ...": paying is the player's choice
        // (8-3-1-4); it was paid without asking.
        optional: true,
        costs: [
          {
            cost: "returnDon",
            amount: 2,
          },
        ],
        conditions: [
          {
            condition: "leaderMulticolored",
          },
          {
            condition: "donFieldCount",
            player: "opponent",
            comparison: "gte",
            value: 5,
          },
        ],
        actions: [
          {
            action: "setBasePower",
            target: {
              player: "self",
              zones: ["leader"],
              count: {
                amount: 1,
              },
              filters: [
                {
                  filter: "trait",
                  value: "Straw Hat Crew",
                  match: "exact",
                },
              ],
            },
            value: 7000,
            duration: "untilEndOfOpponentNextEndPhase",
          },
        ],
      },
      {
        trigger: "whenAttacking",
        optional: true,
        costs: [
          {
            cost: "returnDon",
            amount: 2,
          },
        ],
        conditions: [
          {
            condition: "leaderMulticolored",
          },
          {
            condition: "donFieldCount",
            player: "opponent",
            comparison: "gte",
            value: 5,
          },
        ],
        actions: [
          {
            action: "setBasePower",
            target: {
              player: "self",
              zones: ["leader"],
              count: {
                amount: 1,
              },
              filters: [
                {
                  filter: "trait",
                  value: "Straw Hat Crew",
                  match: "exact",
                },
              ],
            },
            value: 7000,
            duration: "untilEndOfOpponentNextEndPhase",
          },
        ],
      },
    ],
  },
  i18n: st26MonkeyDLuffy005I18n,
};
