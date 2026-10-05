/**
 * OPTCGSim combat log -> position file. Two samples in examples/optcgsim/:
 * a synthetic 1.43 log (complete move frames, engine-test decks, so the
 * position can be loaded by the analyzer) and a real OPBounty replay from the
 * 1.40 client (MIT, optcg-mantra), whose missing frames are repaired from the
 * snapshot lines.
 */
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { observedDeckText, parseOptcgsimLog, positionFromLog } from "../src/analysis/import-optcgsim.ts";
import { loadPosition } from "../src/analysis/position.ts";

const ROOT = resolve(import.meta.dir, "../../..");
const SYNTHETIC = readFileSync(`${ROOT}/examples/optcgsim/synthetic-zoro-vs-nami-1.43.log`, "utf8");
const OPBOUNTY = readFileSync(`${ROOT}/examples/optcgsim/opbounty-kalgara-vs-teach-1.40.log`, "utf8");
const DECKS = { south: `${ROOT}/decks/engine-test/red-aggro.txt`, north: `${ROOT}/decks/engine-test/blue-control.txt` };

test("a 1.43 log replays without inconsistencies and lists its decision points", () => {
  const game = parseOptcgsimLog(SYNTHETIC);
  expect(game.version).toBe("1.43a.1");
  expect(game.players).toEqual({ 1: { name: "Tester#0001", leader: "OP01-001" }, 2: { name: "Rival#0002", leader: "OP03-040" } });
  expect(game.firstPlayer).toBe(1);
  expect(game.turns).toBe(6);
  // Count frames (RZ1|CHK) and snapshot lines all agree with the replay.
  expect(game.warnings).toEqual([]);
  expect(game.checkpoints.filter((c) => c.turn === 5).map((c) => c.next)).toEqual([
    "Attach 1 Don to Sanji [OP04-007] (1 Total)",
    "Sanji [OP04-007] attacking Nami [OP03-040]",
    "Deploy Marco [OP01-023]",
    "End Turn",
  ]);
  // The log names hidden cards too (Life, the opponent's hand, shuffled deck cards).
  expect(game.observed[2]["OP03-045"]).toBe(1);
  expect(observedDeckText(game, 1).split("\n").slice(0, 2)).toEqual(["# seen in an OPTCGSim log: 15 of 50 cards", "1xOP01-001"]);
});

test("the position at the start of a main phase", () => {
  const { position, checkpoint, leaders, warnings } = positionFromLog(parseOptcgsimLog(SYNTHETIC), { turn: 5 }, { decks: DECKS });
  expect(warnings).toEqual([]);
  expect(checkpoint.player).toBe(1);
  expect(leaders).toEqual({ south: "OP01-001", north: "OP03-040" });
  const { _comment, ...spec } = position;
  expect(_comment).toContain("turn 5");
  expect(spec).toEqual({
    toMove: "south",
    turn: 5,
    firstPlayer: "south",
    south: {
      deck: DECKS.south,
      life: 4,
      hand: ["OP01-023", "OP01-029", "ST01-012", "OP01-026", "OP01-025", "OP03-014"],
      characters: [
        { card: "OP04-007", rested: false, don: 0, justPlayed: false },
        { card: "OP01-004", rested: false, don: 0, justPlayed: false },
      ],
      stage: null,
      trash: [],
      leaderDon: 0,
      leaderRested: false,
      activeDon: 5,
      restedDon: 0,
    },
    north: {
      deck: DECKS.north,
      life: 4,
      handCount: 6,
      // Bellamy attacked last turn with 1 DON: both stay until its owner's refresh.
      characters: [
        { card: "OP01-076", rested: true, don: 1, justPlayed: false },
        { card: "OP01-073", rested: false, don: 0, justPlayed: false },
      ],
      stage: null,
      trash: [],
      leaderDon: 0,
      leaderRested: false,
      activeDon: 0,
      restedDon: 3,
    },
  });
});

test("mid-turn cuts: the DON cost written before a play belongs to the play", () => {
  const game = parseOptcgsimLog(SYNTHETIC);
  const before = positionFromLog(game, { turn: 5, action: 2 }).position;
  expect(before.south.activeDon).toBe(4);
  expect(before.south.restedDon).toBe(0);
  expect(before.south.characters).toEqual([
    { card: "OP04-007", rested: true, don: 1, justPlayed: false },
    { card: "OP01-004", rested: false, don: 0, justPlayed: false },
  ]);
  // The blocker rested and was K.O.'d.
  expect(before.north.characters).toEqual([{ card: "OP01-076", rested: true, don: 1, justPlayed: false }]);
  expect(before.north.trash).toEqual(["OP01-073"]);
  const after = positionFromLog(game, { turn: 5, action: 3 }).position;
  expect(after.south.activeDon).toBe(1);
  expect(after.south.restedDon).toBe(3);
  expect(after.south.characters?.[2]).toEqual({ card: "OP01-023", rested: false, don: 0, justPlayed: true });
});

