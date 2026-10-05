/**
 * Bot levels offered by the web app. Every level is an *honest* agent of
 * @opbot/core: it decides on determinized worlds (the hidden cards re-dealt at
 * random), so it never reads the player's hand, the Life cards or the deck
 * order. The spec strings are the `pnpm opbot` agent specs, and they are what
 * the game record stores as the bot (`players.north`).
 *
 * "Rápido" is `policy-honest`, not `policy`: `policy` is an oracle agent (it
 * reads the true state, like the engine's own bots) and would cheat against a
 * human.
 */
import type { BotLevel, LevelInfo } from "./protocol.ts";

export const LEVELS: readonly LevelInfo[] = [
  {
    id: "rapido",
    label: "Rápido",
    agentSpec: "policy-honest",
    description: "Política rápida: la heurística del motor con las correcciones de opbot. Responde al instante.",
  },
  {
    id: "normal",
    label: "Normal",
    agentSpec: "search:sims=16,h=1,cands=8",
    description: "Búsqueda: 16 simulaciones por decisión sobre 8 jugadas candidatas.",
  },
  {
    id: "fuerte",
    label: "Fuerte",
    agentSpec: "search:sims=32,h=1,cands=12",
    description: "Búsqueda: 32 simulaciones por decisión sobre 12 jugadas candidatas. Piensa más en el móvil.",
  },
];

export function levelInfo(id: BotLevel): LevelInfo {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`unknown bot level ${id}`);
  return level;
}
