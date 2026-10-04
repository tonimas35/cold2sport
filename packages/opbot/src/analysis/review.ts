/**
 * Post-game review: replay a recorded game and, at every decision of one seat
 * that had a real choice, compare the move played with the best move found by
 * the analyzer, using only the information that seat had at the time.
 *
 * Categories follow the chess convention, on win-probability lost:
 * inaccuracy >= 3 points, mistake >= 7, blunder >= 15. A move is only flagged
 * when it is *significantly* worse than the best one (the 95% interval of the
 * paired difference excludes zero): picking the maximum of noisy estimates
 * would otherwise flag good moves (winner's curse).
 */
import { createMatch, type EngineCommand, type GameLogEntry, type MatchSeat } from "@tcg/op-engine";
import { actingSeat, enumerateActions, sameCommand, type Action } from "../engine/actions.ts";
import { applyInPlace, cloneState } from "../engine/sim.ts";
import { Knowledge } from "../engine/knowledge.ts";
import { matchConfig, type GameSpec } from "../arena/game.ts";
import type { DeckList } from "../decks/deck.ts";
import { analyzePosition, type AnalysisConfig } from "./analyze.ts";
import { cardName } from "./render.ts";

export interface GameRecord {
  readonly version: 1;
  readonly date: string;
  readonly seed: string;
  readonly decks: Record<MatchSeat, DeckList>;
  readonly firstSeat: MatchSeat;
  readonly players: Record<MatchSeat, string>;
  readonly commandLog: readonly EngineCommand[];
  readonly winner: MatchSeat | null;
}

export type Category = "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export interface ReviewEntry {
  readonly step: number;
  readonly turn: number;
  readonly options: number;
  readonly played: string;
  readonly playedWin: number;
  readonly best: string;
  readonly bestWin: number;
  readonly loss: number;
  readonly category: Category;
}

export function categorize(loss: number): Category {
  if (loss <= 0.005) return "best";
  if (loss < 0.03) return "good";
  if (loss < 0.07) return "inaccuracy";
  if (loss < 0.15) return "mistake";
  return "blunder";
}

export function reviewGame(
  record: GameRecord,
  seat: MatchSeat,
  config: AnalysisConfig,
  onEntry?: (entry: ReviewEntry, done: number, total: number) => void,
): ReviewEntry[] {
  const spec: GameSpec = { seed: record.seed, decks: record.decks, firstSeat: record.firstSeat };
  let state = cloneState(createMatch(matchConfig(spec)));
  const knowledge = new Knowledge();
  // Count the decisions to review first, for progress reporting.
  const entries: ReviewEntry[] = [];
  const total = record.commandLog.filter((c) => c.seat === seat).length;
  let done = 0;
  for (const [step, command] of record.commandLog.entries()) {
    if (state.status === "active" && command.seat === seat && actingSeat(state) === seat) {
      done++;
      const actions = enumerateActions(state, seat);
      if (actions.length >= 2) {
        const played: Action = actions.find((a) => sameCommand(a.command, command)) ?? { key: "played", command };
        const analysis = analyzePosition(
          state,
          { ...config, seed: `${config.seed ?? "review"}:${step}`, knowledge: knowledge.knownBy(seat) },
          cardName,
          seat,
          [played],
        );
        const playedRow = analysis.actions.find((a) => a.key === played.key);
        const best = analysis.actions[0]!;
        if (playedRow) {
          const significant = playedRow.key !== best.key && playedRow.deltaCi95[1] < 0;
          const loss = Math.max(0, best.winProbability - playedRow.winProbability);
          const entry: ReviewEntry = {
            step,
            turn: state.turnNumber,
            options: analysis.actions.length,
            played: playedRow.label,
            playedWin: playedRow.winProbability,
            best: best.label,
            bestWin: best.winProbability,
            loss,
            category: significant ? categorize(loss) : loss <= 0.005 ? "best" : "good",
          };
          entries.push(entry);
          onEntry?.(entry, done, total);
        }
      }
    }
    const next = cloneState(state);
    const logs: GameLogEntry[] = [];
    if (!applyInPlace(next, command, logs)) throw new Error(`replay failed at step ${step}: ${JSON.stringify(command)}`);
    knowledge.observe(state, next, logs);
    state = next;
  }
  return entries;
}

export function formatReview(entries: readonly ReviewEntry[], seat: MatchSeat): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const counts = new Map<Category, number>();
  for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  const avgLoss = entries.length ? entries.reduce((s, e) => s + e.loss, 0) / entries.length : 0;
  const lines = [
    `Review for ${seat}: ${entries.length} decisions with a real choice. Average win% lost per decision: ${(avgLoss * 100).toFixed(2)} points.`,
    `best ${counts.get("best") ?? 0} | good ${counts.get("good") ?? 0} | inaccuracies ${counts.get("inaccuracy") ?? 0} | mistakes ${counts.get("mistake") ?? 0} | blunders ${counts.get("blunder") ?? 0}`,
    "",
  ];
  for (const e of entries) {
    if (e.category === "best" || e.category === "good") continue;
    lines.push(
      `turn ${e.turn} (step ${e.step}) ${e.category.toUpperCase()} -${(e.loss * 100).toFixed(1)}: played "${e.played}" (${pct(e.playedWin)}); best "${e.best}" (${pct(e.bestWin)})`,
    );
  }
  return lines.join("\n");
}
