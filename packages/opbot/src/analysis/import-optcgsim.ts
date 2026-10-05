/**
 * Import a game played on OPTCGSim (or OPBounty, which records the same
 * combat log) and turn one moment of it into a position file (position.ts).
 *
 * Where the logs are: in the OPTCGSim install folder (the one holding
 * `OPTCGSim_Data`), `CombatLogs/` gets the logs saved with "Download Combat
 * Log" and `CombatLogs/AutoSaved/` one file per session, named after the local
 * time the game ended (`2026-10-02T11.53.41.log`). An AutoSaved file appends
 * rematches; only the last game of a file is read.
 *
 * Log format (OPTCGSim >= 1.40, complete from 1.43), one event per line:
 *
 *   [You] Deploy Perona ["OP12-034">OP12-034]            text, "[Opponent]" or a nickname as actor;
 *                                                        AutoSaved/OPBounty logs write the card as
 *                                                        [<mark><link="OP12-034">...</link></mark>]
 *   RZ1|179|2|OP12-034|1|3|2|0|1|1|0|0|0                 move frame: seq|player|card|fromZone|fromIdx|
 *                                                        toZone|toIdx|f1|f2|rested|0|0
 *   RZ1|CHK|179|2|40|4|1|5|9|1|0|0|1|0                   counts after that move: deck|hand|characters|
 *                                                        life|donDeck|costArea|trash|stage|1|attachedDon
 *   [Nick#123] Hand: [OP12-023,...] / Board: / Trash: / Life: 4    snapshot of both players, at every
 *                                                        end of turn and after some effects
 *
 * Player 1 is whoever saved the log ([You]), player 2 the opponent. Zones: 0
 * deck (index 0 = bottom), 1 hand, 2 characters, 3 life (last = top), 4 DON
 * deck, 5 cost area, 6 trash, 7 stage, 9 attached DON (index slot*100+n on a
 * character, 9900+n on the leader). A move takes the card at `fromIdx` and
 * inserts it at `toIdx`. Frames carry the real card id even for hidden cards,
 * so the log knows both hands and the Life cards; the position keeps the
 * opponent's hand hidden (a count) unless asked otherwise.
 *
 * What frames do not say is read from the text: turns ("Draw 1 Card" / the
 * first "Draw 1 Don"), the rested state of leaders and characters (attacks,
 * blocks, "X: Rest Y", "X: Set Y to Active", the refresh at turn start, which
 * is not logged) and which moments are clean main-phase decision points.
 * "X: Rest Y" does not say whose Y it is: X's card text decides when the
 * engine knows X, otherwise a guess (with a warning when both players have an
 * active Y, as in mirror matches). Older logs (OPBounty replays from 1.40) lack
 * the Life, stage-entry and shuffle frames: Life is assumed from the leader and
 * every snapshot line re-synchronises hand, characters, trash and Life (with a
 * warning when it changes something), so their mid-turn positions can be off
 * until the next snapshot.
 *
 * The importer cuts the game at a checkpoint: (turn, action) where action 0 is
 * the start of the main phase and action k the moment before the k-th main
 * action of the player to move (a play, a DON attach, an attack, an activated
 * effect, an event, End Turn). Decklists are not in the log: pass them, or use
 * `observed` (copies seen of each card) to pick or write them. Lost on the way,
 * because position files cannot express them: a rested stage, the order and
 * face of Life cards, temporary effects (power buffs, "cannot play" locks).
 */
import type { MatchSeat } from "@tcg/op-engine";
import { getCard, hasCard } from "../engine/internals.ts";
import type { PositionSpec } from "./position.ts";

type SideSpec = PositionSpec["south"];
type CharacterSpec = NonNullable<SideSpec["characters"]>[number];

export type LogPlayer = 1 | 2;
const PLAYERS: readonly LogPlayer[] = [1, 2];
const other = (p: LogPlayer): LogPlayer => (p === 1 ? 2 : 1);

const DECK = 0;
const HAND = 1;
const CHARACTERS = 2;
const LIFE = 3;
const DON_DECK = 4;
const COST_AREA = 5;
const TRASH = 6;
const STAGE = 7;
const ATTACHED = 9;
const LEADER_SLOT = 9900;

interface MoveEvent {
  readonly kind: "move";
  readonly line: number;
  readonly player: LogPlayer;
  readonly card: string;
  readonly from: number;
  readonly fromIndex: number;
  readonly to: number;
  readonly toIndex: number;
  readonly rested: boolean;
}

interface ZoneCounts {
  readonly deck: number;
  readonly hand: number;
  readonly characters: number;
  readonly life: number;
  readonly donDeck: number;
  readonly costArea: number;
  readonly trash: number;
  readonly stage: number;
  readonly attachedDon: number;
}

interface CountsEvent {
  readonly kind: "counts";
  readonly line: number;
  readonly player: LogPlayer;
  readonly counts: ZoneCounts;
}

interface TextEvent {
  readonly kind: "text";
  readonly line: number;
  /** "You", "Opponent", a nickname (zero-width characters removed), or null for system lines. */
  readonly actor: string | null;
  /** The line after the actor, card references rewritten as «ID», markup removed. */
  readonly body: string;
}