test("options: the other player's view, seat and the opponent's real hand", () => {
  const game = parseOptcgsimLog(SYNTHETIC);
  const { position } = positionFromLog(game, { turn: 4, action: 0 }, { perspective: "rival#0002", seat: "north", revealOpponentHand: true });
  expect(position.toMove).toBe("north");
  expect(position.firstPlayer).toBe("south");
  expect(position.north.hand).toEqual(["OP03-044", "OP01-073", "OP01-088", "OP02-065", "OP01-074", "OP03-045", "OP01-086"]);
  expect(position.south.hand).toEqual(["OP01-023", "OP01-029", "ST01-012", "OP01-026"]);
  expect(position.south.leaderDon).toBe(1);
  expect(position.south.leaderRested).toBe(true);
  expect(() => positionFromLog(game, { turn: 5, action: 9 })).toThrow("turn 5 has actions 0-3");
  expect(() => positionFromLog(game, { turn: 40 })).toThrow("turns 1-6");
  expect(() => positionFromLog(game, { turn: 5 }, { perspective: "nobody" })).toThrow('no player "nobody"');
});

test("AutoSaved files: rich card markup and several games in one file", () => {
  const rich = SYNTHETIC.replace(/\["([A-Z0-9-]+)">\1\]/g, '[<mark><link="$1">$1</link></mark>]');
  // An earlier game that stopped during the setup, the game, then a rematch that never started.
  const earlier = rich.replace(/Tester/g, "Earlier").split("\n").slice(1, 60).join("\n");
  const rematchNeverStarted = [
    "RZ1|HDR|1",
    "RZ1|1|1|Don|9|9900|5|0|1|1|1|0|0",
    '[You] Leader is Roronoa Zoro [<mark><link="OP01-001">OP01-001</link></mark>]',
    "Opponent is Ready for Rematch",
  ].join("\n");
  const file = `${earlier}\n${rich}\n${rematchNeverStarted}\n`;
  const game = parseOptcgsimLog(file);
  expect(game.players[1].name).toBe("Tester#0001");
  expect(game.warnings).toEqual([]);
  expect(positionFromLog(game, { turn: 5 }).position.south).toEqual(positionFromLog(parseOptcgsimLog(SYNTHETIC), { turn: 5 }).position.south);
});

test("an imported position loads into the engine", () => {
  const dir = mkdtempSync(join(tmpdir(), "optcgsim-"));
  const file = join(dir, "turn5.json");
  const { position } = positionFromLog(parseOptcgsimLog(SYNTHETIC), { turn: 5, action: 2 }, { decks: DECKS });
  writeFileSync(file, JSON.stringify(position));
  const { state } = loadPosition(file);
  expect(state.activeSeat).toBe("south");
  expect(state.turnNumber).toBe(5);
  expect(state.players.south.hand.map((id) => state.cards[id]!.cardId)).toEqual(position.south.hand!);
  expect(state.players.north.hand.length).toBe(6);
  expect(state.players.south.activeDon).toBe(4);
  const sanji = state.cards[state.players.south.characterArea.find(Boolean)!]!;
  expect([sanji.cardId, sanji.rested, sanji.attachedDon]).toEqual(["OP04-007", true, 1]);
});

test("OPBounty 1.40 replay: missing frames repaired from snapshot lines", () => {
  const game = parseOptcgsimLog(OPBOUNTY);
  expect(game.players[1]).toEqual({ name: "Serghei#3106", leader: "OP16-080" });
  expect(game.players[2]).toEqual({ name: "waylay#9869", leader: "OP08-098" });
  expect(game.firstPlayer).toBe(2);
  expect(game.warnings).toContain("player 1: no Life frames in this log, assumed 4 Life from OP16-080");
  // Turn 4 starts right after the turn-3 snapshot (+ Serghei's draw).
  const { position } = positionFromLog(game, { turn: 4 }, { perspective: "Serghei#3106" });
  expect(position.toMove).toBe("south");
  expect(position.south.hand).toEqual(["OP12-112", "OP16-104", "OP16-116", "OP16-110", "OP16-103", "OP16-108", "OP16-110", "OP06-104"]);
  expect(position.south.life).toBe(3);
  expect(position.south.activeDon).toBe(4);
  expect(position.south.characters).toEqual([{ card: "OP09-095", rested: false, don: 0, justPlayed: false }]);
  expect(position.north).toMatchObject({ life: 5, handCount: 6, stage: "OP05-117", trash: ["OP08-110"], leaderRested: true, restedDon: 3 });
  // Waylay's turn 5, before Wyper: its 5 DON cost frames come before the "Deploy" line.
  const wyper = positionFromLog(game, { turn: 5, action: 1 }, { perspective: 2 }).position;
  expect(wyper.south.activeDon).toBe(5);
  expect(wyper.north.characters?.map((c) => c.card)).toEqual(["OP09-095", "OP16-110"]);
  expect(wyper.north.trash).toEqual(["OP16-106", "OP06-104", "OP16-103"]);
});
