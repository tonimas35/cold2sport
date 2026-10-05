/** End of the game: result, the record to download, and the optional post-game review. */
import type { GameRecord } from "@opbot/core/web";
import type { BotDecisionStat, GameSummary, ResultView, ReviewItem } from "../game/protocol.ts";
import classes from "./panels.module.css";

const REASONS: Record<string, string> = {
  leaderDamage: "El Líder recibió daño sin Vidas.",
  emptyDeck: "Mazo vacío.",
  concession: "Rendición.",
  effectWin: "Victoria por efecto de carta.",
  judgeDecision: "Decisión de juez.",
  draw: "Empate.",
};

const CATEGORY: Record<ReviewItem["category"], string> = {
  best: "la mejor",
  good: "buena",
  inaccuracy: "imprecisión",
  mistake: "error",
  blunder: "error grave",
};

export interface ReviewState {
  readonly done: number;
  readonly total: number;
  readonly items: readonly ReviewItem[] | null;
  readonly worlds: number;
}

export function recordFileName(record: GameRecord): string {
  return `opbot-${record.seed}.json`;
}

export function downloadRecord(record: GameRecord): void {
  // Same JSON as `pnpm opbot play` writes, so `pnpm opbot review --game <file>` reads it.
  const blob = new Blob([`${JSON.stringify(record, null, 1)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = recordFileName(record);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function pct(x: number): string {
  return `${(x * 100).toFixed(0)} %`;
}

export function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} s`;
}

export function GameOverPanel({
  result,
  record,
  summary,
  botDecisions,
  review,
  onReview,
  onRematch,
  onNewGame,
  onClose,
}: {
  readonly result: ResultView;
  readonly record: GameRecord;
  readonly summary: GameSummary;
  readonly botDecisions: readonly BotDecisionStat[];
  readonly review: ReviewState | null;
  readonly onReview: () => void;
  readonly onRematch: () => void;
  readonly onNewGame: () => void;
  readonly onClose: () => void;
}) {
  const outcome = result.winner === "human" ? "win" : result.winner === "bot" ? "loss" : "draw";
  const thinking = botDecisions.filter((d) => d.options > 1);
  const avgMs = thinking.length ? thinking.reduce((s, d) => s + d.millis, 0) / thinking.length : 0;
  const maxMs = thinking.reduce((m, d) => Math.max(m, d.millis), 0);
  const flagged = review?.items?.filter((i) => i.category === "inaccuracy" || i.category === "mistake" || i.category === "blunder") ?? [];
  const counts = (category: ReviewItem["category"]) => review?.items?.filter((i) => i.category === category).length ?? 0;

  return (
    <div className={classes.scrim} data-testid="game-over">
      <section className={classes.result} role="dialog" aria-modal="true" aria-label="Fin de la partida" data-outcome={outcome}>
        <header>
          <p className={classes.eyebrow}>Fin de la partida</p>
          <h2 data-testid="game-over-title">{outcome === "win" ? "¡Has ganado!" : outcome === "loss" ? "Gana el bot" : "Empate"}</h2>
          <p className={classes.muted}>{(result.reason && REASONS[result.reason]) ?? result.reason ?? ""}</p>
        </header>
        <dl className={classes.resultStats}>
          <div>
            <dt>Turnos</dt>
            <dd>{result.turns}</dd>
          </div>
          <div>
            <dt>Tu mazo</dt>
            <dd>{summary.humanDeck.leaderName}</dd>
          </div>
          <div>
            <dt>Bot</dt>
            <dd>
              {summary.botDeck.leaderName} · {summary.level.label}
            </dd>
          </div>
          <div>
            <dt>El bot pensó</dt>
            <dd>{thinking.length ? `${duration(avgMs)} de media (máx. ${duration(maxMs)})` : "—"}</dd>
          </div>
        </dl>
        <div className={classes.resultActions}>
          <button type="button" className={classes.primary} onClick={() => downloadRecord(record)} data-testid="download-record">
            Descargar partida
          </button>
          <button type="button" className={classes.button} onClick={onRematch} data-testid="rematch">
            Revancha
          </button>
          <button type="button" className={classes.button} onClick={onNewGame} data-testid="new-game">
            Nueva partida
          </button>
          <button type="button" className={classes.ghost} onClick={onClose}>
            Ver el tablero
          </button>
        </div>
        <p className={classes.muted}>
          El fichero es el mismo que guarda <code>pnpm opbot play</code>: revísalo a fondo con{" "}
          <code>pnpm opbot review --game {recordFileName(record)}</code>.
        </p>
        <section>
          <p className={classes.eyebrow}>Revisar partida</p>
          {!review ? (
            <>
              <p className={classes.muted}>
                El bot analiza tus decisiones con lo que sabías en cada momento (pocas simulaciones: orientativo). Tarda de unos segundos a
                un par de minutos.
              </p>
              <button type="button" className={classes.button} onClick={onReview} data-testid="review">
                Revisar mis jugadas
              </button>
            </>
          ) : !review.items ? (
            <>
              <p className={classes.muted}>
                Analizando {review.done} de {review.total || "…"} decisiones ({review.worlds} mundos por jugada)…
              </p>
              <div className={classes.progress}>
                <div style={{ width: `${review.total ? (100 * review.done) / review.total : 0}%` }} />
              </div>
            </>
          ) : (
            <div data-testid="review-result">
              <p className={classes.muted}>
                {review.items.length} decisiones con alternativas: {counts("best") + counts("good")} buenas, {counts("inaccuracy")}{" "}
                imprecisiones, {counts("mistake")} errores y {counts("blunder")} errores graves (solo se marcan las diferencias
                estadísticamente claras).
              </p>
              {flagged.length ? (
                <ul className={classes.reviewList}>
                  {flagged.map((item) => (
                    <li key={item.step} data-category={item.category}>
                      <strong>
                        Turno {item.turn}: {CATEGORY[item.category]} (−{(item.loss * 100).toFixed(1)} puntos)
                      </strong>
                      <br />
                      Jugaste «{item.played}» ({pct(item.playedWin)}); mejor «{item.best}» ({pct(item.bestWin)}).
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={classes.muted}>Nada destacable.</p>
              )}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
