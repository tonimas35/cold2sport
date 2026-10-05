/**
 * Polite downloader for the official EN card list, with a disk cache.
 *
 * One page per series, at least `minIntervalMs` (default 2.5 s) between two
 * network requests, retries with a growing pause on network errors and 5xx /
 * 429 replies. Raw HTML is cached under out/official-cache/ (gitignored), so
 * re-running the check costs no requests unless --refresh is given.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { OFFICIAL_CARDLIST_URL, parseSeriesOptions, type SeriesOption } from "./official-catalog.ts";

export { OFFICIAL_CARDLIST_URL };
export const DEFAULT_OFFICIAL_CACHE_DIR = resolve(import.meta.dir, "../../../../out/official-cache");
/**
 * The site publishes no limit. 2.5 s from the end of one download to the next
 * request keeps a full run (61 pages) at about 3-4 minutes.
 */
export const MIN_OFFICIAL_INTERVAL_MS = 2500;

export interface OfficialFetchOptions {
  readonly baseUrl?: string;
  readonly cacheDir?: string;
  readonly minIntervalMs?: number;
  readonly retries?: number;
  readonly fetch?: (url: string) => Promise<Response>;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly log?: (message: string) => void;
}

export class OfficialCardListClient {
  readonly baseUrl: string;
  readonly cacheDir: string;
  readonly counts = { network: 0, cached: 0 };
  private readonly minIntervalMs: number;
  private readonly retries: number;
  private readonly doFetch: (url: string) => Promise<Response>;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly log: (message: string) => void;
  private notBefore = 0;

  constructor(options: OfficialFetchOptions = {}) {
    this.baseUrl = options.baseUrl ?? OFFICIAL_CARDLIST_URL;
    this.cacheDir = options.cacheDir ?? DEFAULT_OFFICIAL_CACHE_DIR;
    this.minIntervalMs = options.minIntervalMs ?? MIN_OFFICIAL_INTERVAL_MS;
    this.retries = options.retries ?? 3;
    this.doFetch =
      options.fetch ??
      ((url) =>
        fetch(url, {
          headers: {
            accept: "text/html",
            "accept-language": "en",
            "user-agent": "opbot-catalog-check/1.0 (personal card-data audit; 1 request per 2.5 s)",
          },
        }));
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = options.now ?? Date.now;
    this.log = options.log ?? (() => {});
  }

  /** Cache file of a series page ("index" for the list without a series). */
  cachePath(seriesId: string | null): string {
    return join(this.cacheDir, `${seriesId === null ? "index" : `series-${seriesId.replace(/[^0-9A-Za-z_-]/g, "_")}`}.html`);
  }

  /**
   * The series offered by the site's selector. The bare card list URL
   * redirects to the newest series, whose page carries the full selector.
   */
  async seriesOptions(maxAgeMs = 24 * 3600_000): Promise<SeriesOption[]> {
    const options = parseSeriesOptions(await this.page(null, maxAgeMs));
    if (options.length === 0) throw new Error(`official card list: no series selector in ${this.baseUrl}`);
    return options;
  }

  /** Raw HTML of one series page (null = the card list's landing page). */
  async page(seriesId: string | null, maxAgeMs = Infinity): Promise<string> {
    const file = this.cachePath(seriesId);
    if (maxAgeMs > 0 && existsSync(file) && Date.now() - statSync(file).mtimeMs <= maxAgeMs) {
      this.counts.cached++;
      return readFileSync(file, "utf8");
    }
    const url = seriesId === null ? this.baseUrl : `${this.baseUrl}?series=${encodeURIComponent(seriesId)}`;
    const body = await this.fetchText(url);
    // A page without a single card block is an error page or a layout change:
    // never cache it, or every later run would compare against nothing.
    if (seriesId !== null && !body.includes('class="modalCol"')) {
      throw new Error(`official card list: ${url} has no card blocks (layout change or error page)`);
    }
    mkdirSync(this.cacheDir, { recursive: true });
    writeFileSync(file, body);
    this.counts.network++;
    return body;
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
        this.log(`official card list: ${url} failed (${String(e)}), retrying`);
        this.notBefore = this.now() + this.minIntervalMs * (attempt + 2) * 2;
        continue;
      }
      if (response.ok) {
        const body = await response.text();
        // The pause counts from the end of the download too: a slow 900 KB
        // page must not be followed by an immediate request.
        this.notBefore = Math.max(this.notBefore, this.now() + this.minIntervalMs);
        this.log(`official card list: fetched ${url}`);
        return body;
      }
      if ((response.status === 429 || response.status >= 500) && attempt < this.retries) {
        this.notBefore = this.now() + this.minIntervalMs * (attempt + 2) * 4;
        this.log(`official card list: HTTP ${response.status} for ${url}, backing off`);
        continue;
      }
      throw new Error(`official card list: HTTP ${response.status} for ${url}`);
    }
  }
}
