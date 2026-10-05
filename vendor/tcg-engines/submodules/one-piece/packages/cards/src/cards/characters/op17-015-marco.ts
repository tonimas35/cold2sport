import type { CharacterCard } from "@tcg/op-types";
import { op17Marco015I18n } from "./op17-015-marco.i18n.ts";

export const op17Marco015: CharacterCard = {
  id: "OP17-015",
  canonicalId: "OP17-015",
  slug: "marco/op17-015",
  name: "Marco",
  printings: [
    {
      id: "OP17-015",
      artId: "OP17-015",
      setCode: "OP17",
      collectorNumber: "015",
      rarity: "UC",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/OP17-015_gm3pNL8.jpg",
    },
  ],
  cardType: "character",
  color: ["red"],
  rarity: "UC",
  setId: "OP17",
  cost: 5,
  power: 6000,
  counter: 1000,
  traits: ["Whitebeard Pirates"],
  attribute: "special",
  effect:
    'If one of your Characters would be removed from the field by your opponent\'s effect, you may K.O. this Character instead.\n[On K.O.] You may trash 1 card with a type including "Whitebeard Pirates" from your hand: Play this Character card from your trash.',
  effects: {
    // OP17 FAQ: Marco covers himself too (returned to hand or deck by an
    // opponent's effect, he can be K.O.'d instead), and when he and another
    // Character are K.O.'d at the same time, one application K.O.s only Marco
    // and the other Character stays (8-1-3-4-4). The K.O. is Marco's own
    // effect (8-1-3-4-7), so his [On K.O.] can follow.
    replacementEffects: [
      {
        replacedEvent: "removeFromField",
        target: { player: "self", zones: ["character"], count: { amount: 1 } },
        source: "opponentEffect",
        replacementAction: {
          action: "ko",
          target: { player: "self", zones: ["character"], count: { amount: 1 }, self: true },
        },
      },
    ],
    effects: [
      {
        trigger: "onKo",
        costs: [
          {
            cost: "trashFromHand",
            amount: 1,
            filters: [
              {
                filter: "trait",
                value: "Whitebeard Pirates",
                match: "includes",
              },
            ],
          },
        ],
        actions: [
          {
            action: "play",
            source: {
              player: "self",
              zone: "trash",
            },
            count: {
              amount: 1,
            },
            self: true,
          },
        ],
        optional: true,
      },
    ],
  },
  i18n: op17Marco015I18n,
};
