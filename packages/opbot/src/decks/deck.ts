/**
 * Deck lists: parsing, validation and the built-in test decks.
 *
 * Text format accepted by `parseDeckText` (one entry per line, the common
 * export format of OPTCGSim and most deck builders):
 *
 *     1xOP12-001        <- the Leader (any line whose card is a Leader)
 *     4xOP12-016
 *     4 OP09-002
 *     OP05-060 x2
 *
 * Blank lines and lines starting with '#' or '//' are ignored.
 */
import { TEST_DECKS, type TestDeckId } from "@tcg/op-engine";
import { getCard, hasCard, validateDeckForFormat } from "../engine/internals.ts";

export interface DeckList {
  readonly name: string;
  readonly leader: string;
  /** 50 card ids, one entry per copy. */
  readonly main: readonly string[];
  /** Free-form provenance (URL, event, date). */
  readonly source?: string;
}

const LINE_PATTERNS: RegExp[] = [
  /^(\d+)\s*[xX×]?\s*([A-Z0-9]+-\d{3}[A-Za-z0-9_-]*)$/,
  /^([A-Z0-9]+-\d{3}[A-Za-z0-9_-]*)\s*[xX×]\s*(\d+)$/,
];

export function parseDeckText(name: string, text: string, source?: string): DeckList {
  let leader: string | null = null;
  const main: string[] = [];
  const errors: string[] = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    let quantity: number | null = null;
    let cardId: string | null = null;
    for (const [i, pattern] of LINE_PATTERNS.entries()) {
      const m = pattern.exec(line);
      if (!m) continue;
      quantity = Number(i === 0 ? m[1] : m[2]);
      cardId = (i === 0 ? m[2] : m[1])!;
      break;
    }
    if (quantity === null || cardId === null) {
      errors.push(`line ${index + 1}: cannot parse "${line}"`);
      continue;
    }
    if (!hasCard(cardId)) {
      errors.push(`line ${index + 1}: unknown card ${cardId}`);
      continue;
    }
    if (getCard(cardId).cardType === "leader") {
      if (leader !== null) errors.push(`line ${index + 1}: second leader ${cardId}`);
      leader = cardId;
      continue;
    }
    for (let i = 0; i < quantity; i++) main.push(cardId);
  }
  if (leader === null) errors.push("no leader found");
  if (errors.length > 0) throw new Error(`deck "${name}": ${errors.join("; ")}`);
  return { name, leader: leader!, main, ...(source !== undefined && { source }) };
}

export function deckToText(deck: DeckList): string {
  const counts = new Map<string, number>();
  for (const id of deck.main) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [`1x${deck.leader}`, ...[...counts].map(([id, n]) => `${n}x${id}`)].join("\n");
}

export interface DeckCheck {
  readonly valid: boolean;
  readonly problems: string[];
}

/** Construction rules (50 cards, 4 copies, leader colors) via the engine's validator. */
export function checkDeck(deck: DeckList): DeckCheck {
  const counts = new Map<string, number>();
  for (const id of deck.main) counts.set(id, (counts.get(id) ?? 0) + 1);
  const result = validateDeckForFormat("standard", [
    { cardId: deck.leader, quantity: 1 },
    ...[...counts].map(([cardId, quantity]) => ({ cardId, quantity })),
  ]);
  return {
    valid: result.valid,
    problems: result.rules.filter((r) => !r.passed).map((r) => r.message),
  };
}

/** The engine's six synthetic mono-color automation decks. */
export function engineTestDecks(): DeckList[] {
  return (Object.keys(TEST_DECKS) as TestDeckId[]).map((id) => ({
    name: id,
    leader: TEST_DECKS[id].leaderId,
    main: [...TEST_DECKS[id].mainDeck],
    source: "tcg-engines automation/test-decks.ts (synthetic, not a meta deck)",
  }));
}
