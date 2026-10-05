import type { CharacterCard } from "@tcg/op-types";
import { op17Ganzui043I18n } from "./op17-043-ganzui.i18n.ts";

export const op17Ganzui043: CharacterCard = {
  id: "OP17-043",
  canonicalId: "OP17-043",
  slug: "ganzui/op17-043",
  name: "Ganzui",
  printings: [
    {
      id: "OP17-043",
      artId: "OP17-043",
      setCode: "OP17",
      collectorNumber: "043",
      rarity: "UC",
      imageUrl: "https://www.optcgapi.com/media/static/Card_Images/OP17-043.jpg",
    },
  ],
  cardType: "character",
  color: ["blue"],
  rarity: "UC",
  setId: "OP17",
  cost: 5,
  power: 7000,
  traits: ["Rocks Pirates"],
  attribute: "special",
  effect:
    "If this Character would be removed from the field, you may trash 2 cards from your hand instead.\n[On Play] Your Leader's base power becomes 6000 until the end of your opponent's next End Phase.",
  effects: {
    effects: [
      {
        trigger: "onPlay",
        // OP17 FAQ: if another effect set the Leader's base power to 7000, that
        // one applies (the highest set value wins, 4-9-2-1).
        actions: [
          {
            action: "setBasePower",
            target: { player: "self", zones: ["leader"], count: { amount: 1 } },
            value: 6000,
            duration: "untilEndOfOpponentNextEndPhase",
          },
        ],
      },
    ],
    replacementEffects: [
      {
        // No "by your opponent's effect": any way of leaving the field,
        // battle K.O. included (the Japanese text reads "leave the field").
        // OP17 FAQ: not available with 0 or 1 cards in hand (8-1-3-4-5).
        replacedEvent: "leaveField",
        eventFilter: {
          targetSelf: true,
        },
        replacementAction: {
          action: "trashFromHand",
          player: "self",
          amount: 2,
        },
      },
    ],
  },
  i18n: op17Ganzui043I18n,
};
