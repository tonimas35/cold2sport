/**
 * EN Standard legality for the season April 2026 - March 2027.
 *
 * Standard uses the Block Number system: every card number has a block icon
 * (printed in the card's lower right corner) and a season allows only the
 * latest blocks. For tournaments from April 2026 to March 2027 that is blocks
 * 2 to 5 (block 1 rotated out on 2026-04-01). On top of that come the official
 * exception lists (cards legal regardless of their icon) and the dated ban
 * list (banned cards and banned pairs, which change mid-season).
 *
 * Legality is decided per *card number*: parallels, alt-arts and reprints of a
 * number share its block and its ban status ("Parallel cards included"), so
 * a printing id such as OP01-016_p3 is reduced to OP01-016 first.
 *
 * This module checks only the card pool and the ban list. Construction rules
 * (50 cards, 4 copies, leader colors) are `checkDeck` in ./deck.ts; a deck is
 * tournament-legal when both pass. Release dates are not modelled: every set
 * in the tables below is in the official EN card list of 2026-10-04 (newest
 * booster OP-17, released 2026-08-28), and unknown future sets are rejected
 * as "block unknown".
 */
import { getCard, hasCard } from "../engine/internals.ts";
import type { DeckList } from "./deck.ts";

/** "X" is the icon of Super Parallel numbers, legal in every Standard season. */
export type BlockIcon = 1 | 2 | 3 | 4 | 5 | "X";

/** Why a card number has the block it has, for explanations and tests. */
export type BlockBasis = "set" | "promo-list" | "super-parallel" | "fixed-block" | "reprint-update";

export interface BlockInfo {
  readonly icon: BlockIcon;
  readonly basis: BlockBasis;
}

export interface LegalityCheck {
  readonly legal: boolean;
  readonly problems: string[];
}

/** The season this data describes; dates outside it are refused, not guessed. */
export const STANDARD_SEASON = { from: "2026-04-01", to: "2027-03-31" } as const;
const SEASON_NAME = "Apr 2026 - Mar 2027";

/** Default check date: the day the OP14-020 ban takes effect. */
export const DEFAULT_LEGALITY_DATE = "2026-10-12";

// "In tournaments from April 2026 to March 2027, cards (2) to (5) will be
// allowed, while cards (1) will not be allowed." Source:
// https://en.onepiece-cardgame.com/topics/013.php (fetched 2026-10-04)
const LEGAL_ICONS: ReadonlySet<BlockIcon> = new Set<BlockIcon>([2, 3, 4, 5, "X"]);

