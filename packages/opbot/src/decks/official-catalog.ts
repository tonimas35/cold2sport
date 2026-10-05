/**
 * The official English card list (https://en.onepiece-cardgame.com/cardlist/)
 * as data, and its comparison with the engine's card catalog.
 *
 * Why: the engine's catalog was imported from a third-party API, and card by
 * card audits keep finding import errors that no engine test can see (power
 * copied into counter, wrong attribute, several types stored as one string,
 * card text with no executable block). The official list is the reference, so
 * this module parses it and reports every disagreement by category, which
 * makes the audit repeatable for every new set.
 *
 * The site is server-rendered: one page per series (`?series=<id>`) holds
 * every printing of that series, reprints included, each as a
 * `<dl class="modalCol" id="<printing id>">` block. The series ids come from
 * the page's own `<select name="series">`. Downloading and caching live in
 * official-fetch.ts and the command in catalog-command.ts; everything here is
 * pure so it can be tested on fixtures.
 *
 * The structure checks are heuristics on the printed text: they find printed
 * abilities with no block of their kind, not blocks that do the wrong thing.
 */

export const OFFICIAL_CARDLIST_URL = "https://en.onepiece-cardgame.com/cardlist/";

// ---------------------------------------------------------------------------
// HTML helpers.

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
  minus: "\u2212",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  times: "\u00d7",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}

// The site prints attribute references in effect text as raw "<Slash>",
// "<Strike>"..., not escaped, so a generic "<[^>]+>" stripper would delete
// them. Only real HTML tags are removed.
const HTML_TAG = /<\/?(?:a|b|i|u|em|strong|span|font|img|p|div|sup|sub|small|ruby|rt|rp|h\d)\b[^>]*>/gi;

/** Inner HTML of a field -> plain text, `<br>` as newlines. */
export function htmlToText(fragment: string): string {
  return decodeEntities(fragment.replace(/<br\b[^>]*>/gi, "\n").replace(HTML_TAG, ""))
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n")
    .trim();
}

/** The inner HTML of the first `<div class="cls">` in `block` (fields never nest divs). */
function field(block: string, cls: string): string | null {
  const m = new RegExp(`<div class="${cls}">([\\s\\S]*?)</div>`).exec(block);
  return m ? m[1]! : null;
}

/** A field's value without its `<h3>` heading. */
function fieldText(block: string, cls: string): string | null {
  const inner = field(block, cls);
  return inner === null ? null : htmlToText(inner.replace(/<h3>[\s\S]*?<\/h3>/, ""));
}

// ---------------------------------------------------------------------------
// Series selector.

export interface SeriesOption {
  /** The `series` query value, e.g. "569117". */
  readonly id: string;
  /** Display name, e.g. "BOOSTER PACK -THE WORLD'S STRONGEST WARRIORS- [OP-17]". */
  readonly label: string;
  /** The bracketed product code, e.g. "OP-17", or null (promos). */
  readonly code: string | null;
}

/** The options of the card list's `<select name="series">`, in page order. */
export function parseSeriesOptions(html: string): SeriesOption[] {
  const select = /<select[^>]*name="series"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  if (!select) return [];
  const options: SeriesOption[] = [];
  for (const m of select[1]!.matchAll(/<option value="(\d+)"[^>]*>([\s\S]*?)<\/option>/g)) {
    // Option labels are double-escaped ("&lt;br class=...&gt;") and carry a line-break tag.
    const label = htmlToText(decodeEntities(m[2]!).replace(/<br\b[^>]*>/gi, " ")).replace(/\s+/g, " ").trim();
    options.push({ id: m[1]!, label, code: /\[([^\]]+)\]\s*$/.exec(label)?.[1] ?? null });
  }
  return options;
}

// ---------------------------------------------------------------------------
// Card blocks.

export type OfficialCardType = "leader" | "character" | "event" | "stage";

/** One printing as the site shows it, values normalized to the engine's vocabulary. */
export interface OfficialPrinting {
  /** Printing id: the card number plus "_p1" (parallel) or "_r1" (reprint) etc. */
  readonly printingId: string;
  /** Card number, e.g. "OP17-001". */
  readonly id: string;
  readonly rarity: string;
  readonly cardType: OfficialCardType;
  readonly name: string;
  /** Characters, Events, Stages. The site shows "-" for 0-cost Events; that is 0 here. */
  readonly cost: number | null;
  /** Leaders only. */
  readonly life: number | null;
  /** Leaders and Characters ("-" on a Character is 0). */
  readonly power: number | null;
  readonly counter: number | null;
  /** Lower case, as the engine: ["red", "green"]. */
  readonly colors: string[];
  /** The "Type" field split on "/". */
  readonly types: string[];
  /** Lower case: ["slash", "special"]; "?" is kept; [] for Events and Stages. */
  readonly attributes: string[];
  /** Effect text, "\n" between lines; "" when the card has none. */
  readonly effect: string;
  /** Trigger text including its "[Trigger]" label, or null. */
  readonly trigger: string | null;
  /** Block icon ("1".."5", "X"), or null when the site shows none. */
  readonly block: string | null;
  /** "Card Set(s)" line, e.g. "BOOSTER PACK -... - [OP-17]". */
  readonly cardSet: string | null;
  /** The series page it was read from. */
  readonly seriesId: string;
}

const CARD_TYPES: Readonly<Record<string, OfficialCardType>> = {
  LEADER: "leader",
  CHARACTER: "character",
  EVENT: "event",
  STAGE: "stage",
};

function numberOrNull(text: string | null): number | null {
  if (text === null) return null;
  const t = text.replace(/[,\s]/g, "");
  return /^[+-]?\d+$/.test(t) ? Number(t) : null;
}

/**
 * Every printing on a card list page. Blocks that cannot be read (an unknown
 * card type, a missing name) are skipped and returned in `skipped` so the
 * caller can report them instead of silently losing cards.
 */