export type LogEvent = MoveEvent | CountsEvent | TextEvent;

/** A clean main-phase moment of the game, where a position can be cut. */
export interface Checkpoint {
  readonly turn: number;
  /** 0 = start of the main phase; k = before the k-th main action of the turn. */
  readonly action: number;
  /** Player to move. */
  readonly player: LogPlayer;
  /** 1-based log line of the action about to happen. */
  readonly line: number;
  /** That action, for listing ("Deploy Perona [OP12-034]", "End Turn"). */
  readonly next: string;
  /** Number of events applied at this moment. */
  readonly index: number;
}

export interface OptcgsimGame {
  readonly version: string | null;
  readonly players: Record<LogPlayer, { readonly name: string | null; readonly leader: string | null }>;
  readonly firstPlayer: LogPlayer | null;
  readonly turns: number;
  readonly checkpoints: readonly Checkpoint[];
  /** Copies of each card seen per player over the game: a lower bound of each decklist. */
  readonly observed: Record<LogPlayer, Readonly<Record<string, number>>>;
  readonly warnings: readonly string[];
  readonly events: readonly LogEvent[];
}

export interface ImportOptions {
  /** Whose position it is: 1 (default, who saved the log), 2, or a nickname. */
  readonly perspective?: LogPlayer | string;
  /** Seat given to that player (default "south"). */
  readonly seat?: MatchSeat;
  /** Deck file per seat, relative to where the position file will be saved. */
  readonly decks?: Partial<Record<MatchSeat, string>>;
  /** List the opponent's real hand (the log knows it) instead of a count. */
  readonly revealOpponentHand?: boolean;
}

export interface ImportedPosition {
  readonly position: PositionSpec & { readonly _comment: string };
  readonly checkpoint: Checkpoint;
  readonly leaders: Record<MatchSeat, string | null>;
  /** Problems found while replaying up to the checkpoint. */
  readonly warnings: readonly string[];
}

// ---------------------------------------------------------------- tokenizer

const MOVE = /^RZ1\|(\d+)\|([12])\|([^|]+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)/;
const CHK = /^RZ1\|CHK\|\d+\|([12])\|(.*)$/;
const REF = /\[(?:<mark>)?<link="([^"]+)">[^<]*<\/link>(?:<\/mark>)?\]|\["([^"]+)">[^\]]*\]/g;
const TAG = /<\/?[a-z][^>]*>/gi;
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const LEADER_LINE = /^\[[^\]]+\] Leader is /;
const TURN_LINE = /^\[[^\]]+\] (?:Draw \d+ (?:Cards?|Don)|End Turn)\s*$/;

/**
 * Line range of the last game played. AutoSaved files append rematches: a game
 * starts at its "Leader is" lines and counts only once someone takes a turn
 * (an accepted rematch that never started is not a game). After a game the
 * sim restarts the move numbering (RZ1|HDR, seq 1) to clear the table; those
 * moves belong to no game.
 */
function lastGame(lines: readonly string[]): [number, number] {
  let from = 0;
  let to = lines.length;
  let candidate = 0;
  let phase: "between" | "header" | "playing" = "between";
  let seq = 0;
  let moved = false;
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim();
    const move = MOVE.exec(line);
    if (move || line.startsWith("RZ1|HDR")) {
      const next = move ? Number(move[1]) : 0;
      if (phase === "playing" && (!move || next < seq)) {
        to = i;
        phase = "between";
      }
      if (move) seq = next;
      moved = true;
    } else if (LEADER_LINE.test(line)) {
      if (phase === "playing") to = i;
      // Both "Leader is" lines of a game come before its first move; one after moves starts another game.
      if (phase !== "header" || moved) candidate = i;
      phase = "header";
      moved = false;
    } else if (phase === "header" && TURN_LINE.test(line)) {
      phase = "playing";
      from = candidate;
      to = lines.length;
    }
  }
  return [from, to];
}

function tokenize(text: string): { events: LogEvent[]; version: string | null } {
  const lines = text.split(/\r?\n/);
  const [from, to] = lastGame(lines);
  let version: string | null = null;
  const events: LogEvent[] = [];
  for (let i = 0; i < to; i++) {
    const raw = lines[i]!.trim();
    const v = /^Version is (\S+)/.exec(raw);
    if (v) version = v[1]!;
    if (i < from || !raw) continue;
    const move = MOVE.exec(raw);
    if (move) {
      events.push({
        kind: "move",
        line: i + 1,
        player: move[2] === "1" ? 1 : 2,
        card: move[3]!,
        from: Number(move[4]),
        fromIndex: Number(move[5]),
        to: Number(move[6]),
        toIndex: Number(move[7]),
        rested: move[10] === "1",
      });
      continue;
    }
    const chk = CHK.exec(raw);
    if (chk) {
      const n = chk[2]!.split("|").map(Number);
      const at = (k: number): number => n[k] ?? 0;
      events.push({
        kind: "counts",
        line: i + 1,
        player: chk[1] === "1" ? 1 : 2,
        counts: {
          deck: at(0), hand: at(1), characters: at(2), life: at(3), donDeck: at(4),
          costArea: at(5), trash: at(6), stage: at(7), attachedDon: at(9),
        },
      });
      continue;
    }
    if (raw.startsWith("RZ1|")) continue;
    const line = raw
      .replace(REF, (_m: string, rich: string | undefined, plain: string | undefined) => `«${rich ?? plain}»`)
      .replace(TAG, "")
      .replace(ZERO_WIDTH, "")
      .trim();
    const actor = /^\[([^\]]*)\] ?(.*)$/.exec(line);
    events.push(
      actor
        ? { kind: "text", line: i + 1, actor: actor[1]!.trim(), body: actor[2]!.trim() }
        : { kind: "text", line: i + 1, actor: null, body: line },
    );
  }
  return { events, version };
}

