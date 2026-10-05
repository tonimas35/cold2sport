/**
 * Meta analysis of Limitless tournament data: which events count, how often
 * each Leader is played and how it scores, and which list represents it.
 *
 * Everything here is a pure function of the API responses, so the selection
 * rules are unit-tested and documented in one place; fetching and writing
 * files live in meta-command.ts.
 */
import {
  bannedCardIds,
  cardIdOf,
  type OpDecklist,
  type Pairing,
  type Standing,
  type TournamentDetails,
  type TournamentSummary,
} from "./limitless.ts";
import type { DeckList } from "./deck.ts";

/** Dracule Mihawk Leader: banned from 2026-10-12, ban announced 2026-09-24. */
export const BANNED_LEADER = "OP14-020";
export const BAN_ANNOUNCED = "2026-09-24";
export const BAN_EFFECTIVE = "2026-10-12";
/** Events this big are assumed to follow the announced list once nobody plays the Leader. */
export const LARGE_EVENT_PLAYERS = 32;

export const tournamentUrl = (id: string) => `https://play.limitlesstcg.com/tournament/${id}`;
const day = (iso: string) => iso.slice(0, 10);

// ---------------------------------------------------------------------------
// Event selection.

/**
 * Standard events only. One Piece events on Limitless have format null (the
 * default, Standard) or "EXTRA"; Extra events are also tagged [EGB] in the
 * name by some organizers without setting the format, so both are dropped.
 */
export function isStandardEvent(t: Pick<TournamentSummary, "format" | "name">): boolean {
  const format = t.format?.toUpperCase() ?? null;
  return (format === null || format === "STANDARD") && !/\[EGB\]/i.test(t.name);
}

/** Leader card id of an entry: from the decklist, else the auto-assigned deck (deck.id = leader id). */
export function leaderOf(s: Pick<Standing, "decklist" | "deck">): string | null {
  if (s.decklist?.leader) return cardIdOf(s.decklist.leader);
  const id = s.deck?.id?.toUpperCase();
  return id && /^[A-Z0-9]+-\d{3}$/.test(id) ? id : null;
}

/** The middle rule of `classifyEvent` needs the standings; the others do not. */
export function needsStandingsToClassify(d: TournamentDetails): boolean {
  return (
    !bannedCardIds(d).includes(BANNED_LEADER) &&
    day(d.date) >= BAN_ANNOUNCED &&
    day(d.date) < BAN_EFFECTIVE &&
    d.players >= LARGE_EVENT_PLAYERS
  );
}

export interface BanClassification {
  readonly postBan: boolean;
  readonly reason: string;
}

/**
 * Whether an event already reflects the Mihawk ban. Between the announcement
 * and the effective date organizers choose: an event counts when it lists the
 * ban, or when it is large (>= 32 players), after the announcement and nobody
 * registered the Leader (a strong sign the ban was applied); from the
 * effective date on, every event counts.
 */
export function classifyEvent(d: TournamentDetails, standings: readonly Standing[] | null): BanClassification {
  if (bannedCardIds(d).includes(BANNED_LEADER)) return { postBan: true, reason: `bans ${BANNED_LEADER}` };
  if (day(d.date) >= BAN_EFFECTIVE) return { postBan: true, reason: `on/after ${BAN_EFFECTIVE}` };
  if (day(d.date) < BAN_ANNOUNCED) return { postBan: false, reason: `before ${BAN_ANNOUNCED}, ban not listed` };
  if (d.players < LARGE_EVENT_PLAYERS) return { postBan: false, reason: `< ${LARGE_EVENT_PLAYERS} players, ban not listed` };
  if (standings === null) throw new Error(`classifyEvent: ${d.id} needs its standings`);
  const mihawks = standings.filter((s) => leaderOf(s) === BANNED_LEADER).length;
  return mihawks === 0
    ? { postBan: true, reason: `>= ${LARGE_EVENT_PLAYERS} players after ${BAN_ANNOUNCED}, no ${BANNED_LEADER}` }
    : { postBan: false, reason: `${mihawks} ${BANNED_LEADER} entries, ban not listed` };
}

// ---------------------------------------------------------------------------
// Leader statistics.

export interface EventData {
  readonly details: TournamentDetails;
  readonly standings: readonly Standing[];
  readonly pairings: readonly Pairing[];
}