// ---------------------------------------------------------------------------
// Block per set prefix of the card number.
//
// Rule: "booster packs 1 to 4 being Block 1, booster packs 5 to 8 being
// Block 2, and so on", with the numbers "updated every year" (topics/013.php).
// The yearly cut is what wins from Block 4 on: OP-15 is Block 4 and OP-16
// Block 5 (three boosters in Block 4, not four).
//
// Verified card by card against the official EN card list
// https://en.onepiece-cardgame.com/cardlist/?series=<id> (server-rendered
// "Block icon" field, all 60 series fetched 2026-10-04, 4844 printings of
// 2785 card numbers). Every printing of every number matches this table
// except for the exception lists further down and these errors of the EN list,
// where the set rule is used instead:
//   - OP-05: the base printings of 91 of the 119 OP05 numbers show "1" in the
//     EN list, while their parallels and reprints show "2" and the JP list
//     (https://www.onepiece-cardgame.com/cardlist/?series=550105) shows "2" for
//     all 147 OP05 printings. OP-05 is booster 5, so Block 2.
//   - ST13-003_p2 (a promo printing) shows "1"; ST-13 is Block 2 everywhere else.
//   - OP15-096 shows "-" (no icon); OP-15 is Block 4.
//
// Starter decks: the per-card scrape found no starter deck whose own numbers
// mix blocks. The products do mix blocks (ST-10/11/15/17/19/20 reprint Block 1
// OP01-OP03 cards, ST-31..ST-36 reprint older OP/EB/ST cards), but a reprint
// keeps its own number and so its own set's block; e.g. the ten OP02 cards in
// ST-11 are Block 1 while ST11-001..005 are Block 2. ST-15..ST-20 are Block 3,
// not 2 (the JP list agrees).
// EB-04 has no EN product of its own: its cards ship in OP-14 and OP-15
// boosters ([OP14-EB04], [OP15-EB04]) and are Block 4.
// ---------------------------------------------------------------------------
const SET_BLOCKS: Readonly<Record<string, BlockIcon>> = {
  // Booster packs.
  OP01: 1, OP02: 1, OP03: 1, OP04: 1,
  OP05: 2, OP06: 2, OP07: 2, OP08: 2,
  OP09: 3, OP10: 3, OP11: 3, OP12: 3,
  OP13: 4, OP14: 4, OP15: 4,
  OP16: 5, OP17: 5,
  // Extra and premium boosters (new numbers only; their reprints keep the
  // block of their own number).
  EB01: 2, EB02: 3, EB03: 4, EB04: 4,
  PRB01: 3, PRB02: 3,
  // Starter decks, per card number from the official EN list.
  ST01: 1, ST02: 1, ST03: 1, ST04: 1, ST05: 1, ST06: 1, ST07: 1, ST08: 1, ST09: 1,
  ST10: 2, ST11: 2, ST12: 2, ST13: 2, ST14: 2,
  ST15: 3, ST16: 3, ST17: 3, ST18: 3, ST19: 3, ST20: 3, ST21: 3, ST22: 3,
  ST23: 3, ST24: 3, ST25: 3, ST26: 3, ST27: 3, ST28: 3,
  ST29: 4,
  ST30: 5, ST31: 5, ST32: 5, ST33: 5, ST34: 5, ST35: 5, ST36: 5,
};

// Promotion cards (P-xxx) have no set rule: blocks follow the release era and
// interleave (P-071/072 are Block 3 but P-073..076 Block 2). Ranges as listed
// in the official EN card list ("Promotion card", "Other Product Card" and the
// products that reprint promos), fetched 2026-10-04; all printings of each
// number agree. Numbers missing from the EN list (e.g. P-038, P-120..P-134,
// the announced P-163) are left out on purpose and come out as "unknown".
// Source: https://en.onepiece-cardgame.com/cardlist/?series=569901 (+569801)
const PROMO_BLOCKS: ReadonlyArray<readonly [first: number, last: number, icon: BlockIcon]> = [
  [1, 37, 1], [39, 39, 1],
  [41, 63, 2], [65, 65, 2], [68, 70, 2],
  [71, 72, 3],
  [73, 76, 2],
  [77, 79, 3], [81, 85, 3], [88, 93, 3], [96, 100, 3],
  [101, 107, 4], [110, 113, 4], [115, 115, 4], [117, 117, 4], [119, 119, 4],
  [135, 135, 5], [155, 155, 5],
];

// ---------------------------------------------------------------------------
// Official exception lists. Source (both URLs serve the same page,
// "Overview of Cards Subject to Block Number Updates", fetched 2026-10-04):
// https://en.onepiece-cardgame.com/rules/blockicon-card/
// https://en.onepiece-cardgame.com/news/blockicon-card.html
// ---------------------------------------------------------------------------

// "Super Parallel Rare cards from past products, as well as cards that share
// the same card number, will generally remain legal for use in Standard
// Regulation regardless of whether they have been reprinted." New Super
// Parallels from April 2026 carry the icon "X". List updated 2026-08-21.
const SUPER_PARALLEL_NUMBERS: ReadonlySet<string> = new Set([
  "EB01-006", "EB02-061", "EB03-061", "EB04-044",
  "OP01-016", "OP01-120", "OP02-013", "OP03-122", "OP04-083",
  "OP05-069", "OP05-074", "OP05-119", "OP06-118", "OP06-119", "OP07-051", "OP08-118",
  "OP09-004", "OP09-051", "OP09-093", "OP09-118", "OP09-119", "OP10-119", "OP11-118", "OP12-118",
  "OP13-118", "OP13-119", "OP13-120", "OP14-119", "OP15-118",
  "OP16-063", "OP16-065", "OP16-073",
  "OP17-005", "OP17-022", "OP17-062", "OP17-112", "OP17-118",
]);

