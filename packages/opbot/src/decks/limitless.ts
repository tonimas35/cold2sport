/**
 * Client for the Limitless Tournament Platform API: keyless and documented at
 * https://docs.limitlesstcg.com/developer/tournaments.
 *
 * Two constraints shape it:
 *  - The API allows 50 requests per 5 minutes. Requests are spaced at least
 *    6.5 s apart (50 x 6.5 s > 300 s, so the budget cannot run out on its
 *    own), and the client also obeys the `ratelimit` header the server sends
 *    (`"50-in-5min"; r=<remaining>; t=<seconds to reset>`) and 429 replies,
 *    because another process may be spending the same budget.
 *  - Finished tournaments never change, so raw responses are cached on disk
 *    and rerunning an analysis costs no requests. Callers pass a maximum age
 *    for data that can still change (the tournament list, live events).
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const LIMITLESS_API = "https://play.limitlesstcg.com/api";
export const DEFAULT_CACHE_DIR = resolve(import.meta.dir, "../../../../out/limitless-cache");
/** 50 requests / 300 s is one per 6 s; 6.5 s keeps a margin. */
export const MIN_REQUEST_INTERVAL_MS = 6500;

// ---------------------------------------------------------------------------
// Response shapes (only the fields we read; the API may send more).

export interface TournamentSummary {
  readonly id: string;
  readonly game: string;
  /** Format id; for One Piece mostly null (= the organizer's default, Standard) or "EXTRA". */
  readonly format: string | null;
  readonly name: string;
  /** ISO date-time of the scheduled start. */
  readonly date: string;
  readonly players: number;
  readonly organizerId?: number;
}

export interface TournamentPhase {
  readonly phase: number;
  readonly type: string;
  readonly rounds: number;
  readonly mode: string;
}

export interface TournamentDetails extends TournamentSummary {
  readonly organizer?: { readonly id: number; readonly name: string; readonly logo?: string };
  readonly platform?: string | null;
  readonly decklists?: boolean;
  readonly isPublic?: boolean;
  readonly isOnline?: boolean;
  readonly phases?: readonly TournamentPhase[];
  /** Custom bans, game specific: we accept card-id strings and {set, number} / {id} objects. */
  readonly bannedCards?: readonly unknown[] | null;
  readonly specialRules?: readonly string[] | null;
}

export interface OpCardRef {
  readonly set: string;
  readonly number: string | number;
  readonly name?: string;
}

export interface OpDeckEntry extends OpCardRef {
  readonly count: number;
}

/** One Piece decklist as Limitless stores it. */
export interface OpDecklist {
  readonly leader: OpCardRef;
  readonly character?: readonly OpDeckEntry[];
  readonly event?: readonly OpDeckEntry[];
  readonly stage?: readonly OpDeckEntry[];
}

export interface Standing {
  readonly player: string;
  readonly name: string;
  readonly country?: string | null;
  readonly placing: number | null;
  readonly record?: { readonly wins: number; readonly losses: number; readonly ties: number } | null;
  readonly decklist?: OpDecklist | null;
  /** For One Piece, `deck.id` is the leader card id. */
  readonly deck?: { readonly id: string; readonly name?: string; readonly icons?: readonly string[] } | null;
  readonly drop?: number | null;
}

export interface Pairing {
  readonly round: number;
  readonly phase: number;
  readonly table?: number;
  readonly match?: string;
  readonly player1: string;
  /** Empty or missing for a bye / tardiness loss. */
  readonly player2?: string | null;
  /** Winner's id; 0 = tie, -1 = double loss. */
  readonly winner: string | number | null;
}

// ---------------------------------------------------------------------------
// Card ids.

/** "OP14" + "20" -> "OP14-020": Limitless splits the id; our engine uses the printed form. */
export function cardIdOf(ref: OpCardRef): string {
  return `${ref.set.toUpperCase()}-${String(ref.number).padStart(3, "0")}`;
}

/** Normalizes the game-specific `bannedCards` entries to card ids. */
export function bannedCardIds(details: Pick<TournamentDetails, "bannedCards">): string[] {
  const ids: string[] = [];
  for (const entry of details.bannedCards ?? []) {
    if (typeof entry === "string") ids.push(entry.toUpperCase());
    else if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      if (typeof e.set === "string" && (typeof e.number === "string" || typeof e.number === "number")) {
        ids.push(cardIdOf({ set: e.set, number: e.number }));
      } else if (typeof e.id === "string") ids.push(e.id.toUpperCase());
      else if (typeof e.card === "string") ids.push(e.card.toUpperCase());
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Rate-limit headers.

export interface RateLimitInfo {
  readonly remaining: number | null;
  /** Seconds until the window resets. */
  readonly resetSeconds: number | null;
}

/**
 * Reads the IETF draft `ratelimit` header (`"50-in-5min"; r=49; t=300`) and
 * the older `x-ratelimit-*` / `retry-after` spellings as a fallback.
 */
export function parseRateLimit(headers: Headers): RateLimitInfo {
  const draft = headers.get("ratelimit");
  const num = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));
  if (draft) {
    return {
      remaining: num(/\br=(\d+)/.exec(draft)?.[1]),
      resetSeconds: num(/\bt=(\d+)/.exec(draft)?.[1]),
    };
  }
  return {
    remaining: num(headers.get("x-ratelimit-remaining")),
    resetSeconds: num(headers.get("x-ratelimit-reset") ?? headers.get("retry-after")),
  };
}

// ---------------------------------------------------------------------------
// Client.

