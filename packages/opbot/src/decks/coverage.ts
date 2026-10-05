/**
 * Engine coverage of a deck pool: are all the cards in the engine's catalog,
 * are the decks legal, and what happens when the engine actually plays them.
 *
 * The games are heuristic-vs-heuristic on the fast simulator. They do not
 * measure deck strength; they surface crashes, stuck games and the effects
 * the engine records as unsupported (`state.capabilityHistory`), which is
 * what decides whether a deck is usable for bot evaluation.
 */
import type { EngineCapabilityIssue, MatchSeat, MatchState } from "@tcg/op-engine";
import { createHeuristicAgent } from "../agents/heuristic.ts";
import type { Agent } from "../agents/types.ts";
import { playGame, type Termination } from "../arena/game.ts";
import { pendingPrompt } from "../engine/actions.ts";
import { hasCard } from "../engine/internals.ts";
import { applyInPlace, cloneState } from "../engine/sim.ts";
import { checkDeck, type DeckList } from "./deck.ts";

/** Card ids of the deck (Leader included) that the engine catalog does not know. */
export function missingCards(deck: Pick<DeckList, "leader" | "main">): string[] {
  return [...new Set([deck.leader, ...deck.main])].filter((id) => !hasCard(id)).sort();
}

export interface CatalogCoverage {
  readonly missing: string[];
  readonly legal: boolean;
  readonly problems: string[];
}

export function catalogCoverage(deck: DeckList): CatalogCoverage {
  const check = checkDeck(deck);
  return { missing: missingCards(deck), legal: check.valid, problems: check.problems };
}

const TERMINATIONS: readonly Termination[] = ["rules", "max-commands", "no-action", "illegal", "error"];

export interface EngineSupport {
  readonly deck: string;
  games: number;
  wins: number;
  readonly terminations: Record<Termination, number>;
  /** Unsupported-effect records attributed to this deck's cards. */
  capabilityIssues: number;
  /** Games in which this deck's cards produced at least one record. */
  gamesWithIssues: number;
  /** Records per "cardId code", to see which cards the engine cannot execute. */
  readonly issuesByCard: Map<string, number>;
  /**
   * Commands from this deck's seat that the engine rejected. The game driver
   * does not stop on them: it records them and plays the first legal action
   * instead (arena/game.ts), so they show up here and not as terminations.
   */
  rejected: number;
  /** Rejections per "cardId promptKind" of the prompt being answered ("- main-phase-action" outside prompts). */
  readonly rejectedByCard: Map<string, number>;
  /** Games that ended "illegal" on this deck's command: rejected and no legal fallback accepted. */
  illegalStops: number;
  /** Illegal stops per "cardId promptKind", as for `rejectedByCard`. */
  readonly illegalByCard: Map<string, number>;
  /** First line of each distinct crash message (termination "error"), at most five. */
  readonly errors: string[];
}

export interface SupportRun {
  readonly decks: EngineSupport[];
  readonly games: number;
  /** Sum over games of `capabilityHistory.length` (both seats). */
  readonly capabilityIssues: number;
  /** Rejected commands over all games (both seats). */
  readonly rejected: number;
  readonly terminations: Record<Termination, number>;
}

const emptyTerminations = () => Object.fromEntries(TERMINATIONS.map((t) => [t, 0])) as Record<Termination, number>;

/** "cardId promptKind" of the prompt `seat` is answering, or "- main-phase-action". */
function promptKey(state: MatchState, seat: MatchSeat): string {
  const prompt = pendingPrompt(state);
  return prompt && prompt.seat === seat ? `${prompt.sourceCardId ?? "-"} ${prompt.choiceKind ?? prompt.kind}` : "- main-phase-action";
}

/**
 * `agent`, but every command it returns is first tried on a copy of the state
 * with the same fast simulator the driver uses, so a rejection can be tied to
 * the prompt it answered (the driver only counts them). Costs one extra apply
 * per decision, which a coverage run can afford.
 */
function probing(agent: Agent, onRejected: (state: MatchState, seat: MatchSeat) => void): Agent {
  return {
    id: agent.id,
    honest: agent.honest,
    mulligan: (request) => agent.mulligan(request),
    decide(request) {
      const command = agent.decide(request);
      let accepted = false;
      try {
        accepted = applyInPlace(cloneState(request.state), command);
      } catch {
        accepted = false;
      }
      if (!accepted) onRejected(request.state, request.seat);
      return command;
    },
  };
}

/**
 * Plays `gamesPerPairing` games for every pair of distinct decks, alternating
 * seats and who goes first. A record is charged to the deck of the seat that
 * caused it, or to the deck(s) holding its source card when the actor is the
 * system. A rejected command (and an illegal-command stop) is charged to the
 * deck of the seat that sent it, keyed by the card whose prompt it was
 * answering: the bot only picks among the options the engine offers, so a
 * rejection there points at the engine's (or our action layer's) handling of
 * that card. `makeAgent` is the heuristic bot except in tests.
 */