export interface LeaderStats {
  readonly leader: string;
  /** Name as Limitless spells it (first seen). */
  readonly name: string;
  readonly entries: number;
  /** entries / entries with a known Leader. */
  readonly share: number;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  /** Non-mirror matches with a result. */
  readonly games: number;
  /** (wins + ties / 2) / games; null without games. */
  readonly winRate: number | null;
}

export interface MetaSummary {
  readonly leaders: LeaderStats[];
  readonly entries: number;
  /** Entries whose Leader is unknown (no decklist and no deck id); not in the shares. */
  readonly unknownLeader: number;
  readonly matches: number;
}

/**
 * Leader shares and match win rates over a set of events. Byes and matches
 * against an entry with an unknown Leader carry no information and are
 * skipped; mirror matches always score 50% and are skipped as well. A double
 * loss counts as a loss for both sides.
 */
export function summarizeMeta(events: readonly EventData[]): MetaSummary {
  const acc = new Map<string, { name: string; entries: number; wins: number; losses: number; ties: number }>();
  const get = (leader: string) => {
    let a = acc.get(leader);
    if (!a) acc.set(leader, (a = { name: "", entries: 0, wins: 0, losses: 0, ties: 0 }));
    return a;
  };
  let entries = 0;
  let unknownLeader = 0;
  let matches = 0;
  for (const event of events) {
    const leaderByPlayer = new Map<string, string>();
    for (const s of event.standings) {
      const leader = leaderOf(s);
      if (leader === null) {
        unknownLeader++;
        continue;
      }
      leaderByPlayer.set(s.player, leader);
      const a = get(leader);
      a.entries++;
      if (!a.name) a.name = s.decklist?.leader.name ?? s.deck?.name ?? "";
      entries++;
    }
    for (const p of event.pairings) {
      const l1 = leaderByPlayer.get(p.player1);
      const l2 = p.player2 ? leaderByPlayer.get(p.player2) : undefined;
      if (!l1 || !l2 || l1 === l2) continue;
      const [a1, a2] = [get(l1), get(l2)];
      const winner = String(p.winner);
      if (winner === p.player1) {
        a1.wins++;
        a2.losses++;
      } else if (winner === p.player2) {
        a2.wins++;
        a1.losses++;
      } else if (winner === "0") {
        a1.ties++;
        a2.ties++;
      } else if (winner === "-1") {
        a1.losses++;
        a2.losses++;
      } else continue; // no result recorded
      matches++;
    }
  }
  const leaders = [...acc].map(([leader, a]): LeaderStats => {
    const games = a.wins + a.losses + a.ties;
    return {
      leader,
      name: a.name,
      entries: a.entries,
      share: entries > 0 ? a.entries / entries : 0,
      wins: a.wins,
      losses: a.losses,
      ties: a.ties,
      games,
      winRate: games > 0 ? (a.wins + a.ties / 2) / games : null,
    };
  });
  // Most played first; ties broken by win rate, then id, so the order is stable.
  leaders.sort((a, b) => b.entries - a.entries || (b.winRate ?? 0) - (a.winRate ?? 0) || a.leader.localeCompare(b.leader));
  return { leaders, entries, unknownLeader, matches };
}

// ---------------------------------------------------------------------------
// Decklists.

/** Main deck card ids, one per copy, in list order (characters, events, stages). */
export function mainDeckIds(list: OpDecklist): string[] {
  const ids: string[] = [];
  for (const section of [list.character, list.event, list.stage]) {
    for (const entry of section ?? []) for (let i = 0; i < entry.count; i++) ids.push(cardIdOf(entry));
  }
  return ids;
}

/** Names Limitless gives the cards of a list, by card id. */
export function cardNames(list: OpDecklist): Map<string, string> {
  const names = new Map<string, string>([[cardIdOf(list.leader), list.leader.name ?? ""]]);
  for (const section of [list.character, list.event, list.stage]) {
    for (const entry of section ?? []) if (entry.name) names.set(cardIdOf(entry), entry.name);
  }
  return names;
}

export interface Placement {
  readonly event: EventData;
  readonly standing: Standing;
  readonly list: OpDecklist;
}

