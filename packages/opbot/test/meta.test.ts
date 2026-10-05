import { describe, expect, test } from "bun:test";
import { TEST_DECKS } from "@tcg/op-engine";
import { parseDeckText } from "../src/decks/deck.ts";
import type { OpDecklist, Pairing, Standing, TournamentDetails } from "../src/decks/limitless.ts";
import {
  classifyEvent,
  consensusTable,
  isStandardEvent,
  leaderOf,
  mainDeckIds,
  needsStandingsToClassify,
  placementToDeckText,
  representativeList,
  summarizeMeta,
  type EventData,
} from "../src/decks/meta.ts";

const details = (over: Partial<TournamentDetails>): TournamentDetails => ({
  id: "t",
  game: "OP",
  format: null,
  name: "Weekly",
  date: "2026-09-28T18:00:00.000Z",
  players: 64,
  ...over,
});

/** A Limitless-style list: `id` repeated `n` times per entry, split as characters. */
function list(leader: string, entries: Array<[string, number]>): OpDecklist {
  const split = (id: string) => ({ set: id.split("-")[0]!, number: id.split("-")[1]! });
  return { leader: { ...split(leader), name: leader }, character: entries.map(([id, count]) => ({ ...split(id), count, name: id })) };
}

const standing = (player: string, placing: number, leader: string, decklist: OpDecklist | null = null): Standing => ({
  player,
  name: player,
  placing,
  record: { wins: 3, losses: 1, ties: 0 },
  decklist,
  deck: { id: leader },
});

