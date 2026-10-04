/**
 * Position features for the value model, always from one seat's point of view
 * ("me" vs "opp"). They only describe a full (possibly determinized) state; when
 * the search evaluates a determinized world, hidden values are the sampled ones.
 */
import type { MatchSeat, MatchState } from "@tcg/op-engine";
import { getCardCounter, getCardPower, getCard, getKeywords } from "../engine/internals.ts";

const OTHER: Record<MatchSeat, MatchSeat> = { north: "south", south: "north" };

interface SideStats {
  life: number;
  hand: number;
  deck: number;
  donTotal: number;
  donActive: number;
  leaderPower: number;
  chars: number;
  charPower: number;
  charCost: number;
  activeChars: number;
  blockers: number;
  /** Characters with power >= the opposing leader's power (credible attackers). */
  threats: number;
  handCounter: number;
  handCounterEvents: number;
  handPlayable: number;
  lifeTriggers: number;
}

function side(state: MatchState, seat: MatchSeat): SideStats {
  const p = state.players[seat];
  const opp = state.players[OTHER[seat]];
  const oppLeaderPower = getCardPower(state, opp.leaderInstanceId);
  let donAttached = state.cards[p.leaderInstanceId]?.attachedDon ?? 0;
  let chars = 0,
    charPower = 0,
    charCost = 0,
    activeChars = 0,
    blockers = 0,
    threats = 0;
  for (const id of p.characterArea) {
    if (!id) continue;
    const inst = state.cards[id]!;
    const card = getCard(inst.cardId) as { cost?: number };
    const power = getCardPower(state, id);
    chars++;
    charPower += power;
    charCost += card.cost ?? 0;
    donAttached += inst.attachedDon;
    if (!inst.rested) activeChars++;
    if (getKeywords(state, id).has("blocker")) blockers++;
    if (power >= oppLeaderPower) threats++;
  }
  let handCounter = 0,
    handCounterEvents = 0,
    handPlayable = 0;
  const donTotal = p.activeDon + p.restedDon + donAttached;
  for (const id of p.hand) {
    const card = getCard(state.cards[id]!.cardId) as {
      cardType: string;
      cost?: number;
      effects?: { effects?: Array<{ trigger: string }> };
    };
    if (card.cardType === "character") handCounter += getCardCounter(state, id);
    else if (card.cardType === "event" && card.effects?.effects?.some((b) => b.trigger === "counter")) {
      handCounterEvents++;
    }
    if ((card.cost ?? 99) <= donTotal + 1) handPlayable++;
  }
  let lifeTriggers = 0;
  for (const id of p.life) {
    const card = getCard(state.cards[id]!.cardId) as { trigger?: string };
    if (card.trigger) lifeTriggers++;
  }
  return {
    life: p.life.length,
    hand: p.hand.length,
    deck: p.deck.length,
    donTotal,
    donActive: p.activeDon,
    leaderPower: getCardPower(state, p.leaderInstanceId),
    chars,
    charPower,
    charCost,
    activeChars,
    blockers,
    threats,
    handCounter,
    handCounterEvents,
    handPlayable,
    lifeTriggers,
  };
}

export const FEATURE_NAMES = [
  "bias",
  "myTurn",
  "turn",
  "lifeMe",
  "lifeOpp",
  "lifeMe0",
  "lifeOpp0",
  "lifeMe1",
  "lifeOpp1",
  "handMe",
  "handOpp",
  "deckMeLow",
  "deckOppLow",
  "donMe",
  "donOpp",
  "leaderPowerDiff",
  "charsMe",
  "charsOpp",
  "charPowerMe",
  "charPowerOpp",
  "charCostMe",
  "charCostOpp",
  "activeCharsMe",
  "activeCharsOpp",
  "blockersMe",
  "blockersOpp",
  "threatsMe",
  "threatsOpp",
  "counterMe",
  "counterOpp",
  "counterEventsMe",
  "counterEventsOpp",
  "playableMe",
  "playableOpp",
  "triggersMe",
  "triggersOpp",
  "pressureOnOpp",
  "pressureOnMe",
] as const;

export type FeatureVector = Float64Array;

/**
 * "pressure" ~ how many hits the attacker can land beyond the defender's
 * blockers and counters, relative to remaining life: the classic lethal
 * threat. Rough by design; the model learns how much it matters.
 */
function pressure(att: SideStats, def: SideStats): number {
  const attackers = att.threats + 1; // + leader
  const absorbed = def.blockers + (def.handCounter / 2000 + def.handCounterEvents);
  return Math.max(0, attackers - absorbed) / Math.max(1, def.life + 1);
}

export function extractFeatures(state: MatchState, seat: MatchSeat): FeatureVector {
  const me = side(state, seat);
  const opp = side(state, OTHER[seat]);
  const f = new Float64Array(FEATURE_NAMES.length);
  let i = 0;
  f[i++] = 1;
  f[i++] = state.activeSeat === seat ? 1 : 0;
  f[i++] = Math.min(state.turnNumber, 20) / 10;
  f[i++] = me.life / 5;
  f[i++] = opp.life / 5;
  f[i++] = me.life === 0 ? 1 : 0;
  f[i++] = opp.life === 0 ? 1 : 0;
  f[i++] = me.life === 1 ? 1 : 0;
  f[i++] = opp.life === 1 ? 1 : 0;
  f[i++] = me.hand / 5;
  f[i++] = opp.hand / 5;
  f[i++] = me.deck <= 5 ? (6 - me.deck) / 5 : 0;
  f[i++] = opp.deck <= 5 ? (6 - opp.deck) / 5 : 0;
  f[i++] = me.donTotal / 10;
  f[i++] = opp.donTotal / 10;
  f[i++] = (me.leaderPower - opp.leaderPower) / 5000;
  f[i++] = me.chars / 5;
  f[i++] = opp.chars / 5;
  f[i++] = me.charPower / 25000;
  f[i++] = opp.charPower / 25000;
  f[i++] = me.charCost / 20;
  f[i++] = opp.charCost / 20;
  f[i++] = me.activeChars / 5;
  f[i++] = opp.activeChars / 5;
  f[i++] = me.blockers / 3;
  f[i++] = opp.blockers / 3;
  f[i++] = me.threats / 5;
  f[i++] = opp.threats / 5;
  f[i++] = me.handCounter / 10000;
  f[i++] = opp.handCounter / 10000;
  f[i++] = me.handCounterEvents / 3;
  f[i++] = opp.handCounterEvents / 3;
  f[i++] = me.handPlayable / 5;
  f[i++] = opp.handPlayable / 5;
  f[i++] = me.lifeTriggers / 5;
  f[i++] = opp.lifeTriggers / 5;
  f[i++] = pressure(me, opp);
  f[i++] = pressure(opp, me);
  return f;
}
