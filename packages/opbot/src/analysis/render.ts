/**
 * Text rendering of a position from one seat's point of view: only what that
 * seat can see (opponent hand, decks and Life appear as counts).
 */
import type { MatchSeat, MatchState } from "@tcg/op-engine";
import { getCard, getCardPower } from "../engine/internals.ts";

const OTHER: Record<MatchSeat, MatchSeat> = { north: "south", south: "north" };

export function cardName(cardId: string): string {
  return (getCard(cardId) as { i18n: { en: { name: string } } }).i18n.en.name;
}

function describeInPlay(state: MatchState, id: string): string {
  const inst = state.cards[id]!;
  const card = getCard(inst.cardId) as { cost?: number };
  const bits = [`${cardName(inst.cardId)} ${getCardPower(state, id)}`];
  if (card.cost !== undefined) bits.push(`c${card.cost}`);
  if (inst.attachedDon > 0) bits.push(`+${inst.attachedDon} DON`);
  if (inst.rested) bits.push("rested");
  return bits.join(" ");
}

function handCard(state: MatchState, id: string): string {
  const card = getCard(state.cards[id]!.cardId) as { cost?: number; counter?: number; cardType: string };
  const extra = [card.cost !== undefined ? `c${card.cost}` : "", card.counter ? `+${card.counter}` : "", card.cardType === "event" ? "event" : ""]
    .filter(Boolean)
    .join(" ");
  return `${cardName(state.cards[id]!.cardId)}${extra ? ` (${extra})` : ""}`;
}

function side(state: MatchState, seat: MatchSeat, viewer: MatchSeat): string[] {
  const p = state.players[seat];
  const who = seat === viewer ? `YOU (${seat})` : `OPPONENT (${seat})`;
  const lines = [
    `${who}  Leader: ${describeInPlay(state, p.leaderInstanceId)} | Life ${p.life.length} | Hand ${p.hand.length} | Deck ${p.deck.length} | DON!! active ${p.activeDon}, rested ${p.restedDon}, deck ${p.donDeckCount}`,
  ];
  const chars = p.characterArea.filter((x): x is string => Boolean(x)).map((id) => describeInPlay(state, id));
  lines.push(`  Characters: ${chars.length ? chars.join(" | ") : "-"}`);
  if (p.stageArea) lines.push(`  Stage: ${cardName(state.cards[p.stageArea]!.cardId)}`);
  if (seat === viewer) lines.push(`  Hand: ${p.hand.map((id) => handCard(state, id)).join(" | ") || "-"}`);
  else {
    const known = p.hand.filter((id) => state.cards[id]!.publicKnowledge).map((id) => handCard(state, id));
    if (known.length) lines.push(`  Known cards in hand: ${known.join(" | ")}`);
  }
  if (p.trash.length) lines.push(`  Trash (${p.trash.length}): ${p.trash.slice(-6).map((id) => cardName(state.cards[id]!.cardId)).join(", ")}${p.trash.length > 6 ? ", ..." : ""}`);
  return lines;
}

export function renderView(state: MatchState, viewer: MatchSeat): string {
  const header = `Turn ${state.turnNumber} | ${state.activeSeat}'s turn | phase ${state.phase}${state.battle ? ` | battle: ${cardName(state.cards[state.battle.attackerId]!.cardId)} -> ${cardName(state.cards[state.battle.targetId]!.cardId)}` : ""}`;
  return [header, ...side(state, OTHER[viewer], viewer), ...side(state, viewer, viewer)].join("\n");
}