export interface LimitlessOptions {
  readonly baseUrl?: string;
  readonly cacheDir?: string;
  readonly minIntervalMs?: number;
  /** Retries after a 429 or a network/5xx error. */
  readonly retries?: number;
  readonly fetch?: (url: string) => Promise<Response>;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly log?: (message: string) => void;
}

export type Query = Record<string, string | number | undefined>;

export class LimitlessClient {
  readonly baseUrl: string;
  readonly cacheDir: string;
  /** Requests answered from the network vs. from the disk cache. */
  readonly counts = { network: 0, cached: 0 };
  private readonly minIntervalMs: number;
  private readonly retries: number;
  private readonly doFetch: (url: string) => Promise<Response>;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly log: (message: string) => void;
  /** Earliest time the next network request may start. */
  private notBefore = 0;

  constructor(options: LimitlessOptions = {}) {
    this.baseUrl = options.baseUrl ?? LIMITLESS_API;
    this.cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
    this.minIntervalMs = options.minIntervalMs ?? MIN_REQUEST_INTERVAL_MS;
    this.retries = options.retries ?? 3;
    this.doFetch = options.fetch ?? ((url) => fetch(url, { headers: { accept: "application/json" } }));
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = options.now ?? Date.now;
    this.log = options.log ?? (() => {});
  }

  /** Where the response for (path, query) is cached. Keys are sorted so equal queries share a file. */
  cachePath(path: string, query: Query = {}): string {
    const parts = path.split("/").filter(Boolean).map((p) => p.replace(/[^A-Za-z0-9_.-]/g, "_"));
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${String(v).replace(/[^A-Za-z0-9_.-]/g, "_")}`)
      .join("&");
    return `${join(this.cacheDir, ...parts)}${qs ? `@${qs}` : ""}.json`;
  }

  /**
   * GET `path` (relative to the API base) as JSON. A cached response is used
   * when it exists and is younger than `maxAgeMs` (default: forever; 0 = refetch).
   */
  async get<T>(path: string, query: Query = {}, maxAgeMs = Infinity): Promise<T> {
    const file = this.cachePath(path, query);
    // File times are wall-clock, so the age uses Date.now(), not the (injectable) throttle clock.
    if (maxAgeMs > 0 && existsSync(file) && Date.now() - statSync(file).mtimeMs <= maxAgeMs) {
      this.counts.cached++;
      return JSON.parse(readFileSync(file, "utf8")) as T;
    }
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, String(v));
    const body = await this.fetchText(url.toString());
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
    this.counts.network++;
    return JSON.parse(body) as T;
  }

  private async fetchText(url: string): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      const wait = this.notBefore - this.now();
      if (wait > 0) await this.sleep(wait);
      this.notBefore = this.now() + this.minIntervalMs;
      let response: Response;
      try {
        response = await this.doFetch(url);
      } catch (e) {
        if (attempt >= this.retries) throw e;
        this.log(`limitless: ${url} failed (${String(e)}), retrying`);
        this.notBefore = this.now() + this.minIntervalMs * (attempt + 2);
        continue;
      }
      const limit = parseRateLimit(response.headers);
      // Out of budget: hold every request until the window resets.
      if (limit.remaining !== null && limit.remaining <= 0) {
        const reset = (limit.resetSeconds ?? 300) * 1000 + 1000;
        this.notBefore = Math.max(this.notBefore, this.now() + reset);
      }
      if (response.ok) return await response.text();
      if ((response.status === 429 || response.status >= 500) && attempt < this.retries) {
        const reset = (limit.resetSeconds ?? 60) * 1000 + 1000;
        this.notBefore = Math.max(this.notBefore, this.now() + reset);
        this.log(`limitless: HTTP ${response.status} for ${url}, waiting ${Math.round(reset / 1000)} s`);
        continue;
      }
      throw new Error(`limitless: HTTP ${response.status} for ${url}: ${(await response.text()).slice(0, 200)}`);
    }
  }

  tournaments(query: { game?: string; format?: string; organizerId?: number; limit?: number; page?: number }, maxAgeMs?: number) {
    return this.get<TournamentSummary[]>("/tournaments", query, maxAgeMs);
  }

  details(id: string, maxAgeMs?: number) {
    return this.get<TournamentDetails>(`/tournaments/${id}/details`, {}, maxAgeMs);
  }

  standings(id: string, maxAgeMs?: number) {
    return this.get<Standing[]>(`/tournaments/${id}/standings`, {}, maxAgeMs);
  }

  pairings(id: string, maxAgeMs?: number) {
    return this.get<Pairing[]>(`/tournaments/${id}/pairings`, {}, maxAgeMs);
  }
}

/**
 * Every tournament of `game` scheduled at or after `since`. The list is sorted
 * newest first, so pages are read until one holds nothing recent enough.
 */
export async function tournamentsSince(
  client: LimitlessClient,
  game: string,
  since: Date,
  options: { pageSize?: number; maxAgeMs?: number } = {},
): Promise<TournamentSummary[]> {
  const pageSize = options.pageSize ?? 100;
  const found = new Map<string, TournamentSummary>();
  for (let page = 1; ; page++) {
    const batch = await client.tournaments({ game, limit: pageSize, page }, options.maxAgeMs);
    const recent = batch.filter((t) => Date.parse(t.date) >= since.getTime());
    for (const t of recent) found.set(t.id, t);
    if (batch.length < pageSize || recent.length === 0) break;
  }
  return [...found.values()].sort((a, b) => a.date.localeCompare(b.date));
}