// "Cards Eligible for Use Under Block Number (4)": "Regardless of reprints,
// these cards will be treated as belonging to the specified Block Number. They
// will be legal for use in the Standard Regulation from April 1, 2026, to
// March 31, 2029." (list of 2025-07-23). These are exactly the Block 1 numbers
// reprinted in PRB-02 (plus OP04-083, which is a Super Parallel number anyway),
// i.e. "the PRB-02 reprints are fixed to Block 4".
const FIXED_BLOCK: Readonly<Record<string, BlockIcon>> = {
  "OP01-039": 4, // Killer
  "OP01-055": 4, // You Can Be My Samurai!!
  "OP02-005": 4, // Curly Dadan
  "OP02-068": 4, // Gum-Gum Rain
  "OP03-008": 4, // Buggy
  "OP03-044": 4, // Kaya
  "OP03-048": 4, // Nojiko
  "OP03-072": 4, // Gum-Gum Jet Gatling
  "OP03-097": 4, // Six King Pistol
  "OP04-016": 4, // Bad Manners Kick Course
  "OP04-077": 4, // Ideo
  "OP04-096": 4, // Corrida Coliseum
  "ST01-011": 4, // Brook
  "ST02-007": 4, // Jewelry Bonney
  "ST06-008": 4, // Hina
};

// "Updated Block Number and cards that have been reprinted" (list of
// 2026-08-21): numbers whose newest printing carries a newer icon, which then
// applies to all their printings. Icons from the official card list:
// OP01-016_p9 (ST-31) "X", OP04-016_p3 (ST-31) "4", EB04-061_p2 (OP-17) "X".
const REPRINT_UPDATES: Readonly<Record<string, BlockIcon>> = {
  "OP01-016": "X", // Nami
  "OP04-016": 4, // Bad Manners Kick Course
  "EB04-061": "X", // Monkey.D.Luffy
};

// ---------------------------------------------------------------------------
// Ban list, EN dates (NA/EU/LATAM/OC; Japan's dates can differ). Only entries
// in force at some point of the season are listed. Sources, fetched 2026-10-04:
// https://en.onepiece-cardgame.com/news/restriction.html (current list)
// https://en.onepiece-cardgame.com/news/restriction-261001.html (OP14-020, 2026-10-12)
// https://en.onepiece-cardgame.com/news/restriction-260501.html (pair effective 2026-04-10)
// https://en.onepiece-cardgame.com/topics/029.php (2026-04-01: OP06-047 banned;
//   OP07-045, EB01-059, ST06-015, OP02-024, OP03-098, OP02-117 unbanned)
// https://en.onepiece-cardgame.com/topics/019.php (2025-08-30: OP03-040, first pairs;
//   OP05-041, OP02-052 unbanned)
// https://en.onepiece-cardgame.com/news/restriction-archive.html (older bans)
// ---------------------------------------------------------------------------

interface DatedCard {
  readonly card: string;
  /** First day in force (inclusive), YYYY-MM-DD. */
  readonly from: string;
  /** First day no longer in force, if lifted. */
  readonly until?: string;
}

interface DatedPair {
  readonly cards: readonly [string, string];
  readonly from: string;
  readonly until?: string;
}

const BANNED: readonly DatedCard[] = [
  { card: "OP06-116", from: "2024-06-21" }, // Reject
  { card: "ST10-001", from: "2024-09-06" }, // Trafalgar Law
  { card: "OP06-086", from: "2025-04-01" }, // Gecko Moria
  { card: "OP03-040", from: "2025-08-30" }, // Nami
  { card: "OP06-047", from: "2026-04-01" }, // Charlotte Pudding
  { card: "OP14-020", from: "2026-10-12" }, // Dracule Mihawk (announced 2026-09-24)
];

/** At most one copy. The list is empty as of 2026-10-04 but the rule exists. */
const RESTRICTED: readonly DatedCard[] = [];

const BANNED_PAIRS: readonly DatedPair[] = [
  { cards: ["OP11-040", "OP11-067"], from: "2025-08-30" }, // Luffy + Charlotte Katakuri
  { cards: ["OP11-040", "OP08-069"], from: "2025-08-30" }, // Luffy + Charlotte Linlin
  { cards: ["OP07-115", "EB04-058"], from: "2026-04-10" }, // I Re-Quasar Helllp!! + Borsalino (JP: 2026-05-01)
];

