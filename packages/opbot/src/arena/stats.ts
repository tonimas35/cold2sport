/**
 * Statistics for paired bot evaluation.
 *
 * A *pair* is two games played on the same seed (same shuffles, same deck
 * pairing, same player going first) with the two bots swapping seats. Pairing
 * removes most of the luck of the draw, so far fewer games are needed than with
 * independent games. Each pair yields a score for the candidate in
 * {0, 0.25, 0.5, 0.75, 1} (average of its two game scores, a draw counting
 * 0.5): the "pentanomial" model used by chess engine testing (fishtest).
 */

export interface PairTally {
  /** counts[k] = number of pairs where the candidate scored k/4 (k = 0..4). */
  readonly counts: readonly [number, number, number, number, number];
}

export function emptyTally(): PairTally {
  return { counts: [0, 0, 0, 0, 0] };
}

/** gameScores are the candidate's results in the two games (1 win, 0.5 draw, 0 loss). */
export function addPair(tally: PairTally, gameScores: readonly [number, number]): PairTally {
  for (const g of gameScores) {
    if (g !== 0 && g !== 0.5 && g !== 1) throw new Error(`invalid game score ${g}`);
  }
  const k = Math.round((gameScores[0] + gameScores[1]) * 2);
  const counts = [...tally.counts] as [number, number, number, number, number];
  counts[k] = (counts[k] ?? 0) + 1;
  return { counts };
}

export function pairCount(tally: PairTally): number {
  return tally.counts.reduce((a, b) => a + b, 0);
}

export interface ScoreEstimate {
  pairs: number;
  /** Mean candidate score per game, in [0, 1]. */
  score: number;
  /** Standard error of `score`, from the pair-level variance. */
  stderr: number;
  /** 95% confidence interval for `score`. */
  ci95: [number, number];
  /** Elo difference implied by `score` (logistic model), and its 95% CI. */
  elo: number;
  eloCi95: [number, number];
}

export function scoreToElo(score: number): number {
  const s = Math.min(Math.max(score, 1e-6), 1 - 1e-6);
  return -400 * Math.log10(1 / s - 1);
}

export function eloToScore(elo: number): number {
  return 1 / (1 + 10 ** (-elo / 400));
}

function moments(tally: PairTally): { n: number; mean: number; variance: number } {
  const n = pairCount(tally);
  if (n === 0) return { n, mean: 0.5, variance: 0 };
  let mean = 0;
  tally.counts.forEach((c, k) => (mean += (c * k) / 4));
  mean /= n;
  let variance = 0;
  tally.counts.forEach((c, k) => (variance += c * (k / 4 - mean) ** 2));
  variance /= n;
  return { n, mean, variance };
}

export function estimate(tally: PairTally): ScoreEstimate {
  const { n, mean, variance } = moments(tally);
  const stderr = n > 1 ? Math.sqrt(variance / (n - 1)) : 0.5;
  const lo = Math.max(0, mean - 1.96 * stderr);
  const hi = Math.min(1, mean + 1.96 * stderr);
  return {
    pairs: n,
    score: mean,
    stderr,
    ci95: [lo, hi],
    elo: scoreToElo(mean),
    eloCi95: [scoreToElo(lo), scoreToElo(hi)],
  };
}

export interface SprtConfig {
  /** H0: candidate is `elo0` Elo stronger (usually 0). */
  elo0: number;
  /** H1: candidate is `elo1` Elo stronger. */
  elo1: number;
  /** Type I error (accept H1 when H0 holds). */
  alpha: number;
  /** Type II error (accept H0 when H1 holds). */
  beta: number;
}

export type SprtDecision = "H1" | "H0" | "continue";

export interface SprtResult {
  llr: number;
  lower: number;
  upper: number;
  decision: SprtDecision;
}

/**
 * Generalized SPRT with the normal approximation on pair scores
 * (M. Van den Bergh, "A practical introduction to the GSPRT", as used by
 * fishtest): LLR ~= N (s1 - s0) (2 m - s0 - s1) / (2 v).
 */
export function sprt(tally: PairTally, config: SprtConfig): SprtResult {
  const lower = Math.log(config.beta / (1 - config.alpha));
  const upper = Math.log((1 - config.beta) / config.alpha);
  const { n, mean, variance } = moments(tally);
  if (n < 2 || variance <= 0) return { llr: 0, lower, upper, decision: "continue" };
  const s0 = eloToScore(config.elo0);
  const s1 = eloToScore(config.elo1);
  const llr = (n * (s1 - s0) * (2 * mean - s0 - s1)) / (2 * variance);
  const decision: SprtDecision = llr >= upper ? "H1" : llr <= lower ? "H0" : "continue";
  return { llr, lower, upper, decision };
}

export function formatEstimate(e: ScoreEstimate): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const elo = (x: number) => (Number.isFinite(x) ? x.toFixed(0) : x > 0 ? "+inf" : "-inf");
  return `score ${pct(e.score)} [${pct(e.ci95[0])}, ${pct(e.ci95[1])}] | Elo ${elo(e.elo)} [${elo(e.eloCi95[0])}, ${elo(e.eloCi95[1])}] | pairs ${e.pairs}`;
}