// ---------------------------------------------------------------- replay

interface Card {
  id: string | null;
  rested: boolean;
  /** DON attached (characters only). */
  don: number;
  /** Turn it entered the character area or stage (-1 = unknown). */
  enteredTurn: number;
}

interface Side {
  leader: string | null;
  leaderRested: boolean;
  leaderDon: number;
  deck: Card[];
  hand: Card[];
  characters: Card[];
  life: Card[];
  trash: Card[];
  stage: Card[];
  donDeck: number;
  /** One entry per DON in the cost area: true = rested. */
  costArea: boolean[];
  lifeFrames: boolean;
}

const card = (id: string | null = null): Card => ({ id, rested: false, don: 0, enteredTurn: -1 });

function newSide(): Side {
  return {
    leader: null, leaderRested: false, leaderDon: 0,
    deck: Array.from({ length: 50 }, () => card()),
    hand: [], characters: [], life: [], trash: [], stage: [],
    donDeck: 10, costArea: [], lifeFrames: false,
  };
}

const ids = (cards: readonly Card[]): string[] => cards.flatMap((c) => (c.id === null ? [] : [c.id]));
const pretty = (body: string): string => body.replace(/«([^»]+)»/g, "[$1]");
const isStage = (id: string): boolean => hasCard(id) && getCard(id).cardType === "stage";