/** Every complete (50-card) list of `leader` in `events`. */
export function listsOf(events: readonly EventData[], leader: string): Placement[] {
  const out: Placement[] = [];
  for (const event of events) {
    for (const standing of event.standings) {
      const list = standing.decklist;
      if (!list?.leader || leaderOf(standing) !== leader || mainDeckIds(list).length !== 50) continue;
      out.push({ event, standing, list });
    }
  }
  return out;
}

/**
 * The representative list of a Leader: the best-placed player with it among
 * events with >= `minPlayers` players; ties go to the larger event, then the
 * later one, then the player id (only so the choice is deterministic).
 * `accept` drops lists before ranking (the caller passes the Standard
 * legality check: a list an organizer let through is not a pool deck).
 */
export function representativeList(
  events: readonly EventData[],
  leader: string,
  minPlayers = LARGE_EVENT_PLAYERS,
  accept: (p: Placement) => boolean = () => true,
): Placement | null {
  const candidates = listsOf(
    events.filter((e) => e.details.players >= minPlayers),
    leader,
  ).filter((p) => p.standing.placing !== null && accept(p));
  candidates.sort(
    (a, b) =>
      a.standing.placing! - b.standing.placing! ||
      b.event.details.players - a.event.details.players ||
      b.event.details.date.localeCompare(a.event.details.date) ||
      a.standing.player.localeCompare(b.standing.player),
  );
  return candidates[0] ?? null;
}

export interface ConsensusRow {
  readonly card: string;
  readonly name: string;
  /** Lists that play the card / all lists. */
  readonly inclusion: number;
  /** Average copies among the lists that play it. */
  readonly avgCopies: number;
  /** Most common copy count among the lists that play it. */
  readonly modeCopies: number;
}

/** How the lists of one Leader agree, card by card, most included first. */
export function consensusTable(lists: readonly OpDecklist[]): ConsensusRow[] {
  const counts = new Map<string, number[]>();
  const names = new Map<string, string>();
  for (const list of lists) {
    const perList = new Map<string, number>();
    for (const id of mainDeckIds(list)) perList.set(id, (perList.get(id) ?? 0) + 1);
    for (const [id, n] of perList) {
      let arr = counts.get(id);
      if (!arr) counts.set(id, (arr = []));
      arr.push(n);
    }
    for (const [id, name] of cardNames(list)) if (!names.has(id)) names.set(id, name);
  }
  const rows = [...counts].map(([card, ns]): ConsensusRow => {
    const freq = new Map<number, number>();
    for (const n of ns) freq.set(n, (freq.get(n) ?? 0) + 1);
    const modeCopies = [...freq].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]![0];
    return {
      card,
      name: names.get(card) ?? "",
      inclusion: ns.length / lists.length,
      avgCopies: ns.reduce((x, y) => x + y, 0) / ns.length,
      modeCopies,
    };
  });
  rows.sort((a, b) => b.inclusion - a.inclusion || b.avgCopies - a.avgCopies || a.card.localeCompare(b.card));
  return rows;
}

// ---------------------------------------------------------------------------
// Output.

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const percent = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

/** The deck in our text format (see deck.ts), with its provenance as comments. */
export function placementToDeckText(p: Placement, stats: LeaderStats): string {
  const d = p.event.details;
  const s = p.standing;
  const record = s.record ? ` ${s.record.wins}-${s.record.losses}-${s.record.ties}` : "";
  const counts = new Map<string, number>();
  for (const id of mainDeckIds(p.list)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [
    `# source: ${tournamentUrl(d.id)} ${s.player} placed ${s.placing}/${d.players} ${day(d.date)}`,
    `# leader share: ${percent(stats.share)}, win rate: ${stats.winRate === null ? "n/a" : percent(stats.winRate)} (${stats.games} games)`,
    `# event: ${d.name}; player: ${s.name}${record}`,
    `1x${cardIdOf(p.list.leader)}`,
    ...[...counts].map(([id, n]) => `${n}x${id}`),
    "",
  ].join("\n");
}

export function placementToDeckList(p: Placement, name: string): DeckList {
  const d = p.event.details;
  return {
    name,
    leader: cardIdOf(p.list.leader),
    main: mainDeckIds(p.list),
    source: `${tournamentUrl(d.id)} ${p.standing.player} placed ${p.standing.placing}/${d.players} ${day(d.date)}`,
  };
}
