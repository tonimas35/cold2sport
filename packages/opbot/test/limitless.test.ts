import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bannedCardIds, cardIdOf, LimitlessClient, parseRateLimit, tournamentsSince } from "../src/decks/limitless.ts";

/** A client on a fake clock: `sleep` advances time, every request is logged with its start time. */
function fakeClient(respond: (url: string, call: number) => Response) {
  const cacheDir = mkdtempSync(join(tmpdir(), "limitless-test-"));
  let clock = 1_000_000;
  const calls: Array<{ url: string; at: number }> = [];
  const client = new LimitlessClient({
    cacheDir,
    baseUrl: "https://example.test/api",
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    fetch: async (url) => {
      calls.push({ url, at: clock });
      return respond(url, calls.length - 1);
    },
  });
  return { client, calls, cacheDir, cleanup: () => rmSync(cacheDir, { recursive: true, force: true }) };
}

const json = (body: unknown, headers: Record<string, string> = {}, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

describe("limitless", () => {
  test("card ids and bans are normalized to the printed form", () => {
    expect(cardIdOf({ set: "OP14", number: "20" })).toBe("OP14-020");
    expect(cardIdOf({ set: "st10", number: 1 })).toBe("ST10-001");
    expect(
      bannedCardIds({ bannedCards: [{ name: "Dracule Mihawk", set: "OP14", number: "020" }, "op06-086", { id: "P-001" }, 7] }),
    ).toEqual(["OP14-020", "OP06-086", "P-001"]);
    expect(bannedCardIds({ bannedCards: null })).toEqual([]);
  });

  test("reads the draft ratelimit header and the legacy ones", () => {
    expect(parseRateLimit(new Headers({ ratelimit: '"50-in-5min"; r=49; t=300' }))).toEqual({ remaining: 49, resetSeconds: 300 });
    expect(parseRateLimit(new Headers({ "x-ratelimit-remaining": "0", "retry-after": "12" }))).toEqual({ remaining: 0, resetSeconds: 12 });
    expect(parseRateLimit(new Headers())).toEqual({ remaining: null, resetSeconds: null });
  });

  test("throttles to one request per 6.5 s and serves repeats from the disk cache", async () => {
    const { client, calls, cleanup } = fakeClient((url) => json({ url }));
    try {
      await client.details("a");
      await client.details("b");
      await client.standings("a");
      expect(calls.map((c) => c.at - calls[0]!.at)).toEqual([0, 6500, 13000]);
      expect((await client.details("a")) as unknown).toEqual({ url: "https://example.test/api/tournaments/a/details" });
      expect(calls.length).toBe(3);
      expect(client.counts).toEqual({ network: 3, cached: 1 });
      // maxAgeMs = 0 forces a refetch.
      await client.details("a", 0);
      expect(calls.length).toBe(4);
    } finally {
      cleanup();
    }
  });

  test("waits for the window reset when the budget is spent, and retries a 429", async () => {
    const { client, calls, cleanup } = fakeClient((_url, call) =>
      call === 0
        ? json([], { ratelimit: '"50-in-5min"; r=0; t=120' })
        : call === 1
          ? json({ error: "slow down" }, { ratelimit: '"50-in-5min"; r=0; t=30' }, 429)
          : json({ ok: true }, { ratelimit: '"50-in-5min"; r=48; t=290' }),
    );
    try {
      await client.pairings("x");
      expect((await client.details("y")) as unknown).toEqual({ ok: true });
      expect(calls[1]!.at - calls[0]!.at).toBe(121_000);
      expect(calls[2]!.at - calls[1]!.at).toBe(31_000);
    } finally {
      cleanup();
    }
  });

  test("tournamentsSince pages until a page holds nothing recent", async () => {
    const page = (n: number) =>
      Array.from({ length: 2 }, (_, i) => ({ id: `t${n}${i}`, game: "OP", format: null, name: "x", players: 8, date: `2026-09-${String(30 - n * 2 - i).padStart(2, "0")}T10:00:00.000Z` }));
    const { client, calls, cleanup } = fakeClient((url) => json(page(Number(new URL(url).searchParams.get("page")))));
    try {
      const found = await tournamentsSince(client, "OP", new Date("2026-09-25T00:00:00Z"), { pageSize: 2 });
      expect(found.map((t) => t.date.slice(0, 10))).toEqual(["2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28"]);
      // Pages 1 (28, 27), 2 (26, 25), 3 (24, 23: nothing recent -> stop).
      expect(calls.length).toBe(3);
    } finally {
      cleanup();
    }
  });
});