// ---------------------------------------------------------------------------

const CARD_NUMBER = /^([A-Z]+\d*)-(\d{3})(?![0-9])/;

/** OP01-016_p3 -> OP01-016; null when the id is not a card number at all. */
export function cardNumber(cardId: string): string | null {
  const m = CARD_NUMBER.exec(cardId);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** The Standard block of a card number (or printing id), or null when unknown. */
export function standardBlock(cardId: string): BlockInfo | null {
  const number = cardNumber(cardId);
  if (number === null) return null;
  // Exceptions first: they exist precisely to override the set rule.
  if (SUPER_PARALLEL_NUMBERS.has(number)) return { icon: "X", basis: "super-parallel" };
  const updated = REPRINT_UPDATES[number];
  if (updated !== undefined) return { icon: updated, basis: "reprint-update" };
  const fixed = FIXED_BLOCK[number];
  if (fixed !== undefined) return { icon: fixed, basis: "fixed-block" };
  const [prefix, digits] = number.split("-") as [string, string];
  if (prefix === "P") {
    const n = Number(digits);
    const range = PROMO_BLOCKS.find(([first, last]) => n >= first && n <= last);
    return range ? { icon: range[2], basis: "promo-list" } : null;
  }
  const icon = SET_BLOCKS[prefix];
  return icon === undefined ? null : { icon, basis: "set" };
}

function inForce(entry: { from: string; until?: string }, date: string): boolean {
  return entry.from <= date && (entry.until === undefined || date < entry.until);
}

function assertSeasonDate(date: string): void {
  // Date.parse rolls impossible days over ("2026-09-31" -> Oct 1) instead of
  // failing, so the date must survive a round trip unchanged.
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) {
    throw new RangeError(`invalid date "${date}", expected YYYY-MM-DD`);
  }
  if (date < STANDARD_SEASON.from || date > STANDARD_SEASON.to) {
    throw new RangeError(
      `${date} is outside the ${STANDARD_SEASON.from}..${STANDARD_SEASON.to} Standard season this data covers`,
    );
  }
}

function label(number: string): string {
  return hasCard(number) ? `${number} ${getCard(number).name}` : number;
}

/**
 * Card-pool and ban-list legality of a deck in EN Standard on `date`
 * (YYYY-MM-DD, within STANDARD_SEASON). The leader is checked like any other
 * card. Each offending card number is reported once, whatever its copy count.
 */
export function checkStandardLegality(deck: DeckList, date: string = DEFAULT_LEGALITY_DATE): LegalityCheck {
  assertSeasonDate(date);
  const problems: string[] = [];
  const copies = new Map<string, number>();
  for (const id of [deck.leader, ...deck.main]) {
    const number = cardNumber(id);
    if (number === null) {
      problems.push(`${id}: not a card number`);
      continue;
    }
    copies.set(number, (copies.get(number) ?? 0) + 1);
  }

  for (const [number, count] of copies) {
    const block = standardBlock(number);
    if (block === null) {
      problems.push(`${label(number)}: block unknown (set or promo not in the official EN card list of 2026-10-04)`);
    } else if (!LEGAL_ICONS.has(block.icon)) {
      problems.push(`${label(number)}: block ${block.icon}, Standard ${SEASON_NAME} allows blocks 2-5`);
    }
    const ban = BANNED.find((b) => b.card === number && inForce(b, date));
    if (ban) problems.push(`${label(number)}: banned since ${ban.from}`);
    const restriction = RESTRICTED.find((r) => r.card === number && inForce(r, date));
    if (restriction && count > 1) problems.push(`${label(number)}: restricted to 1 copy since ${restriction.from} (found ${count})`);
  }

  for (const pair of BANNED_PAIRS) {
    const [a, b] = pair.cards;
    if (copies.has(a) && copies.has(b) && inForce(pair, date)) {
      problems.push(`banned pair since ${pair.from}: ${label(a)} + ${label(b)}`);
    }
  }
  return { legal: problems.length === 0, problems };
}