type RestSide = "own" | "opp";
const REST_CLAUSE = /\brest (?:up to )?(\d+|all) of your (opponent's )?([^.:;]*)|\brest this (?:character|card|stage)/g;
const restPlans = new Map<string, readonly RestSide[]>();

/**
 * Whose card each "Rest" of one activation of `source` targets, in order, from
 * the card text ("You may rest 2 of your cards: ... rest up to 1 of your
 * opponent's Characters" = own, own, opp). DON rests have their own log lines
 * and are skipped. Empty when the card is unknown to the engine.
 */
function restPlan(source: string): readonly RestSide[] {
  let plan = restPlans.get(source);
  if (plan) return plan;
  const text = hasCard(source) ? (getCard(source).effect ?? "").toLowerCase() : "";
  const sides: RestSide[] = [];
  for (const m of text.matchAll(REST_CLAUSE)) {
    if (m[1] === undefined) {
      sides.push("own");
      continue;
    }
    const what = m[3] ?? "";
    if (!what.startsWith("don")) {
      const n = m[1] === "all" ? 1 : Number(m[1]);
      for (let i = 0; i < n; i++) sides.push(m[2] ? "opp" : "own");
    }
    if (/\bthis (?:character|card|stage)\b/.test(what)) sides.push("own");
  }
  plan = sides;
  restPlans.set(source, plan);
  return plan;
}

const TEXT = {
  leader: /^Leader is .*«([^»]+)»$/,
  drew: /^Drew card from deck: .*«([^»]+)»/,
  snapshot: /^(Hand|Board|Trash|Life): ?(.*)$/,
  turnCard: /^Draw \d+ Cards?$/,
  turnDon: /^Draw \d+ Don$/,
  endTurn: /^End Turn$/,
  deploy: /^Deploy .*«([^»]+)»$/,
  attach: /^Attach \d+ Don to .*«([^»]+)»/,
  attack: /^.*«([^»]+)» attacking .*«([^»]+)»$/,
  blocks: /^.*«([^»]+)» Blocks$/,
  destroyed: /^.*«([^»]+)» Destroyed$/,
  effect: /^[^«]*«([^»]+)»: (.*)$/,
  vs: /«[^»]+»\[\d+\] vs .*«[^»]+»\[\d+\]$/,
  combatOver: /«[^»]+» hit for \d+ damage|^Attack Fails/,
  restDon: /^Rest (?:\d+ )?Don\b/,
  rest: /^Rest .*«([^»]+)»/,
  setActive: /^Set .*«([^»]+)» to Active$/,
  effectDeploy: /^Deploy(?:ed)? .*«([^»]+)»/,
};

/** Replays the events in order and keeps the board of both players. */
class Replay {
  readonly sides: Record<LogPlayer, Side> = { 1: newSide(), 2: newSide() };
  readonly nicks: Record<LogPlayer, string | null> = { 1: null, 2: null };
  readonly checkpoints: Checkpoint[] = [];
  readonly warnings: string[] = [];
  readonly observed: Record<LogPlayer, Record<string, number>> = { 1: {}, 2: {} };
  turn = 0;
  active: LogPlayer | null = null;
  firstPlayer: LogPlayer | null = null;

  private readonly events: readonly LogEvent[];
  private readonly names = new Map<string, LogPlayer>([["You", 1], ["Opponent", 2]]);
  private readonly pendingLeaders = new Map<string, string>();
  private pendingNick: { nick: string; card: string } | null = null;
  private pendingStage: { player: LogPlayer; card: string } | null = null;
  private turnOpen = false;
  private combat: "none" | "declared" | "compared" = "none";
  /** Cards of the current action: their effects are part of it, not a new action. */
  private actionCards = new Set<string>();
  private actionCount = 0;
  /** Rests done so far by the current activation, to match them with the card text. */
  private restRun: { key: string; count: number } | null = null;

  constructor(events: readonly LogEvent[]) {
    this.events = events;
  }

  run(stop = this.events.length): this {
    for (let i = 0; i < stop; i++) {
      const e = this.events[i]!;
      if (e.kind === "move") this.move(e);
      else if (e.kind === "counts") this.check(e);
      else this.text(e, i);
    }
    if (stop === this.events.length) this.observe();
    return this;
  }

  private warn(line: number, message: string): void {
    this.warnings.push(`line ${line}: ${message}`);
  }

  // ------------------------------------------------------------ move frames

  private move(e: MoveEvent): void {
    if (this.pendingNick && e.from === DECK && e.to === HAND && e.card === this.pendingNick.card) {
      this.bind(this.pendingNick.nick, e.player);
    }
    this.pendingNick = null;
    const side = this.sides[e.player];
    if (e.card === "Don") {
      this.moveDon(side, e);
      return;
    }
    const taken = this.take(side, e);
    if (taken) this.put(side, e, taken);
  }

  private zone(side: Side, zone: number): Card[] | null {
    switch (zone) {
      case DECK: return side.deck;
      case HAND: return side.hand;
      case CHARACTERS: return side.characters;
      case LIFE: return side.life;
      case TRASH: return side.trash;
      case STAGE: return side.stage;
      default: return null;
    }
  }

  private take(side: Side, e: MoveEvent): Card | null {
    const zone = this.zone(side, e.from);
    if (!zone) {
      this.warn(e.line, `unknown zone ${e.from}`);
      return null;
    }
    let index = e.fromIndex;
    const at = zone[index];
    if (!at || (at.id !== null && at.id !== e.card)) {
      // Index and id disagree (a frame the log left out): trust the id.
      index = zone.findIndex((c) => c.id === e.card);
      if (index < 0) index = zone.findIndex((c) => c.id === null);
      if (index < 0) {
        if (e.from !== DECK) this.warn(e.line, `${e.card} not found in zone ${e.from}`);
        return card(e.card);
      }
    }
    const taken = zone.splice(index, 1)[0]!;
    // A character going back to hand carries its rested flag: a check of the inferred state.
    if (e.from === CHARACTERS && e.to === HAND && taken.rested !== e.rested) {
      this.warn(e.line, `${e.card} left play ${e.rested ? "rested" : "active"}, replay had it ${taken.rested ? "rested" : "active"}`);
    }
    taken.id = e.card;
    taken.rested = false;
    taken.don = 0;
    return taken;
  }

  private put(side: Side, e: MoveEvent, c: Card): void {
    const zone = this.zone(side, e.to);
    if (!zone) {
      this.warn(e.line, `unknown zone ${e.to}`);
      return;
    }
    zone.splice(Math.min(e.toIndex, zone.length), 0, c);
    if (e.to === CHARACTERS || e.to === STAGE) {
      c.rested = e.rested;
      c.enteredTurn = this.turn;
    }
    if (e.to === LIFE) side.lifeFrames = true;
    if (e.to === STAGE && this.pendingStage?.card === e.card) this.pendingStage = null;
  }

  private moveDon(side: Side, e: MoveEvent): void {
    const area = side.costArea;
    const insert = (rested: boolean): void => void area.splice(Math.min(e.toIndex, area.length), 0, rested);
    const remove = (): void => {
      if (e.fromIndex < area.length) area.splice(e.fromIndex, 1);
      else this.warn(e.line, `no DON at cost area index ${e.fromIndex}`);
    };
    if (e.from === DON_DECK && e.to === COST_AREA) {
      side.donDeck--;
      insert(e.rested);
    } else if (e.from === COST_AREA && e.to === COST_AREA) {
      if (e.fromIndex < area.length) area[e.fromIndex] = e.rested;
      else this.warn(e.line, `no DON at cost area index ${e.fromIndex}`);
    } else if (e.from === COST_AREA && e.to === ATTACHED) {
      remove();
      this.attach(side, e.toIndex, 1, e.line);
    } else if (e.from === ATTACHED && e.to === COST_AREA) {
      this.attach(side, e.fromIndex, -1, e.line);
      insert(e.rested);
    } else if (e.from === COST_AREA && e.to === DON_DECK) {
      remove();
      side.donDeck++;
    } else if (e.from === ATTACHED && e.to === DON_DECK) {
      this.attach(side, e.fromIndex, -1, e.line);
      side.donDeck++;
    } else if (e.from === DON_DECK && e.to === ATTACHED) {
      side.donDeck--;
      this.attach(side, e.toIndex, 1, e.line);
    } else {
      this.warn(e.line, `unexpected DON move ${e.from}>${e.to}`);
    }
  }

  private attach(side: Side, slot: number, delta: number, line: number): void {
    if (slot >= LEADER_SLOT) {
      side.leaderDon = Math.max(0, side.leaderDon + delta);
      return;
    }
    const target = side.characters[Math.floor(slot / 100)];
    if (target) target.don = Math.max(0, target.don + delta);
    else this.warn(line, `no character at DON slot ${slot}`);
  }

  /** Count frames (1.43+): only checked, they would hide our own mistakes if applied. */
  private check(e: CountsEvent): void {
    const s = this.sides[e.player];
    const ours: ZoneCounts = {
      deck: s.deck.length, hand: s.hand.length, characters: s.characters.length, life: s.life.length,
      donDeck: s.donDeck, costArea: s.costArea.length, trash: s.trash.length, stage: s.stage.length,
      attachedDon: s.leaderDon + s.characters.reduce((n, c) => n + c.don, 0),
    };
    for (const key of Object.keys(ours) as (keyof ZoneCounts)[]) {
      if (ours[key] !== e.counts[key]) {
        this.warn(e.line, `player ${e.player} ${key}: replay has ${ours[key]}, log says ${e.counts[key]}`);
      }
    }
  }

  // ------------------------------------------------------------ text lines

  private bind(nick: string, player: LogPlayer): void {
    if (this.names.get(nick) === player) return;
    this.names.set(nick, player);
    this.nicks[player] = nick;
    const leader = this.pendingLeaders.get(nick);
    if (leader) this.sides[player].leader = leader;
  }

  private text(e: TextEvent, index: number): void {
    if (this.pendingStage) this.placeStage(e.line);
    const b = e.body;
    if (e.actor === null) {
      if (TEXT.vs.test(b)) this.combat = "compared";
      else if (TEXT.combatOver.test(b)) this.combat = "none";
      return;
    }
    const player = this.names.get(e.actor) ?? null;
    let m: RegExpExecArray | null;
    if ((m = TEXT.drew.exec(b))) {
      if (player === null) this.pendingNick = { nick: e.actor, card: m[1]! };
      else if (e.actor !== "You" && e.actor !== "Opponent") this.nicks[player] = e.actor;
      return;
    }
    if ((m = TEXT.leader.exec(b))) {
      if (player === null) this.pendingLeaders.set(e.actor, m[1]!);
      else this.sides[player].leader = m[1]!;
      return;
    }
    if (player === null) return;
    if ((m = TEXT.snapshot.exec(b))) {
      this.snapshot(player, m[1]!, m[2]!, e.line);
      return;
    }
    if ((TEXT.turnCard.test(b) && (!this.turnOpen || player !== this.active)) || (TEXT.turnDon.test(b) && this.turn === 0)) {
      this.startTurn(player);
      return;
    }
    if (!this.turnOpen) return;
    const mine = player === this.active;
    if (TEXT.endTurn.test(b)) {
      if (mine) {
        this.checkpoint(index, e);
        this.turnOpen = false;
      }
    } else if ((m = TEXT.attack.exec(b))) {
      if (mine) {
        this.checkpoint(index, e);
        this.actionCards = new Set([m[1]!]);
        this.combat = "declared";
        this.restAttacker(player, m[1]!, e.line);
      }
    } else if ((m = TEXT.deploy.exec(b))) {
      if (mine && this.combat === "none") {
        this.checkpoint(this.deployCut(index, player), e);
        this.actionCards = new Set([m[1]!]);
      }
      if (isStage(m[1]!)) this.pendingStage = { player, card: m[1]! };
    } else if ((m = TEXT.attach.exec(b))) {
      if (mine && this.combat === "none") {
        this.checkpoint(index, e);
        this.actionCards = new Set([m[1]!]);
      }
    } else if ((m = TEXT.blocks.exec(b))) {
      const id = m[1]!;
      const blocker = this.sides[player].characters.find((c) => c.id === id && !c.rested);
      if (blocker) blocker.rested = true;
      else this.warn(e.line, `no active ${id} to block with`);
    } else if (TEXT.destroyed.test(b)) {
      if (this.combat === "compared") this.combat = "none";
    } else if ((m = TEXT.effect.exec(b))) {
      this.effect(player, m[1]!, m[2]!, index, e);
    }
  }

  private effect(player: LogPlayer, source: string, rest: string, index: number, e: TextEvent): void {
    // A new activation (a leader/stage/character ability, an event from hand) is a
    // main action; effects of the cards already in play this action are not.
    if (player === this.active && this.combat === "none" && !this.actionCards.has(source) && this.owns(player, source)) {
      this.checkpoint(index, e);
      this.actionCards = new Set([source]);
    }
    let m: RegExpExecArray | null;
    if (TEXT.restDon.test(rest)) return;
    if ((m = TEXT.rest.exec(rest))) this.restByEffect(player, source, m[1]!, e.line);
    else if ((m = TEXT.setActive.exec(rest))) this.activateByEffect(player, m[1]!, e.line);
    else if ((m = TEXT.effectDeploy.exec(rest))) {
      this.actionCards.add(m[1]!);
      if (isStage(m[1]!)) this.pendingStage = { player, card: m[1]! };
    }
  }

  private owns(player: LogPlayer, id: string): boolean {
    const s = this.sides[player];
    return s.leader === id || [...s.stage, ...s.characters, ...s.hand].some((c) => c.id === id);
  }

  private startTurn(player: LogPlayer): void {
    if (this.turn === 0) this.assumeLife();
    else this.observe();
    this.turn++;
    this.active = player;
    this.firstPlayer ??= player;
    this.turnOpen = true;
    this.combat = "none";
    this.actionCards = new Set();
    this.actionCount = 0;
    this.restRun = null;
    // Refresh phase (not logged): attached DON came back through frames, everything stands up.
    const s = this.sides[player];
    s.leaderRested = false;
    for (const c of [...s.characters, ...s.stage]) c.rested = false;
    s.costArea = s.costArea.map(() => false);
  }

  /** Logs without Life frames (OPBounty 1.40): deal Life from the leader's value. */
  private assumeLife(): void {
    for (const p of PLAYERS) {
      const s = this.sides[p];
      if (s.lifeFrames || s.life.length > 0 || !s.leader || !hasCard(s.leader)) continue;
      const leader = getCard(s.leader);
      const life = leader.cardType === "leader" ? leader.life : 0;
      for (let i = 0; i < life; i++) s.life.push(s.deck.pop() ?? card());
      this.warnings.push(`player ${p}: no Life frames in this log, assumed ${life} Life from ${s.leader}`);
    }
  }

  /**
   * Main-phase cut before an action. A play's DON cost (and the stage or
   * character it replaces) is written before the "Deploy" line: those frames
   * belong to the play, so the cut goes before them.
   */
  private deployCut(index: number, player: LogPlayer): number {
    let cut = index;
    for (let k = index - 1; k >= 0; k--) {
      const ev = this.events[k]!;
      if (ev.kind === "counts") continue;
      const cost = ev.kind === "move" && ev.player === player &&
        ((ev.card === "Don" && ev.from === COST_AREA && ev.to === COST_AREA && ev.rested) ||
          (ev.card !== "Don" && (ev.from === STAGE || ev.from === CHARACTERS) && ev.to === TRASH));
      if (!cost) break;
      cut = k;
    }
    return cut;
  }

  private checkpoint(index: number, e: TextEvent): void {
    this.restRun = null;
    this.checkpoints.push({
      turn: this.turn,
      action: this.actionCount++,
      player: this.active!,
      line: e.line,
      next: pretty(e.body),
      index,
    });
  }

  private restAttacker(player: LogPlayer, id: string, line: number): void {
    const s = this.sides[player];
    if (s.leader === id && !s.leaderRested) {
      s.leaderRested = true;
      return;
    }
    const attacker = s.characters.find((c) => c.id === id && !c.rested);
    if (attacker) attacker.rested = true;
    else this.warn(line, `${id} attacks but is not an active card of player ${player}`);
  }

  /**
   * "Source: Rest Y" does not say whose Y it is. The card text decides when the
   * engine knows the card (n-th rest of this activation = n-th rest clause);
   * otherwise an own card when the source is the leader or Y itself, else the
   * opponent's. Either way a side without an active Y falls back to the other.
   */
  private restByEffect(player: LogPlayer, source: string, target: string, line: number): void {
    const own = this.sides[player];
    const opp = this.sides[other(player)];
    const key = `${player}:${source}`;
    if (this.restRun?.key !== key) this.restRun = { key, count: 0 };
    const plan = restPlan(source);
    const planned = plan[Math.min(this.restRun.count++, plan.length - 1)];
    const ownFirst = planned ? planned === "own" : source === own.leader || source === target;
    const [first, second] = ownFirst ? [own, opp] : [opp, own];
    const a = this.restable(first, target);
    const b = this.restable(second, target);
    if (a && b && !planned) this.warn(line, `"${source}: Rest ${target}": both players have one active, assumed ${ownFirst ? "own" : "opponent's"}`);
    const pick = a ?? b;
    if (pick) pick();
    else this.warn(line, `"${source}: Rest ${target}": no active ${target} in play`);
  }

  private restable(side: Side, id: string): (() => void) | null {
    if (side.leader === id && !side.leaderRested) return () => void (side.leaderRested = true);
    const c = [...side.characters, ...side.stage].find((x) => x.id === id && !x.rested);
    return c ? () => void (c.rested = true) : null;
  }

  private activateByEffect(player: LogPlayer, id: string, line: number): void {
    for (const s of [this.sides[player], this.sides[other(player)]]) {
      if (s.leader === id && s.leaderRested) {
        s.leaderRested = false;
        return;
      }
      const c = [...s.characters, ...s.stage].find((x) => x.id === id && x.rested);
      if (c) {
        c.rested = false;
        return;
      }
    }
    this.warn(line, `"Set ${id} to Active": no rested ${id} in play`);
  }

  /** Old logs: a stage played without its move frame. */
  private placeStage(line: number): void {
    const { player, card: id } = this.pendingStage!;
    this.pendingStage = null;
    const s = this.sides[player];
    const i = s.hand.findIndex((c) => c.id === id);
    const c = i >= 0 ? s.hand.splice(i, 1)[0]! : card(id);
    s.trash.push(...s.stage.splice(0));
    c.enteredTurn = this.turn;
    s.stage.push(c);
    this.warn(line, `stage ${id} placed without a move frame`);
  }

  /** Snapshot lines: authoritative lists, used to repair logs with missing frames. */
  private snapshot(player: LogPlayer, kind: string, value: string, line: number): void {
    const s = this.sides[player];
    if (kind === "Life") {
      const n = Number(value);
      if (!Number.isInteger(n) || n === s.life.length) return;
      this.warn(line, `player ${player} Life: replay has ${s.life.length}, log says ${n}; resynced`);
      while (s.life.length < n) s.life.push(s.deck.pop() ?? card());
      s.life.splice(n);
      return;
    }
    const want = value.replace(/^\[|\]$/g, "").split(",").map((x) => x.trim()).filter(Boolean);
    const zone = kind === "Hand" ? s.hand : kind === "Board" ? s.characters : s.trash;
    if (zone.length === want.length && zone.every((c, i) => c.id === want[i])) return;
    this.warn(line, `player ${player} ${kind}: replay has [${zone.map((c) => c.id ?? "?").join(",")}], log says [${want.join(",")}]; resynced`);
    const pool = zone.splice(0);
    for (const id of want) {
      let i = pool.findIndex((c) => c.id === id);
      if (i < 0) i = pool.findIndex((c) => c.id === null);
      let c = i >= 0 ? pool.splice(i, 1)[0]! : null;
      if (!c) {
        const d = s.deck.findLastIndex((x) => x.id === id || x.id === null);
        c = d >= 0 ? s.deck.splice(d, 1)[0]! : card();
      }
      c.id = id;
      zone.push(c);
    }
  }

  private observe(): void {
    for (const p of PLAYERS) {
      const s = this.sides[p];
      const counts = new Map<string, number>();
      for (const c of [...s.deck, ...s.hand, ...s.characters, ...s.life, ...s.trash, ...s.stage]) {
        if (c.id !== null) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
      }
      for (const [id, n] of counts) this.observed[p][id] = Math.max(this.observed[p][id] ?? 0, n);
    }
  }
}

// ---------------------------------------------------------------- public API

/** Parses a combat log (the last game in it) and finds its checkpoints. */
export function parseOptcgsimLog(text: string): OptcgsimGame {
  const { events, version } = tokenize(text);
  const replay = new Replay(events).run();
  if (replay.turn === 0) throw new Error("no turn found: is this an OPTCGSim combat log?");
  return {
    version,
    players: {
      1: { name: replay.nicks[1], leader: replay.sides[1].leader },
      2: { name: replay.nicks[2], leader: replay.sides[2].leader },
    },
    firstPlayer: replay.firstPlayer,
    turns: replay.turn,
    checkpoints: replay.checkpoints,
    observed: replay.observed,
    warnings: replay.warnings,
    events,
  };
}

function resolvePerspective(game: OptcgsimGame, who: LogPlayer | string | undefined): LogPlayer {
  if (who === undefined || who === 1 || who === 2) return who ?? 1;
  const name = who.replace(ZERO_WIDTH, "").toLowerCase();
  const p = PLAYERS.find((x) => game.players[x].name?.toLowerCase() === name);
  if (!p) throw new Error(`no player "${who}" in this log (players: ${game.players[1].name}, ${game.players[2].name})`);
  return p;
}

/** The position at a checkpoint, from one player's point of view. */
export function positionFromLog(
  game: OptcgsimGame,
  at: { readonly turn: number; readonly action?: number },
  options: ImportOptions = {},
): ImportedPosition {
  const action = at.action ?? 0;
  const checkpoint = game.checkpoints.find((c) => c.turn === at.turn && c.action === action);
  if (!checkpoint) {
    const inTurn = game.checkpoints.filter((c) => c.turn === at.turn);
    throw new Error(
      inTurn.length === 0
        ? `turn ${at.turn} has no main phase in this log (turns 1-${game.turns})`
        : `turn ${at.turn} has actions 0-${inTurn.length - 1}, not ${action}`,
    );
  }
  const me = resolvePerspective(game, options.perspective);
  const seat = options.seat ?? "south";
  const otherSeat: MatchSeat = seat === "south" ? "north" : "south";
  const seatOf = (p: LogPlayer): MatchSeat => (p === me ? seat : otherSeat);
  const replay = new Replay(game.events).run(checkpoint.index);

  const side = (p: LogPlayer): SideSpec => {
    const s = replay.sides[p];
    const hand = ids(s.hand);
    const showHand = p === me || options.revealOpponentHand === true;
    const toMove = p === checkpoint.player;
    const characters: CharacterSpec[] = s.characters.flatMap((c) =>
      c.id === null ? [] : [{ card: c.id, rested: c.rested, don: c.don, justPlayed: toMove && c.enteredTurn === checkpoint.turn }],
    );
    return {
      deck: options.decks?.[seatOf(p)] ?? `TODO-deck-${s.leader ?? "unknown"}.txt`,
      life: s.life.length,
      ...(showHand ? { hand } : {}),
      ...(!showHand || hand.length < s.hand.length ? { handCount: s.hand.length } : {}),
      characters,
      stage: s.stage[0]?.id ?? null,
      trash: ids(s.trash),
      leaderDon: s.leaderDon,
      leaderRested: s.leaderRested,
      activeDon: s.costArea.filter((r) => !r).length,
      restedDon: s.costArea.filter((r) => r).length,
    };
  };

  const mine = side(me);
  const theirs = side(other(me));
  const name = (p: LogPlayer): string => game.players[p].name ?? (p === 1 ? "You" : "Opponent");
  const position = {
    _comment:
      `Imported from an OPTCGSim log (version ${game.version ?? "?"}): turn ${checkpoint.turn}, before "${checkpoint.next}" ` +
      `(log line ${checkpoint.line}). ${name(me)} (${replay.sides[me].leader ?? "?"}) is ${seat}, ` +
      `${name(other(me))} (${replay.sides[other(me)].leader ?? "?"}) is ${otherSeat}.`,
    toMove: seatOf(checkpoint.player),
    turn: checkpoint.turn,
    firstPlayer: seatOf(game.firstPlayer ?? checkpoint.player),
    south: seat === "south" ? mine : theirs,
    north: seat === "south" ? theirs : mine,
  };
  return {
    position,
    checkpoint,
    leaders: {
      south: replay.sides[seat === "south" ? me : other(me)].leader,
      north: replay.sides[seat === "south" ? other(me) : me].leader,
    },
    warnings: replay.warnings,
  };
}

/** A deck text (decks/*.txt format) with the copies seen of each card; usually under 50 cards. */
export function observedDeckText(game: OptcgsimGame, player: LogPlayer): string {
  const leader = game.players[player].leader;
  const seen = Object.entries(game.observed[player]).sort(([a], [b]) => a.localeCompare(b));
  const total = seen.reduce((n, [, copies]) => n + copies, 0);
  return [
    `# seen in an OPTCGSim log: ${total} of 50 cards`,
    ...(leader ? [`1x${leader}`] : []),
    ...seen.map(([id, copies]) => `${copies}x${id}`),
  ].join("\n");
}

// bun packages/opbot/src/analysis/import-optcgsim.ts <log> [--turn N [--action K]] [--perspective 1|2|nick]
//   [--seat south|north] [--south-deck PATH] [--north-deck PATH] [--reveal-opponent-hand] > position.json
// Without --turn it lists the checkpoints and the cards seen per player; with it, prints the
// position JSON. Deck paths are written as given: relative to where the JSON will be saved.
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");
  const argv = process.argv.slice(2);
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const file = argv[0];
  if (!file || file.startsWith("--")) {
    console.error(
      "usage: import-optcgsim.ts <combat log> [--turn N [--action K]] [--perspective 1|2|nick] [--seat south|north]\n" +
        "         [--south-deck PATH] [--north-deck PATH] [--reveal-opponent-hand]",
    );
    process.exit(2);
  }
  const game = parseOptcgsimLog(readFileSync(file, "utf8"));
  const turn = flag("turn");
  if (turn === undefined) {
    for (const p of PLAYERS) {
      const { name, leader } = game.players[p];
      console.log(`player ${p}: ${name ?? "?"} (${leader ?? "?"})${game.firstPlayer === p ? ", went first" : ""}`);
    }
    for (const c of game.checkpoints) console.log(`turn ${c.turn} action ${c.action} [player ${c.player}] before ${c.next}`);
    for (const p of PLAYERS) console.log(`\n${observedDeckText(game, p)}`);
    if (game.warnings.length > 0) console.log(`\n${game.warnings.length} warnings:\n${game.warnings.join("\n")}`);
  } else {
    const perspective = flag("perspective");
    const seat = flag("seat");
    const south = flag("south-deck");
    const north = flag("north-deck");
    const result = positionFromLog(game, { turn: Number(turn), action: Number(flag("action") ?? 0) }, {
      ...(perspective !== undefined && {
        perspective: perspective === "1" || perspective === "2" ? (Number(perspective) as LogPlayer) : perspective,
      }),
      ...(seat === "south" || seat === "north" ? { seat } : {}),
      decks: { ...(south !== undefined && { south }), ...(north !== undefined && { north }) },
      revealOpponentHand: argv.includes("--reveal-opponent-hand"),
    });
    for (const w of result.warnings) console.error(`warning: ${w}`);
    console.log(JSON.stringify(result.position, null, 2));
  }
}