export function engineSupport(
  decks: readonly DeckList[],
  gamesPerPairing: number,
  seed: string,
  onGame?: (done: number, total: number) => void,
  makeAgent: () => Agent = createHeuristicAgent,
): SupportRun {
  const support = decks.map(
    (d): EngineSupport => ({
      deck: d.name,
      games: 0,
      wins: 0,
      terminations: emptyTerminations(),
      capabilityIssues: 0,
      gamesWithIssues: 0,
      issuesByCard: new Map(),
      rejected: 0,
      rejectedByCard: new Map(),
      illegalStops: 0,
      illegalByCard: new Map(),
      errors: [],
    }),
  );
  const cardSets = decks.map((d) => new Set([d.leader, ...d.main]));
  const terminations = emptyTerminations();
  let capabilityIssues = 0;
  let rejected = 0;
  let played = 0;
  const total = ((decks.length * (decks.length - 1)) / 2) * gamesPerPairing;

  for (let i = 0; i < decks.length; i++) {
    for (let j = i + 1; j < decks.length; j++) {
      for (let g = 0; g < gamesPerPairing; g++) {
        const southIdx = g % 2 === 0 ? i : j;
        const northIdx = southIdx === i ? j : i;
        const firstSeat: MatchSeat = Math.floor(g / 2) % 2 === 0 ? "south" : "north";
        const idx: Record<MatchSeat, number> = { south: southIdx, north: northIdx };
        // The state handed to the last onDecision. capabilityHistory only
        // grows, so it holds every record but those of the game's final
        // command (those still count in the run total, `result.capabilityIssues`).
        let last: MatchState | null = null;
        let lastSeat: MatchSeat | null = null;
        let lastPrompt = "- main-phase-action";
        const onRejected = (state: MatchState, seat: MatchSeat) => {
          const s = support[idx[seat]]!;
          const key = promptKey(state, seat);
          s.rejectedByCard.set(key, (s.rejectedByCard.get(key) ?? 0) + 1);
        };
        const result = playGame(
          {
            seed: `${seed}-${i}-${j}-${g}`,
            decks: { south: decks[southIdx]!, north: decks[northIdx]! },
            firstSeat,
            engine: "fast",
          },
          { south: probing(makeAgent(), onRejected), north: probing(makeAgent(), onRejected) },
          {
            onDecision: (state, seat) => {
              last = state;
              lastSeat = seat;
              lastPrompt = promptKey(state, seat);
            },
          },
        );
        played++;
        terminations[result.termination]++;
        capabilityIssues += result.capabilityIssues;
        rejected += result.illegal.south + result.illegal.north;
        const history: readonly EngineCapabilityIssue[] = (last as MatchState | null)?.capabilityHistory ?? [];
        const perDeck = new Map<number, number>();
        for (const issue of history) {
          const owners =
            issue.actor === "south" || issue.actor === "north"
              ? [idx[issue.actor]]
              : [southIdx, northIdx].filter((k) => issue.sourceCardId !== null && cardSets[k]!.has(issue.sourceCardId));
          for (const k of new Set(owners)) {
            perDeck.set(k, (perDeck.get(k) ?? 0) + 1);
            const key = `${issue.sourceCardId ?? "-"} ${issue.code}`;
            support[k]!.issuesByCard.set(key, (support[k]!.issuesByCard.get(key) ?? 0) + 1);
          }
        }
        for (const seat of ["south", "north"] as const) {
          const s = support[idx[seat]]!;
          s.games++;
          s.terminations[result.termination]++;
          if (result.winner === seat) s.wins++;
          // The driver's own count, so the total is right even if the probe and
          // the driver ever disagreed; the probe only supplies the card.
          s.rejected += result.illegal[seat];
          const n = perDeck.get(idx[seat]) ?? 0;
          s.capabilityIssues += n;
          if (n > 0) s.gamesWithIssues++;
          if (result.termination === "error" && result.error) {
            const first = result.error.split("\n")[0]!;
            if (!s.errors.includes(first) && s.errors.length < 5) s.errors.push(first);
          }
        }
        const culprit = lastSeat as MatchSeat | null;
        if (result.termination === "illegal" && culprit !== null) {
          const s = support[idx[culprit]]!;
          s.illegalStops++;
          s.illegalByCard.set(lastPrompt, (s.illegalByCard.get(lastPrompt) ?? 0) + 1);
        }
        onGame?.(played, total);
      }
    }
  }
  return { decks: support, games: played, capabilityIssues, rejected, terminations };
}