describe("meta", () => {
  test("Standard filter drops Extra and [EGB] events", () => {
    expect(isStandardEvent({ format: null, name: "[OP17] Cup #1" })).toBe(true);
    expect(isStandardEvent({ format: "STANDARD", name: "Cup" })).toBe(true);
    expect(isStandardEvent({ format: "EXTRA", name: "Cup" })).toBe(false);
    expect(isStandardEvent({ format: null, name: "[EGB] ChinoizeCup #108" })).toBe(false);
  });

  test("post-ban classification follows the three rules", () => {
    const mihawk = [standing("a", 1, "OP14-020")];
    const other = [standing("a", 1, "OP17-001")];
    const listed = details({ date: "2026-09-01T10:00:00Z", players: 8, bannedCards: [{ set: "OP14", number: "020" }] });
    expect(classifyEvent(listed, null).postBan).toBe(true);
    expect(needsStandingsToClassify(listed)).toBe(false);
    // Before the announcement only a listed ban counts.
    expect(classifyEvent(details({ date: "2026-09-23T23:00:00Z" }), other).postBan).toBe(false);
    // After it: large events with no Mihawk count, small ones do not.
    const large = details({ date: "2026-09-24T10:00:00Z", players: 32 });
    expect(needsStandingsToClassify(large)).toBe(true);
    expect(classifyEvent(large, other).postBan).toBe(true);
    expect(classifyEvent(large, mihawk).postBan).toBe(false);
    expect(classifyEvent(details({ players: 31 }), other).postBan).toBe(false);
    expect(() => classifyEvent(large, null)).toThrow();
    // From the effective date everything counts.
    expect(classifyEvent(details({ date: "2026-10-12T00:00:00Z", players: 4 }), mihawk).postBan).toBe(true);
  });

  test("leader comes from the decklist, else from deck.id", () => {
    expect(leaderOf({ decklist: list("OP17-001", []), deck: { id: "OP01-001" } })).toBe("OP17-001");
    expect(leaderOf({ decklist: null, deck: { id: "op16-002" } })).toBe("OP16-002");
    expect(leaderOf({ decklist: null, deck: { id: "other" } })).toBeNull();
    expect(leaderOf({ decklist: null, deck: null })).toBeNull();
  });

  test("shares and win rates skip byes, mirrors and unknown opponents", () => {
    const standings = [standing("a", 1, "L1-001"), standing("b", 2, "L2-001"), standing("c", 3, "L1-001"), { ...standing("d", 4, ""), deck: null }];
    const pairings: Pairing[] = [
      { round: 1, phase: 1, player1: "a", player2: "b", winner: "a" },
      { round: 1, phase: 1, player1: "c", player2: "b", winner: 0 },
      { round: 2, phase: 1, player1: "a", player2: "c", winner: "c" }, // mirror
      { round: 2, phase: 1, player1: "b", player2: "", winner: "b" }, // bye
      { round: 3, phase: 1, player1: "b", player2: "d", winner: "b" }, // unknown leader
      { round: 3, phase: 1, player1: "a", player2: "b", winner: -1 },
    ];
    const meta = summarizeMeta([{ details: details({}), standings, pairings }]);
    expect(meta.entries).toBe(3);
    expect(meta.unknownLeader).toBe(1);
    expect(meta.matches).toBe(3);
    const [l1, l2] = meta.leaders;
    expect(l1).toMatchObject({ leader: "L1-001", entries: 2, wins: 1, losses: 1, ties: 1, games: 3 });
    expect(l1!.share).toBeCloseTo(2 / 3, 9);
    expect(l1!.winRate).toBeCloseTo(1.5 / 3, 9);
    expect(l2).toMatchObject({ leader: "L2-001", wins: 0, losses: 2, ties: 1, games: 3 });
  });

  test("representative list: best placing in a large event, ties to the larger event", () => {
    const full = list("OP17-001", [["OP17-002", 4], ["OP17-003", 46]]);
    const ev = (id: string, players: number, standings: Standing[]): EventData => ({ details: details({ id, players }), standings, pairings: [] });
    const events = [
      ev("small", 16, [standing("s1", 1, "OP17-001", full)]),
      ev("mid", 40, [standing("m2", 2, "OP17-001", full), standing("m3", 3, "OP17-001", full)]),
      ev("big", 128, [standing("b2", 2, "OP17-001", full), standing("b1", 1, "OP16-001", list("OP16-001", [["OP16-002", 50]]))]),
      ev("short", 256, [standing("x1", 1, "OP17-001", list("OP17-001", [["OP17-002", 4]]))]),
    ];
    const rep = representativeList(events, "OP17-001", 32)!;
    expect(rep.event.details.id).toBe("big");
    expect(rep.standing.player).toBe("b2");
    expect(representativeList(events, "OP15-001", 32)).toBeNull();
    // A rejected list (e.g. not Standard-legal) gives way to the next best one.
    const notB2 = representativeList(events, "OP17-001", 32, (p) => p.standing.player !== "b2")!;
    expect(notB2.standing.player).toBe("m2");
  });

  test("consensus counts inclusion and copies per card", () => {
    const rows = consensusTable([
      list("OP17-001", [["OP17-002", 4], ["OP17-003", 2]]),
      list("OP17-001", [["OP17-002", 3], ["OP17-004", 1]]),
    ]);
    expect(rows[0]).toMatchObject({ card: "OP17-002", inclusion: 1, avgCopies: 3.5 });
    expect(rows.find((r) => r.card === "OP17-003")).toMatchObject({ inclusion: 0.5, modeCopies: 2 });
  });

  test("deck text round-trips through parseDeckText with its source header", () => {
    const test = TEST_DECKS[Object.keys(TEST_DECKS)[0] as keyof typeof TEST_DECKS];
    const counts = new Map<string, number>();
    for (const id of test.mainDeck) counts.set(id, (counts.get(id) ?? 0) + 1);
    const decklist = list(test.leaderId, [...counts]);
    expect(mainDeckIds(decklist).length).toBe(50);
    const event: EventData = { details: details({ id: "abc", name: "Cup", players: 64 }), standings: [], pairings: [] };
    const text = placementToDeckText(
      { event, standing: standing("p1", 3, test.leaderId, decklist), list: decklist },
      { leader: test.leaderId, name: "", entries: 5, share: 0.125, wins: 6, losses: 4, ties: 0, games: 10, winRate: 0.6 },
    );
    expect(text.split("\n").slice(0, 2)).toEqual([
      "# source: https://play.limitlesstcg.com/tournament/abc p1 placed 3/64 2026-09-28",
      "# leader share: 12.5%, win rate: 60.0% (10 games)",
    ]);
    const deck = parseDeckText("x", text);
    expect(deck.leader).toBe(test.leaderId);
    expect([...deck.main].sort()).toEqual([...test.mainDeck].sort());
  });
});