export function parseCardListHtml(html: string, seriesId = ""): { printings: OfficialPrinting[]; skipped: string[] } {
  const printings: OfficialPrinting[] = [];
  const skipped: string[] = [];
  for (const m of html.matchAll(/<dl class="modalCol" id="([^"]+)">([\s\S]*?)<\/dl>/g)) {
    const printingId = decodeEntities(m[1]!);
    const block = m[2]!;
    const info = field(block, "infoCol");
    const spans = info === null ? [] : [...info.matchAll(/<span>([\s\S]*?)<\/span>/g)].map((s) => htmlToText(s[1]!));
    const [id, rarity, typeLabel] = spans;
    const cardType = typeLabel ? CARD_TYPES[typeLabel.toUpperCase()] : undefined;
    const nameHtml = field(block, "cardName");
    if (!id || !rarity || !cardType || nameHtml === null) {
      skipped.push(printingId);
      continue;
    }
    // The "cost" box is headed "Life" on Leaders.
    const costBox = field(block, "cost") ?? "";
    const costHeading = /<h3>([\s\S]*?)<\/h3>/.exec(costBox)?.[1]?.trim().toLowerCase() ?? "";
    const costValue = fieldText(block, "cost");
    const isLife = costHeading === "life" || cardType === "leader";
    let cost = isLife ? null : numberOrNull(costValue);
    if (!isLife && cost === null && costValue === "-") cost = 0;
    // Likewise "-" is the site's 0 power for Characters (Makino, Kaya...):
    // every Character has a power value, Events and Stages have none.
    const powerValue = fieldText(block, "power");
    let power = numberOrNull(powerValue);
    if (power === null && powerValue === "-" && cardType === "character") power = 0;
    const attributeBox = /<div class="attribute">([\s\S]*?)<\/div>/.exec(block)?.[1] ?? "";
    const attributeText = /<i>([\s\S]*?)<\/i>/.exec(attributeBox)?.[1] ?? /alt="([^"]*)"/.exec(attributeBox)?.[1] ?? "";
    const effect = fieldText(block, "text") ?? "";
    const trigger = fieldText(block, "trigger");
    const split = (text: string | null, sep: RegExp) =>
      text === null || text === "-" || text === "" ? [] : text.split(sep).map((s) => s.trim()).filter(Boolean);
    const block_ = fieldText(block, "block");
    printings.push({
      printingId,
      id,
      rarity,
      cardType,
      name: htmlToText(nameHtml),
      cost,
      life: isLife ? numberOrNull(costValue) : null,
      power,
      counter: numberOrNull(fieldText(block, "counter")),
      colors: split(fieldText(block, "color"), /\//).map((c) => c.toLowerCase()),
      types: split(fieldText(block, "feature"), /\//),
      attributes: split(htmlToText(attributeText), /\//).map((a) => a.toLowerCase()),
      effect: effect === "-" ? "" : effect,
      trigger: trigger === null || trigger === "" || trigger === "-" ? null : trigger,
      block: block_ === null || block_ === "-" || block_ === "" ? null : block_,
      cardSet: fieldText(block, "getInfo"),
      seriesId,
    });
  }
  return { printings, skipped };
}

// ---------------------------------------------------------------------------
// Printings -> cards.

/** A card number with the data of its reference printing. */
export interface OfficialCard extends Omit<OfficialPrinting, "printingId" | "cardSet" | "seriesId" | "rarity"> {
  /** Rarity of the reference printing. */
  readonly rarity: string;
  /** The reference printing and the series page it was read from (for evidence links). */
  readonly refPrinting: string;
  readonly refSeries: string;
  /** Every printing id of the number, sorted. */
  readonly printings: string[];
  readonly sets: string[];
  readonly series: string[];
  /**
   * Gameplay fields whose value differs between printings of the number
   * (errors of the site itself). The block icon is left out: the EN list is
   * known to mislabel it on some printings (see legality.ts).
   */
  readonly inconsistent: string[];
}

const COMPARED_PRINTING_FIELDS = [
  "name",
  "cardType",
  "cost",
  "life",
  "power",
  "counter",
  "colors",
  "types",
  "attributes",
  "effect",
  "trigger",
] as const satisfies ReadonlyArray<keyof OfficialPrinting>;

/**
 * Groups printings by card number. The base printing (id == number) is the
 * reference; a number known only through parallels or reprints uses the
 * first of them in id order.
 */
export function mergePrintings(printings: readonly OfficialPrinting[]): Map<string, OfficialCard> {
  const byId = new Map<string, OfficialPrinting[]>();
  for (const p of printings) {
    const list = byId.get(p.id);
    if (list) list.push(p);
    else byId.set(p.id, [p]);
  }
  const cards = new Map<string, OfficialCard>();
  for (const id of [...byId.keys()].sort()) {
    const list = byId.get(id)!.slice().sort((a, b) => a.printingId.localeCompare(b.printingId));
    const ref = list.find((p) => p.printingId === id) ?? list[0]!;
    // Text is compared after normalization: printings differ in punctuation
    // (fullwidth minus, line breaks) far more often than in wording.
    const key = (p: OfficialPrinting, f: (typeof COMPARED_PRINTING_FIELDS)[number]) =>
      f === "effect" || f === "trigger" ? textTokens(p[f] ?? "").join(" ") : JSON.stringify(p[f]);
    const inconsistent = COMPARED_PRINTING_FIELDS.filter((f) => list.some((p) => key(p, f) !== key(ref, f)));
    const { printingId, cardSet: _c, seriesId, ...data } = ref;
    cards.set(id, {
      ...data,
      refPrinting: printingId,
      refSeries: seriesId,
      printings: [...new Set(list.map((p) => p.printingId))].sort(),
      sets: [...new Set(list.map((p) => p.cardSet).filter((s): s is string => s !== null))].sort(),
      series: [...new Set(list.map((p) => p.seriesId))].sort(),
      inconsistent,
    });
  }
  return cards;
}

// ---------------------------------------------------------------------------
// Errors of the official list itself.

export interface SiteCorrection {
  readonly id: string;
  /** `effect`: official errata the card list page has not taken in. */
  readonly field: "name" | "attributes" | "effect";
  /** What the card list page shows. */
  readonly shown: string | readonly string[];
  /** What the printed card says (for `effect`, the text after the errata). */
  readonly printed: string | readonly string[];
}

/**
 * Values the card list pages get wrong, checked against the card images the
 * same site serves (https://en.onepiece-cardgame.com/images/cardlist/card/<id>.png)
 * on 2026-10-05. Applied before comparing, so they are neither reported as
 * engine errors nor "fixed" into the engine. A correction whose `shown` value
 * no longer matches the page is skipped: the site has fixed it.
 */
export const SITE_CORRECTIONS: readonly SiteCorrection[] = [
  // OP-06 Ranged characters listed as Slash; the cards print the Ranged icon.
  { id: "OP06-004", field: "attributes", shown: ["slash"], printed: ["ranged"] },
  { id: "OP06-032", field: "attributes", shown: ["slash"], printed: ["ranged"] },
  { id: "OP06-105", field: "attributes", shown: ["slash"], printed: ["ranged"] },
  // The page writes "Kozuki"; the card (and every other Kouzuki) prints "Kouzuki".
  { id: "EB04-014", field: "name", shown: "Kozuki Sukiyaki", printed: "Kouzuki Sukiyaki" },
  // Official errata (https://en.onepiece-cardgame.com/rules/errata_card/, read
  // 2026-10-05) that the card list pages still show unfixed. The engine
  // already plays the corrected text.
  {
    // Errata of 2023-07-14: "rest up to 1" became "rest 1".
    id: "OP05-032",
    field: "effect",
    shown:
      "[End of Your Turn] ①: Set this Character as active.\n[Once Per Turn] If this Character would be K.O.'d, you may rest up to 1 of your Characters with a cost of 3 or more other than [Pica] instead.",
    printed:
      "[End of Your Turn] ①: Set this Character as active.\n[Once Per Turn] If this Character would be K.O.'d, you may rest 1 of your Characters with a cost of 3 or more other than [Pica] instead.",
  },
  {
    // Errata of 2024-12-13: the opponent chooses the Character to return.
    id: "OP09-058",
    field: "effect",
    shown: "[Main] Return up to 1 of your opponent's Characters with a cost of 6 or less to the owner's hand.",
    printed:
      "[Main] Your opponent chooses 1 of their Character with a cost of 6 or less and return to the owner's hand.",
  },
];

/** `cards` with the corrections that still apply; returns which were applied. */
export function applySiteCorrections(
  cards: Map<string, OfficialCard>,
  corrections: readonly SiteCorrection[] = SITE_CORRECTIONS,
): SiteCorrection[] {
  const applied: SiteCorrection[] = [];
  for (const c of corrections) {
    const card = cards.get(c.id);
    if (!card || JSON.stringify(card[c.field]) !== JSON.stringify(c.shown)) continue;
    cards.set(
      c.id,
      c.field === "attributes"
        ? { ...card, attributes: [...c.printed] }
        : { ...card, [c.field]: String(c.printed) },
    );
    applied.push(c);
  }
  return applied;
}

// ---------------------------------------------------------------------------
// Text normalization.

/**
 * One spelling for punctuation the two sources write differently: the site
 * mixes "−" (minus), "－" (fullwidth) and "-", curly and straight quotes,
 * and fullwidth "＜Strike＞"; the engine's text came from another source.
 */
export function canonicalText(text: string): string {
  return (
    text
      // Circled numbers are rest-DON!! costs ("③"); the engine writes "(3)".
      // NFKC would map some of them to bare digits and leave others alone.
      .replace(/[\u2460-\u2473]/g, (c) => `(${c.charCodeAt(0) - 0x2460 + 1})`)
      .replace(/[\u2776-\u277f]/g, (c) => `(${c.charCodeAt(0) - 0x2776 + 1})`)
      .replace(/[\u2780-\u2789]/g, (c) => `(${c.charCodeAt(0) - 0x2780 + 1})`)
      .replace(/[\u278a-\u2793]/g, (c) => `(${c.charCodeAt(0) - 0x278a + 1})`)
      .normalize("NFKC")
      .replace(/[\u2018\u2019\u201b\u2032`\u00b4]/g, "'")
      .replace(/[\u201c\u201d\u201f\u2033]/g, '"')
      .replace(/[\u2212\u2010-\u2015\ufe63\uff0d]/g, "-")
      .replace(/\u00d7/g, "x")
      .replace(/\u2026/g, "...")
      // The engine's text writes "(Special)" where the card prints <Special>;
      // left as is, it would be dropped as reminder text.
      .replace(/\((strike|slash|special|wisdom|ranged)\)/gi, "<$1>")
  );
}

/**
 * Removes "(...)" reminder text, innermost first. Only parentheses with
 * words: "(3)" is a rest-DON!! cost, not a reminder.
 */
export function stripReminders(text: string): string {
  let out = text;
  for (let prev = ""; prev !== out; ) {
    prev = out;
    out = out.replace(/\s*\([^()]*[A-Za-z][^()]*\)/g, "");
  }
  return out;
}

/**
 * Comparison tokens: lower-case words and signed numbers, reminder text and
 * punctuation dropped. "[Activate:Main]" and "[Activate: Main]", "{Navy}" and
 * "[Navy]" give the same tokens; "+4000" and "-4000" do not.
 */
export function textTokens(text: string): string[] {
  const tokens = stripReminders(canonicalText(text)).toLowerCase().match(/[+-]\d+|[a-z0-9]+/g) ?? [];
  return tokens.map((t, i) => {
    // "DON!! −2" is a cost that is always negative; the engine's text lost the
    // sign in many cards ("DON!! 2:") without any effect on play.
    if (i > 0 && tokens[i - 1] === "don" && /^\d+$/.test(t)) return `-${t}`;
    // Old wording "Draw a card." is today's "Draw 1 card.".
    if (t === "a" && tokens[i - 1] === "draw" && tokens[i + 1] === "card") return "1";
    return t;
  });
}

// ---------------------------------------------------------------------------
// Ability structure of the official text.

/** Printed timing labels and the engine trigger that implements each. */
export const TIMING_LABELS: Readonly<Record<string, string>> = {
  "on play": "onPlay",
  "when attacking": "whenAttacking",
  "on k.o.": "onKo",
  "activate: main": "activateMain",
  "activate:main": "activateMain",
  "on your opponent's attack": "onOpponentAttack",
  "end of your turn": "endOfYourTurn",
  "end of your opponent's turn": "endOfOpponentTurn",
  "start of your turn": "startOfYourTurn",
  "on block": "onBlock",
  counter: "counter",
  main: "main",
  trigger: "trigger",
};

/** Keyword labels and the engine keyword. */
export const KEYWORD_LABELS: Readonly<Record<string, string>> = {
  blocker: "blocker",
  rush: "rush",
  "rush: character": "rushCharacter",
  "double attack": "doubleAttack",
  banish: "banish",
  unblockable: "unblockable",
};

/** Labels that only condition an ability: "[DON!! x1]", "[Your Turn]", ... */
const CONDITION_LABEL = /^(?:don!! ?x\d+|your turn|opponent's turn|once per turn)$/;

/**
 * Unlabeled triggered abilities: "When this Character is K.O.'d ...",
 * "This effect can be activated when ...", "Draw 1 card when ...", and
 * event conditions such as "If a Character is rested by your effect, ...".
 * A static ability describes a state and never names an event like these.
 */
const AUTO_ABILITY =
  /\b(?:when|whenever)\b|this effect can be activated|^at the (?:start|end) of|\bif (?:a|an|your|one of your|your opponent's) [^,]*?\b(?:is|are) (?:rested|k\.o\.'d|removed|played|trashed|returned|given|added)\b/i;

export type AbilityKind = "timed" | "keyword" | "static" | "replacement" | "auto" | "alias";

export interface Ability {
  readonly kind: AbilityKind;
  /** Engine triggers of the timing labels ("timed" only). */
  readonly timings: string[];
  /** Engine keywords of the keyword labels. */
  readonly keywords: string[];
  /** The ability's text, reminder text removed. */
  readonly text: string;
}

/**
 * Splits printed card text into abilities. The site often runs abilities
 * together without a line break ("...Characters.[On Your Opponent's
 * Attack]..."), so a "[" right after a sentence end also starts an ability;
 * bullet lines ("• ...", "- ...") continue the previous one.
 */
export function splitAbilities(text: string): string[] {
  const lines = canonicalText(text)
    .replace(/([.)])[ \t]*(?=\[)/g, "$1\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const abilities: string[] = [];
  for (const line of lines) {
    // Bullets, reminders and "Then, ..." sentences belong to the ability above.
    const continues = abilities.length > 0 && (/^(?:[\u2022\u30fb*]|-\s|\()/.test(line) || /^then\b/i.test(line) || /^[a-z]/.test(line));
    if (continues) abilities[abilities.length - 1] += `\n${line}`;
    else abilities.push(line);
  }
  return abilities;
}

/**
 * Classifies each ability of printed text:
 *  - "timed": starts with timing labels ([On Play], [When Attacking], ...);
 *  - "keyword": only keyword labels ([Blocker]);
 *  - "alias": "also treat this card's name as [X]";
 *  - "auto": an unlabeled triggered ability ("When this Character is K.O.'d...");
 *  - "replacement": an unlabeled "If ... would ..., ... instead";
 *  - "static": any other unlabeled text, conditions such as [DON!! x1] or
 *    [Your Turn] allowed ("This Character gains +1000 power").
 */
export function analyzeAbilities(text: string): Ability[] {
  const out: Ability[] = [];
  for (const raw of splitAbilities(text)) {
    const ability = stripReminders(raw).trim();
    if (ability === "") continue;
    const lead = /^(?:\[[^\]]+\]\s*\/?\s*)+/.exec(ability);
    const labels = lead ? [...lead[0].matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]!.trim().toLowerCase()) : [];
    const rest = (lead ? ability.slice(lead[0].length) : ability).trim();
    const timings = labels.map((l) => TIMING_LABELS[l]).filter((t): t is string => t !== undefined);
    const keywords = labels.map((l) => KEYWORD_LABELS[l]).filter((k): k is string => k !== undefined);
    const conditional = labels.some((l) => CONDITION_LABEL.test(l));
    let kind: AbilityKind;
    if (timings.length > 0) kind = "timed";
    else if (/^[.,:;\s]*$/.test(rest)) {
      if (keywords.length === 0) continue; // a bare unknown or condition-only label
      kind = conditional ? "static" : "keyword";
    } else if (/treat this card's name as/i.test(rest)) kind = "alias";
    else if (/\bwould\b[\s\S]*\binstead\b/i.test(rest)) kind = "replacement";
    else if (AUTO_ABILITY.test(rest)) kind = "auto";
    else kind = "static";
    out.push({ kind, timings, keywords, text: ability });
  }
  return out;
}

/** Names from "also treat this card's name as [A] and [B]". */
export function printedAliases(text: string): string[] {
  const m = /treat this card's name as ((?:\[[^\]]+\](?:\s*(?:,|and|or)\s*)?)+)/i.exec(canonicalText(text));
  return m ? [...m[1]!.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1]!.trim()) : [];
}

// ---------------------------------------------------------------------------
// Token diff, to show what differs between two texts.

export interface TextDiff {
  /** 2·LCS / (|a| + |b|): 1 = same tokens. */
  readonly similarity: number;
  /** Changed stretches: tokens only in `a` / only in `b`, in text order. */
  readonly changes: ReadonlyArray<{ readonly a: string; readonly b: string }>;
}

export function diffTokens(a: readonly string[], b: readonly string[]): TextDiff {
  const n = a.length;
  const m = b.length;
  if (n + m === 0) return { similarity: 1, changes: [] };
  // lcs[i][j] = LCS of a[i..] and b[j..], one flat array.
  const w = m + 1;
  const lcs = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] = a[i] === b[j] ? lcs[(i + 1) * w + j + 1]! + 1 : Math.max(lcs[(i + 1) * w + j]!, lcs[i * w + j + 1]!);
    }
  }
  const changes: Array<{ a: string; b: string }> = [];
  let onlyA: string[] = [];
  let onlyB: string[] = [];
  const flush = () => {
    if (onlyA.length || onlyB.length) changes.push({ a: onlyA.join(" "), b: onlyB.join(" ") });
    onlyA = [];
    onlyB = [];
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush();
      i++;
      j++;
    } else if (j >= m || (i < n && lcs[(i + 1) * w + j]! >= lcs[i * w + j + 1]!)) onlyA.push(a[i++]!);
    else onlyB.push(b[j++]!);
  }
  flush();
  return { similarity: (2 * lcs[0]!) / (n + m), changes };
}

// ---------------------------------------------------------------------------
// Engine vs official.

/** The fields of an engine card definition this check reads (the engine's OPCard fits). */
export interface EngineCardData {
  readonly id: string;
  readonly name: string;
  readonly cardType: string;
  readonly color: readonly string[];
  readonly traits?: readonly string[];
  readonly attribute?: string | readonly string[];
  readonly alternateNames?: readonly string[];
  readonly cost?: number;
  readonly life?: number;
  readonly power?: number;
  readonly counter?: number;
  readonly trigger?: string;
  readonly effect?: string;
  readonly effects?: {
    readonly keywords?: readonly string[];
    readonly effects?: ReadonlyArray<{ readonly trigger: string }>;
    readonly permanentEffects?: readonly unknown[];
    readonly replacementEffects?: readonly unknown[];
    readonly deckBuildingRules?: readonly unknown[];
  };
}

export interface CategoryInfo {
  /** One line, Spanish (the report is user documentation). */
  readonly label: string;
  /** "data": a printed value differs. "structure": text with no executable block. "text": wording. */
  readonly group: "data" | "structure" | "text" | "info";
}

/** Report order. Structure categories for timings not listed here use "structure:<trigger>". */
export const CATEGORIES: Readonly<Record<string, CategoryInfo>> = {
  "not-in-official": { group: "info", label: "Número de carta que no está en la lista oficial EN" },
  name: { group: "data", label: "Nombre distinto" },
  "card-type": { group: "data", label: "Tipo de carta distinto (Líder/Personaje/Evento/Escenario)" },
  cost: { group: "data", label: "Coste distinto" },
  life: { group: "data", label: "Vidas del Líder distintas" },
  power: { group: "data", label: "Poder distinto" },
  counter: { group: "data", label: "Counter distinto" },
  colors: { group: "data", label: "Colores distintos" },
  attribute: { group: "data", label: "Atributo distinto" },
  "types-joined": { group: "data", label: "Varios tipos guardados como una sola cadena (los filtros {Tipo} exactos fallan)" },
  types: { group: "data", label: "Otros tipos distintos" },
  trigger: { group: "data", label: "[Trigger] presente solo en uno de los dos (campo `trigger` o bloque)" },
  alias: { group: "data", label: "Falta un nombre alternativo impreso (\"also treat this card's name as\")" },
  "structure:keyword": { group: "structure", label: "Palabra clave impresa ([Blocker], [Rush]...) que no está en `keywords`" },
  "structure:counter": { group: "structure", label: "[Counter] impreso sin bloque `counter`" },
  "structure:trigger": { group: "structure", label: "[Trigger] impreso sin bloque `trigger` (no hace nada al revelarse)" },
  "structure:onPlay": { group: "structure", label: "[On Play] sin bloque `onPlay`" },
  "structure:whenAttacking": { group: "structure", label: "[When Attacking] sin bloque `whenAttacking`" },
  "structure:onKo": { group: "structure", label: "[On K.O.] sin bloque `onKo`" },
  "structure:activateMain": { group: "structure", label: "[Activate: Main] sin bloque `activateMain`" },
  "structure:onOpponentAttack": { group: "structure", label: "[On Your Opponent's Attack] sin bloque `onOpponentAttack`" },
  "structure:endOfYourTurn": { group: "structure", label: "[End of Your Turn] sin bloque `endOfYourTurn`" },
  "structure:onBlock": { group: "structure", label: "[On Block] sin bloque `onBlock`" },
  "structure:main": { group: "structure", label: "[Main] de Evento sin bloque `main`" },
  "structure:static": { group: "structure", label: "Efecto estático impreso sin `permanentEffects`/`replacementEffects`/`deckBuildingRules`" },
  "structure:replacement": { group: "structure", label: "Sustitución impresa (\"would ... instead\") sin `replacementEffects`" },
  "structure:auto": { group: "structure", label: "Habilidad \"When ...\" sin etiqueta y sin ningún bloque que la cubra" },
  "structure:sign": { group: "structure", label: "Número impreso negativo (\u22123000) que el bloque guarda en positivo: la carta hace lo contrario" },
  "trait-match": { group: "structure", label: "Filtro de tipo que no sigue al texto: {Tipo} es exacto, tipo que incluya \"X\" es subcadena (2-4-3)" },
  "trait-unprinted": { group: "info", label: "Filtro de tipo cuyo valor no aparece como {Tipo} ni como tipo que incluya \"X\" en el texto" },
  "effect-text": { group: "text", label: "Texto de `.effect` materialmente distinto del oficial (errata o importación)" },
  "effect-text-missing": { group: "info", label: "Sin texto en `.effect` aunque la carta tiene efecto (los bloques pueden estar bien)" },
};

export function categoryInfo(category: string): CategoryInfo {
  return CATEGORIES[category] ?? { group: "structure", label: `${category.replace("structure:", "[")}] sin bloque` };
}

export interface Mismatch {
  readonly id: string;
  /** Official name when known, else the engine's. */
  readonly name: string;
  readonly category: string;
  readonly engine: unknown;
  readonly official: unknown;
  readonly detail?: string;
}

const sortedSet = (xs: readonly string[]) => [...new Set(xs)].sort();
const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

function attributeList(attribute: string | readonly string[] | undefined): string[] {
  if (attribute === undefined) return [];
  return typeof attribute === "string" ? [attribute] : [...attribute];
}

/**
 * Whether `traits` are the official `types` glued together with spaces, as
 * the importer did ("Kid Pirates Supernovas" for {Supernovas}/{Kid Pirates}):
 * every trait is a concatenation of official types in any order, and all
 * official types are used exactly once. At least one trait must be joined.
 */
export function isJoinedTypes(traits: readonly string[], types: readonly string[]): boolean {
  if (traits.length >= types.length) return false;
  const used = new Array<boolean>(types.length).fill(false);
  const cover = (rest: string): boolean => {
    if (rest === "") return true;
    for (let i = 0; i < types.length; i++) {
      const t = types[i]!;
      if (used[i] || !(rest === t || rest.startsWith(`${t} `))) continue;
      used[i] = true;
      if (cover(rest.slice(t.length).trimStart())) return true;
      used[i] = false;
    }
    return false;
  };
  return traits.every((trait) => cover(trait)) && used.every(Boolean);
}

/** Text without its "[Trigger]" ability, and that ability (label included) or null. */
export function splitTrigger(text: string): { main: string; trigger: string | null } {
  const abilities = splitAbilities(text);
  const i = abilities.findIndex((a) => /^\[trigger\]/i.test(a));
  if (i < 0) return { main: abilities.join("\n"), trigger: null };
  return { main: abilities.filter((_, k) => k !== i).join("\n"), trigger: abilities[i]! };
}

/**
 * The engine's printed text, main part and [Trigger] apart. The importer
 * sometimes ran the trigger into `.effect` and left notes of its source in
 * it ("This card has been officially errata'd.", "Disclaimer: ..."), and
 * wrote "NULL" for vanilla cards.
 */
export function engineTexts(card: EngineCardData): { main: string; trigger: string | null } {
  const clean = (text: string) => {
    const t = text
      .replace(/\s*This card has been officially errata'd\.?/gi, "")
      .replace(/\s*Disclaimer:[^[]*/gi, "")
      .trim();
    return /^null$/i.test(t) ? "" : t;
  };
  const split = splitTrigger(clean(card.effect ?? ""));
  const field = card.trigger ? clean(card.trigger) : "";
  return { main: split.main, trigger: field ? `[Trigger] ${field}` : split.trigger };
}

/** The official text, main part and [Trigger] apart (a few cards print the trigger inside the effect box). */
export function officialTexts(card: OfficialCard): { main: string; trigger: string | null } {
  if (card.trigger !== null) return { main: canonicalText(card.effect), trigger: canonicalText(card.trigger) };
  return splitTrigger(card.effect);
}

/** Numeric tokens of a text, sorted, for the "numbers differ" test. */
const numbersOf = (tokens: readonly string[]) => tokens.filter((t) => /\d/.test(t)).sort();

/**
 * Words whose gain or loss changes what an ability does: zones, card kinds,
 * durations ("this turn" / "this battle"), attributes, comparisons, "up to".
 * Errata are often a single one of these ("type card" -> "type Character card").
 */
const SEMANTIC_WORDS = new Set([
  "turn", "battle", "leader", "character", "event", "stage", "cost", "power", "base", "life", "hand", "trash",
  "deck", "rested", "active", "opponent", "strike", "slash", "special", "wisdom", "ranged", "draw", "play",
  "top", "bottom", "blocker", "rush", "banish", "any", "all", "less", "more", "up",
]);

const semanticOf = (tokens: readonly string[]) =>
  tokens.map((t) => (t.length > 3 && t.endsWith("s") && SEMANTIC_WORDS.has(t.slice(0, -1)) ? t.slice(0, -1) : t)).filter((t) => SEMANTIC_WORDS.has(t)).sort();

/**
 * Whether the engine's text differs materially from the official one, and how.
 * Material: a number, a sign or a bracketed label differs, or the wording is
 * less than `minSimilarity` alike. Pure rewordings of the same ability
 * (optcgapi vs site punctuation) are not reported.
 */
export function compareEffectText(
  engineText: string,
  officialText: string,
  minSimilarity = EFFECT_TEXT_MIN_SIMILARITY,
): { material: boolean; similarity: number; detail: string } | null {
  const a = textTokens(engineText);
  const b = textTokens(officialText);
  if (sameList(a, b)) return null;
  const diff = diffTokens(a, b);
  const numbersDiffer = !sameList(numbersOf(a), numbersOf(b));
  const labelsA = sortedSet(analyzeAbilities(engineText).flatMap((x) => [...x.timings, ...x.keywords]));
  const labelsB = sortedSet(analyzeAbilities(officialText).flatMap((x) => [...x.timings, ...x.keywords]));
  const labelsDiffer = !sameList(labelsA, labelsB);
  // A one-word slip ("Draw 1 cards") drops the similarity of a short text a
  // lot; a rewording only counts when at least 3 tokens changed.
  const changed = diff.changes.reduce((n, c) => n + Math.max(c.a.split(" ").filter(Boolean).length, c.b.split(" ").filter(Boolean).length), 0);
  const reworded = diff.similarity < minSimilarity && changed >= 3;
  const semA = semanticOf(a);
  const semB = semanticOf(b);
  const wordsDiffer = !sameList(semA, semB);
  const material = numbersDiffer || labelsDiffer || reworded || wordsDiffer;
  const reasons = [
    numbersDiffer && "números",
    wordsDiffer && !reworded && "palabras clave",
    labelsDiffer && `etiquetas (motor ${labelsA.join(",") || "-"}; oficial ${labelsB.join(",") || "-"})`,
    reworded && `redacción (similitud ${diff.similarity.toFixed(2)})`,
  ].filter(Boolean);
  const shown = diff.changes
    .slice(0, 4)
    .map((c) => `motor «${c.a.slice(0, 80)}» → oficial «${c.b.slice(0, 80)}»`)
    .join("; ");
  return { material, similarity: diff.similarity, detail: `${reasons.join(", ") || "redacción"}: ${shown}` };
}

/** Below this token similarity a rewording counts as material. */
export const EFFECT_TEXT_MIN_SIMILARITY = 0.85;

/**
 * Magnitudes printed negative ("−3000 power") that the engine's text lost the
 * sign of AND that its structured effects hold only as positive numbers. The
 * importer dropped "−" from the text in many cards; usually the block is
 * right (-3000), but where the block has 3000 the card does the opposite of
 * what it says (it buffs the opponent's Character).
 */
export function flippedSigns(engineText: string, officialText: string, effects: EngineCardData["effects"]): number[] {
  // Bigrams "-3000 power" / "3000 power": the number must modify the same
  // thing in both texts, and only power and cost modifiers are considered.
  const bigrams = (text: string) => {
    const t = textTokens(text);
    return new Set(t.slice(0, -1).map((x, i) => `${x} ${t[i + 1]}`));
  };
  const engineBigrams = bigrams(engineText);
  const json = JSON.stringify(effects ?? {});
  const holds = (n: string) => new RegExp(`"(?:value|amount)":${n}[,}\\]]`).test(json);
  const out = new Set<number>();
  for (const b of bigrams(officialText)) {
    const m = /^-(\d+) (power|cost)$/.exec(b);
    if (!m) continue;
    const [, n, what] = m as unknown as [string, string, string];
    if (engineBigrams.has(b) || !engineBigrams.has(`${n} ${what}`)) continue;
    if (holds(n) && !holds(`-${n}`)) out.add(Number(n));
  }
  return [...out].sort((a, b) => a - b);
}

/** A type check inside a card's effects, with the matching the engine applies. */
export interface TraitCheck {
  readonly value: string;
  readonly mode: "exact" | "includes";
  readonly kind: "filter" | "leaderTrait";
}

/**
 * Every type check in a card's effects. The engine's defaults differ: a
 * `trait` filter matches exactly unless `match: "includes"`
 * (effects/targeting.ts), a `leaderTrait` condition matches a substring
 * unless `match: "exact"` (effects/conditions.ts).
 */
export function traitChecks(effects: unknown): TraitCheck[] {
  const out: TraitCheck[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (o.filter === "trait") {
      const values = Array.isArray(o.value) ? o.value : [o.value];
      for (const v of values) {
        if (typeof v === "string") out.push({ value: v, mode: o.match === "includes" ? "includes" : "exact", kind: "filter" });
      }
    }
    if (o.condition === "leaderTrait" && typeof o.trait === "string") {
      out.push({ value: o.trait, mode: o.match === "exact" ? "exact" : "includes", kind: "leaderTrait" });
    }
    for (const v of Object.values(o)) walk(v);
  };
  walk(effects);
  return out;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * How the printed text refers to a type (2-4-3): "{Type}" is that exact type,
 * 'a type including "X"' is any type containing X. `null` when the text uses
 * neither form for this value, "both" when it uses both.
 */
export function printedTypeMode(text: string, value: string): "exact" | "includes" | "both" | null {
  const t = canonicalText(text);
  const v = canonicalText(value);
  const exact = t.includes(`{${v}}`);
  const includes = new RegExp(`includ\\w* "${escapeRegExp(v)}"`).test(t);
  return exact && includes ? "both" : exact ? "exact" : includes ? "includes" : null;
}

/** Every disagreement between one engine card and its official data. */
export function compareCard(engine: EngineCardData, official: OfficialCard): Mismatch[] {
  const out: Mismatch[] = [];
  const add = (category: string, engineValue: unknown, officialValue: unknown, detail?: string) =>
    out.push({ id: engine.id, name: official.name, category, engine: engineValue, official: officialValue, ...(detail && { detail }) });

  if (canonicalText(engine.name).trim() !== canonicalText(official.name).trim()) add("name", engine.name, official.name);
  if (engine.cardType !== official.cardType) add("card-type", engine.cardType, official.cardType);
  if (official.cardType === "leader") {
    if ((engine.life ?? null) !== official.life) add("life", engine.life ?? null, official.life);
  } else if ((engine.cost ?? null) !== official.cost) add("cost", engine.cost ?? null, official.cost);
  if ((engine.power ?? null) !== official.power) add("power", engine.power ?? null, official.power);
  if ((engine.counter ?? null) !== official.counter) add("counter", engine.counter ?? null, official.counter);
  if (!sameList(sortedSet(engine.color), sortedSet(official.colors))) add("colors", engine.color, official.colors);
  const engineAttributes = attributeList(engine.attribute);
  if (!sameList(sortedSet(engineAttributes), sortedSet(official.attributes))) add("attribute", engine.attribute ?? null, official.attributes);

  const traits = (engine.traits ?? []).map((t) => canonicalText(t).trim());
  const types = official.types.map((t) => canonicalText(t).trim());
  if (!sameList(sortedSet(traits), sortedSet(types))) {
    add(isJoinedTypes(traits, types) ? "types-joined" : "types", engine.traits ?? [], official.types);
  }

  const blocks = new Set((engine.effects?.effects ?? []).map((e) => e.trigger));
  const officialText = officialTexts(official);
  const engineText = engineTexts(engine);
  // The engine treats a card as having a [Trigger] when it has the `trigger`
  // field or a "trigger" block (battle.ts, targeting.ts), not by its text.
  const engineHasTrigger = Boolean(engine.trigger) || blocks.has("trigger");
  if (engineHasTrigger !== (officialText.trigger !== null)) {
    add("trigger", engine.trigger ?? (blocks.has("trigger") ? "(solo bloque)" : null), officialText.trigger);
  }
  if (officialText.trigger !== null && !blocks.has("trigger")) add("structure:trigger", [...blocks].sort(), officialText.trigger);

  const abilities = analyzeAbilities(officialText.main);
  const keywords = new Set(engine.effects?.keywords ?? []);
  const permanent = engine.effects?.permanentEffects?.length ?? 0;
  const replacement = engine.effects?.replacementEffects?.length ?? 0;
  const deckRules = engine.effects?.deckBuildingRules?.length ?? 0;
  const printedTimings = new Set<string>();
  for (const ability of abilities) {
    if (ability.kind !== "timed") continue;
    for (const t of ability.timings) {
      if (printedTimings.has(t)) continue;
      printedTimings.add(t);
      if (!blocks.has(t)) add(`structure:${t}`, [...blocks].sort(), ability.text);
    }
  }
  for (const ability of abilities.filter((a) => a.kind === "keyword")) {
    const missing = ability.keywords.filter((k) => !keywords.has(k));
    if (missing.length > 0) add("structure:keyword", [...keywords].sort(), missing);
  }
  const aliases = abilities.filter((a) => a.kind === "alias").flatMap((a) => printedAliases(a.text));
  const missingAliases = aliases.filter((n) => !(engine.alternateNames ?? []).some((x) => canonicalText(x) === canonicalText(n)));
  if (missingAliases.length > 0) add("alias", engine.alternateNames ?? [], aliases);
  const statics = abilities.filter((a) => a.kind === "static");
  if (statics.length > 0 && permanent + replacement + deckRules === 0) {
    add("structure:static", null, statics.map((a) => a.text).join(" | "));
  }
  const replacements = abilities.filter((a) => a.kind === "replacement");
  if (replacements.length > 0 && replacement === 0) {
    add("structure:replacement", permanent > 0 ? `${permanent} permanentEffects` : null, replacements.map((a) => a.text).join(" | "));
  }
  // An unlabeled "When ..." ability needs some block beyond the labeled
  // ones (its trigger varies: whenCharacterKod, whenDonReturned, ...).
  const autos = abilities.filter((a) => a.kind === "auto");
  const unlabeledBlocks = [...blocks].filter((t) => !printedTimings.has(t) && t !== "trigger");
  if (autos.length > 0 && unlabeledBlocks.length === 0 && replacement === 0 && permanent === 0) {
    add("structure:auto", [...blocks].sort(), autos.map((a) => a.text).join(" | "));
  }

  const flipped = flippedSigns(
    `${engineText.main}\n${engineText.trigger ?? ""}`,
    `${officialText.main}\n${officialText.trigger ?? ""}`,
    engine.effects,
  );
  if (flipped.length > 0) add("structure:sign", flipped.map((n) => `${n}`), flipped.map((n) => `-${n}`));

  // Type checks must follow the printed form: the importer wrote substring
  // matches for every "{Type}", so {Straw Hat Crew} also took "Fake Straw Hat
  // Crew" and {Big Mom Pirates} took "Former Big Mom Pirates".
  const printed = `${officialText.main}\n${officialText.trigger ?? ""}`;
  const seenChecks = new Set<string>();
  for (const check of traitChecks(engine.effects)) {
    const key = `${check.kind}:${check.value}:${check.mode}`;
    if (seenChecks.has(key)) continue;
    seenChecks.add(key);
    const expected = printedTypeMode(printed, check.value);
    if (expected === null) add("trait-unprinted", `${check.kind} ${check.mode} "${check.value}"`, null);
    else if (expected !== "both" && expected !== check.mode) {
      add("trait-match", `${check.kind} ${check.mode} "${check.value}"`, `${expected} "${check.value}"`);
    }
  }

  if (engineText.main === "" && officialText.main !== "") {
    add("effect-text-missing", engine.effect ?? null, officialText.main);
  } else {
    const main = compareEffectText(engineText.main, officialText.main);
    if (main?.material) add("effect-text", engineText.main, officialText.main, main.detail);
  }
  if (engineText.trigger !== null && officialText.trigger !== null) {
    const trigger = compareEffectText(engineText.trigger, officialText.trigger);
    if (trigger?.material) add("effect-text", engineText.trigger, officialText.trigger, `[Trigger] ${trigger.detail}`);
  }
  return out;
}

/** Compares every engine card (DON!! excluded) with the official list. */
export function compareCatalog(
  engineCards: readonly EngineCardData[],
  official: ReadonlyMap<string, OfficialCard>,
): Mismatch[] {
  const out: Mismatch[] = [];
  for (const card of engineCards) {
    if (card.cardType === "don") continue;
    const ref = official.get(card.id);
    if (!ref) {
      out.push({ id: card.id, name: card.name, category: "not-in-official", engine: card.name, official: null });
      continue;
    }
    out.push(...compareCard(card, ref));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mechanical data fixes.

/**
 * The categories whose fix is a plain value copy from the official list and
 * therefore safe to apply mechanically. Other data categories (cost, power,
 * colors, other type differences) are emitted too, marked `safe: false`, to
 * be checked by hand first.
 */
export const SAFE_FIX_CATEGORIES: ReadonlySet<string> = new Set(["counter", "attribute", "name", "types-joined", "trigger"]);
const VALUE_FIX_CATEGORIES: ReadonlySet<string> = new Set([...SAFE_FIX_CATEGORIES, "cost", "life", "power", "colors", "types"]);

export interface DataFix {
  readonly id: string;
  /** The mismatch category the fix resolves. */
  readonly category: string;
  /** Card definition file relative to the repository root, or "" when not found. */
  readonly file: string;
  /** Property path inside the exported card object (`i18n.en.name` lives in the .i18n.ts file). */
  readonly field: string;
  readonly old: unknown;
  /** New value; null means "delete the property". */
  readonly new: unknown;
  /** The official value and the page that shows it. */
  readonly evidence: string;
  readonly safe: boolean;
  /**
   * The data fix alone changes behaviour wrongly unless the card also gets an
   * executable block of this trigger (a [Trigger] field without a "trigger" block).
   */
  readonly needsBlock?: string;
  /** What else must change for the fix to be correct, if anything. */
  readonly caveat?: string;
}

/** Where a card is defined: its .ts file and its .i18n.ts file, repository-relative. */
export type CardFileLookup = (id: string) => { readonly card: string; readonly i18n: string } | null;

/** Engine cards whose structured effects name `name` as a value (filters, conditions). */
export function cardsReferencingName(name: string, engineCards: readonly EngineCardData[]): string[] {
  const needle = JSON.stringify(name);
  return engineCards
    .filter((c) => JSON.stringify(c.effects ?? {}).includes(needle) || (c.alternateNames ?? []).includes(name))
    .map((c) => c.id);
}

/**
 * One fix per value mismatch (two for a name: the card and its i18n file).
 * Only "trigger" mismatches where the official card has a [Trigger] and the
 * engine has none are fixable as data; the reverse needs a human.
 */
export function deriveFixes(
  mismatches: readonly Mismatch[],
  official: ReadonlyMap<string, OfficialCard>,
  engineCards: readonly EngineCardData[],
  fileOf: CardFileLookup,
): DataFix[] {
  const byId = new Map(engineCards.map((c) => [c.id, c]));
  const fixes: DataFix[] = [];
  for (const m of mismatches) {
    if (!VALUE_FIX_CATEGORIES.has(m.category)) continue;
    const ref = official.get(m.id);
    const engine = byId.get(m.id);
    if (!ref || !engine) continue;
    const files = fileOf(m.id);
    const evidence = (label: string, value: unknown) =>
      `official ${label} ${JSON.stringify(value ?? "-")} at ${OFFICIAL_CARDLIST_URL}?series=${ref.refSeries} (${ref.refPrinting})`;
    const fix = (field: string, old: unknown, value: unknown, label: string, extra: Partial<DataFix> = {}) =>
      fixes.push({
        id: m.id,
        category: m.category,
        file: files?.card ?? "",
        field,
        old: old ?? null,
        new: value,
        evidence: evidence(label, value),
        safe: SAFE_FIX_CATEGORIES.has(m.category),
        ...extra,
      });
    switch (m.category) {
      case "counter":
        fix("counter", engine.counter, ref.counter, "Counter");
        break;
      case "attribute":
        fix("attribute", engine.attribute, ref.attributes.length > 1 ? ref.attributes : (ref.attributes[0] ?? null), "Attribute");
        break;
      case "name": {
        const users = cardsReferencingName(engine.name, engineCards).filter((id) => id !== m.id);
        const already = cardsReferencingName(ref.name, engineCards).filter((id) => id !== m.id);
        const caveat = [
          users.length > 0 && `structured effects of ${users.join(", ")} name "${engine.name}"; rename them in the same patch`,
          already.length > 0 && `${already.join(", ")} already look for "${ref.name}" (fixed by this rename)`,
        ]
          .filter(Boolean)
          .join("; ");
        fix("name", engine.name, ref.name, "Name", caveat ? { caveat } : {});
        fix("i18n.en.name", engine.name, ref.name, "Name", { file: files?.i18n ?? "" });
        break;
      }
      case "types-joined":
      case "types":
        fix("traits", engine.traits ?? [], ref.types, "Type");
        break;
      case "trigger": {
        const printed = officialTexts(ref).trigger;
        if (printed === null || engine.trigger) break;
        const hasBlock = (engine.effects?.effects ?? []).some((e) => e.trigger === "trigger");
        fix("trigger", null, printed.replace(/^\[Trigger\]\s*/i, ""), "Trigger", {
          ...(!hasBlock && {
            needsBlock: "trigger",
            caveat:
              "add an executable `trigger` effect block in the same patch: with the field and no block, a revealed Life card prompts for a [Trigger] that does nothing (and the card is lost if the player activates it)",
          }),
        });
        break;
      }
      case "cost":
        fix("cost", engine.cost, ref.cost, "Cost");
        break;
      case "life":
        fix("life", engine.life, ref.life, "Life");
        break;
      case "power":
        fix("power", engine.power, ref.power, "Power");
        break;
      case "colors":
        fix("color", engine.color, ref.colors, "Color");
        break;
    }
  }
  return fixes;
}

// ---------------------------------------------------------------------------
// Report.

export type Priority = "meta" | "standard" | "other";

export interface CatalogReportInput {
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly series: ReadonlyArray<SeriesOption & { readonly printings: number }>;
  readonly printings: number;
  readonly official: ReadonlyMap<string, OfficialCard>;
  readonly engineCards: number;
  readonly mismatches: readonly Mismatch[];
  /** Card number -> names of the meta pool decks that play it. */
  readonly metaDecks: ReadonlyMap<string, readonly string[]>;
  /** Whether a card number is legal in the current Standard season. */
  readonly isStandard: (id: string) => boolean;
  /** Official numbers the engine does not have. */
  readonly missingFromEngine: readonly string[];
  readonly fixes: readonly DataFix[];
  /** Site errors corrected before comparing (SITE_CORRECTIONS that still apply). */
  readonly corrections: readonly SiteCorrection[];
  /** How the report was produced, shown at the top. */
  readonly command: string;
}

export function priorityOf(id: string, input: Pick<CatalogReportInput, "metaDecks" | "isStandard">): Priority {
  if (input.metaDecks.has(id)) return "meta";
  return input.isStandard(id) ? "standard" : "other";
}

/** Categories in report order: the fixed list first, then any other structure category seen. */
export function orderedCategories(mismatches: readonly Mismatch[]): string[] {
  const seen = new Set(mismatches.map((m) => m.category));
  const known = Object.keys(CATEGORIES);
  return [...known.filter((c) => seen.has(c)), ...[...seen].filter((c) => !known.includes(c)).sort()];
}

export interface CategoryCount {
  readonly total: number;
  readonly meta: number;
  readonly standard: number;
}

export function countByCategory(input: Pick<CatalogReportInput, "mismatches" | "metaDecks" | "isStandard">): Map<string, CategoryCount> {
  const counts = new Map<string, { total: number; meta: number; standard: number }>();
  for (const category of orderedCategories(input.mismatches)) counts.set(category, { total: 0, meta: 0, standard: 0 });
  for (const m of input.mismatches) {
    const c = counts.get(m.category)!;
    c.total++;
    const p = priorityOf(m.id, input);
    if (p === "meta") c.meta++;
    // Meta cards are Standard-legal too: the column counts every legal card.
    if (p !== "other") c.standard++;
  }
  return counts;
}

function show(value: unknown, max = 220): string {
  let text: string;
  if (value === null || value === undefined) text = "\u2014";
  else if (Array.isArray(value)) text = value.length === 0 ? "[]" : value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(" / ");
  else text = typeof value === "string" ? value : JSON.stringify(value);
  text = text.replace(/\s*\n\s*/g, " ⏎ ");
  if (text.length > max) text = `${text.slice(0, max - 1)}\u2026`;
  return text.replace(/\|/g, "\\|");
}

function mismatchLine(m: Mismatch, withCategory: boolean): string {
  const head = withCategory ? `\`${m.category}\`` : `**${m.id}** ${m.name}`;
  const values = m.category === "not-in-official" ? "" : ` \u2014 motor: ${show(m.engine)} · oficial: ${show(m.official)}`;
  return `- ${head}${values}${m.detail ? ` · ${show(m.detail, 300)}` : ""}`;
}

export function buildCatalogReport(input: CatalogReportInput): string {
  const counts = countByCategory(input);
  const categories = orderedCategories(input.mismatches);
  const lines: string[] = [];
  const cards = input.official.size;
  lines.push(
    "# Catálogo del motor frente a la lista oficial",
    "",
    `Generado el ${input.date} con \`${input.command}\`.`,
    "",
    `- Lista oficial EN (${OFFICIAL_CARDLIST_URL}): ${input.series.length} series, ${input.printings} impresiones, ${cards} números de carta.`,
    `- Motor: ${input.engineCards} cartas (sin DON!!). ${input.missingFromEngine.length} números oficiales no están en el motor.`,
    `- Pool del meta: ${input.metaDecks.size} números de carta en los mazos de \`decks/meta-op17-postban\`.`,
    "",
    "Las categorías `structure:*` son heurísticas sobre el texto oficial (ver `docs/CATALOGO.md`): señalan",
    "texto impreso sin bloque ejecutable en el motor, no prueban que la carta falle.",
    "",
    "## Resumen por categoría",
    "",
    "| Categoría | Qué es | Total | Pool del meta | Standard (incl. meta) |",
    "|---|---|--:|--:|--:|",
  );
  for (const category of categories) {
    const c = counts.get(category)!;
    lines.push(`| \`${category}\` | ${categoryInfo(category).label} | ${c.total} | ${c.meta} | ${c.standard} |`);
  }

  const byPriority = (p: Priority) => input.mismatches.filter((m) => priorityOf(m.id, input) === p);
  lines.push("", "## Cartas del pool del meta", "");
  const meta = byPriority("meta");
  if (meta.length === 0) lines.push("Ninguna discrepancia.");
  const metaIds = [...new Set(meta.map((m) => m.id))].sort();
  for (const id of metaIds) {
    const ms = meta.filter((m) => m.id === id);
    lines.push(`### ${id} ${ms[0]!.name}`, "", `Mazos: ${(input.metaDecks.get(id) ?? []).join(", ")}`, "");
    for (const m of ms) lines.push(mismatchLine(m, true));
    lines.push("");
  }

  for (const [priority, title] of [
    ["standard", "Resto de cartas legales en Standard"],
    ["other", "Cartas fuera de Standard (bloque 1, promos sin bloque, prohibidas)"],
  ] as const) {
    lines.push(`## ${title}`, "");
    const group = byPriority(priority);
    if (group.length === 0) lines.push("Ninguna discrepancia.", "");
    for (const category of categories) {
      const ms = group.filter((m) => m.category === category).sort((a, b) => a.id.localeCompare(b.id));
      if (ms.length === 0) continue;
      lines.push(`### \`${category}\` (${ms.length})`, "", categoryInfo(category).label, "");
      for (const m of ms) lines.push(mismatchLine(m, false));
      lines.push("");
    }
  }

  lines.push("## Números oficiales que faltan en el motor", "");
  const missingStandard = input.missingFromEngine.filter((id) => input.isStandard(id));
  lines.push(
    `${input.missingFromEngine.length} en total, ${missingStandard.length} legales en Standard. Por prefijo (legales en Standard):`,
    "",
  );
  const bySet = new Map<string, string[]>();
  for (const id of missingStandard) {
    const set = id.split("-")[0]!;
    bySet.set(set, [...(bySet.get(set) ?? []), id]);
  }
  for (const [set, ids] of [...bySet].sort(([a], [b]) => a.localeCompare(b))) lines.push(`- ${set} (${ids.length}): ${ids.join(", ")}`);

  lines.push(
    "",
    "## Errores de la propia web oficial",
    "",
    "Corregidos antes de comparar (`SITE_CORRECTIONS`, comprobados con la imagen de la carta):",
    "",
  );
  if (input.corrections.length === 0) lines.push("- ninguno aplicado");
  for (const c of input.corrections) lines.push(`- ${c.id} ${c.field}: la web dice ${show(c.shown)}, la carta impresa ${show(c.printed)}`);

  const inconsistent = [...input.official.values()].filter((c) => c.inconsistent.length > 0);
  lines.push(
    "",
    "## Impresiones que la propia web muestra distintas",
    "",
    "Números cuyas impresiones (base, paralelas, reimpresiones) no coinciden en la lista oficial; la referencia es la impresión base.",
    "",
  );
  for (const c of inconsistent) lines.push(`- ${c.id} ${c.name}: ${c.inconsistent.join(", ")} (${c.printings.join(", ")})`);

  const safe = input.fixes.filter((f) => f.safe);
  lines.push(
    "",
    "## Arreglos de datos",
    "",
    `${safe.length} arreglos mecánicos seguros (counter, atributo, nombre, tipos unidos, [Trigger] que falta) y`,
    `${input.fixes.length - safe.length} por revisar a mano (coste, poder, colores, otros tipos). Lista completa en la salida JSON (\`fixes\`).`,
    "",
  );
  return `${lines.join("\n")}\n`;
}

/** The JSON twin of the report, for tooling. */
export function buildCatalogJson(input: CatalogReportInput): unknown {
  return {
    generatedAt: input.date,
    command: input.command,
    source: {
      url: OFFICIAL_CARDLIST_URL,
      series: input.series,
      printings: input.printings,
      cards: input.official.size,
    },
    engine: { cards: input.engineCards },
    counts: Object.fromEntries(countByCategory(input)),
    mismatches: input.mismatches.map((m) => ({
      ...m,
      priority: priorityOf(m.id, input),
      ...(input.metaDecks.has(m.id) && { decks: input.metaDecks.get(m.id) }),
    })),
    missingFromEngine: input.missingFromEngine.map((id) => ({
      id,
      name: input.official.get(id)?.name ?? null,
      standard: input.isStandard(id),
    })),
    siteCorrections: input.corrections,
    officialInconsistent: [...input.official.values()]
      .filter((c) => c.inconsistent.length > 0)
      .map((c) => ({ id: c.id, fields: c.inconsistent, printings: c.printings })),
    fixes: input.fixes,
  };
}
