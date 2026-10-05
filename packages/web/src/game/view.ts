/**
 * What the page receives after every move: the human's view of the game.
 *
 * The board is the upstream projection (`buildOnePieceBoardFromState`, which
 * calls the engine's `projectStateForSeat(state, "south")`), so hidden cards
 * are hidden by the engine's own rules. Everything else added here (legal
 * moves, the prompt, the battle, the move log) is south's own information or
 * public information; test/view.test.ts checks that a view does not change
 * when the cards the human cannot see are re-dealt.
 */
import {
  getLegalCommands,
  getPotentialCardCommands,
  projectStateForSeat,
  type EngineAnimation,
  type MatchSeat,
  type MatchState,
  type PromptState,
} from "@tcg/op-engine";
import { actingSeat, canSee, cardName, getCard, getCardCounter, getCardPower, pendingPrompt } from "@opbot/core/web";
import { buildOnePieceBoardFromState } from "@upstream/one-piece/data/projectVisualFixture.ts";
import { onePieceAnimationsToAnimationPlan } from "@upstream/one-piece/animation/onePieceAnimationAdapter.ts";
import type { AnimationPlanV2 } from "@tcg/protocol/animations";
import {
  BOT_SEAT,
  HUMAN_SEAT,
  type BattleView,
  type CardView,
  type GameView,
  type MoveView,
  type PromptOptionView,
  type PromptView,
  type ResultView,
  type Side,
} from "./protocol.ts";

const SIDE: Record<MatchSeat, Side> = { south: "human", north: "bot" };

interface PrintedCard {
  readonly cost?: number;
  readonly power?: number;
  readonly printings: ReadonlyArray<{ readonly imageUrl?: string }>;
}

export function cardImageUrl(cardId: string): string | null {
  return (getCard(cardId) as PrintedCard).printings[0]?.imageUrl ?? null;
}

/** A card the human may look at (the caller checks visibility). */
export function cardView(state: MatchState, instanceId: string): CardView | null {
  const instance = state.cards[instanceId];
  if (!instance) return null;
  const printed = getCard(instance.cardId) as PrintedCard;
  const inPlay = instance.zone === "leader" || instance.zone === "character" || instance.zone === "stage";
  let counter: number | null = null;
  try {
    counter = getCardCounter(state, instanceId) || null;
  } catch {
    counter = null;
  }
  return {
    instanceId,
    cardId: instance.cardId,
    name: cardName(instance.cardId),
    imageUrl: printed.printings[0]?.imageUrl ?? null,
    owner: SIDE[instance.owner],
    zone: instance.zone,
    power: inPlay && printed.power !== undefined ? getCardPower(state, instanceId) : (printed.power ?? null),
    cost: printed.cost ?? null,
    counter,
    rested: instance.rested,
  };
}

/** Cards in the human's own prompts are shown to the human by the engine (search results, its hand...). */
function promptCard(state: MatchState, id: string | undefined): CardView | null {
  if (!id) return null;
  const instance = state.cards[id];
  if (!instance) return null;
  if (!canSee(HUMAN_SEAT, instance) && instance.owner !== HUMAN_SEAT) return null;
  return cardView(state, id);
}

function promptMode(prompt: PromptState): PromptView["mode"] {
  switch (prompt.choiceKind) {
    case "orderCards":
      return "order";
    case "selectCards":
    case "selectTargets":
    case "costPayment":
      return "select";
    default:
      return "choice";
  }
}

function donKind(id: string): PromptOptionView["don"] {
  if (/^active-don:\d+$/.test(id)) return "active";
  if (/^rested-don:\d+$/.test(id)) return "rested";
  if (/^attached-don:/.test(id)) return "attached";
  return null;
}

export function promptView(state: MatchState, prompt: PromptState): PromptView {
  const mode = promptMode(prompt);
  const intent = (prompt.resolutionContext as { intent?: string } | null)?.intent ?? "unknown";
  const options: PromptOptionView[] = prompt.options.map((option) => ({
    id: option.id,
    label: option.label,
    enabled: option.enabled !== false,
    card: promptCard(state, option.targetId ?? option.id),
    don: donKind(option.id),
    skip: mode === "select" && option.id === "skip",
  }));
  return {
    id: prompt.id,
    mode,
    choiceKind: prompt.choiceKind,
    intent,
    label: prompt.label,
    details: prompt.details,
    min: prompt.minSelections,
    max: prompt.maxSelections,
    options,
    source: promptCard(state, prompt.sourceInstanceId ?? undefined),
  };
}

function battleView(state: MatchState): BattleView | null {
  const battle = state.battle;
  if (!battle || battle.step === "complete") return null;
  const attacker = cardView(state, battle.attackerId);
  const target = cardView(state, battle.targetId);
  if (!attacker || !target) return null;
  return {
    attacker,
    target,
    attackerPower: getCardPower(state, battle.attackerId),
    targetPower: getCardPower(state, battle.targetId),
    counterTotal: battle.counterTotal,
    step: battle.step,
    humanDefends: battle.defendingSeat === HUMAN_SEAT,
  };
}

/** Who must decide now. Setup is scripted except the two mulligans. */
export function actingSide(state: MatchState): Side | null {
  if (state.status === "finished") return null;
  if (state.status === "setup") {
    const decided = state.setup.mulliganDecided;
    if (!decided.south && (state.config.firstPlayer === HUMAN_SEAT || decided.north)) return "human";
    return "bot";
  }
  const seat = actingSeat(state);
  return seat ? SIDE[seat] : null;
}

export function resultView(state: MatchState): ResultView | null {
  if (state.status !== "finished") return null;
  return {
    winner: state.winner ? SIDE[state.winner] : null,
    reason: state.finishReason,
    turns: state.turnNumber,
  };
}

// Phase bookkeeping that the board already shows (turn ribbon).
const NOISE = /\benters (Refresh|Draw|DON!! phase|Main|End)\b|^Setup finished\.|^The match begins\./;

/** The engine's log lines with `sequence > since`, as south may read them. */
export function visibleLogLines(state: MatchState, since: number): string[] {
  return projectStateForSeat(state, HUMAN_SEAT)
    .logs.filter((log) => log.sequence > since && !NOISE.test(log.message))
    .map((log) => log.message);
}

export function animationPlan(animations: readonly EngineAnimation[], version: number): AnimationPlanV2 | null {
  try {
    return onePieceAnimationsToAnimationPlan(animations, `opbot:${version}`);
  } catch {
    // The upstream adapter throws on animation kinds it does not know: the
    // move is still applied, only without animation.
    return null;
  }
}

export interface ViewContext {
  readonly version: number;
  readonly plan: AnimationPlanV2 | null;
  readonly lastMove: MoveView | null;
  readonly botLabel: string;
}

export function buildView(state: MatchState, context: ViewContext): GameView {
  const board = buildOnePieceBoardFromState(state, {
    id: "opbot-practice",
    label: "Partida contra el bot",
    description: "Tú contra el bot de opbot.",
    logPrefix: "Empieza la partida.",
    viewer: HUMAN_SEAT,
  });
  for (const seat of board.table.seats) {
    seat.label = seat.id === "player" ? "Tú" : context.botLabel;
  }
  // The card art shows the printed power; in play the current power (DON!!,
  // buffs, debuffs) is what decides battles, so show it on Characters (the
  // board already prints the Leader's current power next to it).
  for (const entity of board.entities) {
    if (entity.dataAttributes?.["data-zone"] !== "character") continue;
    const power = entity.stats.find((s) => s.label === "Power");
    if (!power) continue;
    const now = Number(power.value);
    const base = Number(power.baseValue ?? power.value);
    entity.decorations = [
      ...(entity.decorations ?? []),
      {
        id: "current-power",
        slot: "bottom-start",
        ariaLabel: `Poder ${now}`,
        content: { kind: "text", text: String(now) },
        tone: now > base ? "positive" : now < base ? "negative" : "neutral",
      },
    ];
  }
  const acting = actingSide(state);
  const human = acting === "human";
  const legal = human ? getLegalCommands(state, HUMAN_SEAT).filter((d) => d.seat === HUMAN_SEAT) : [];
  const prompt = human ? pendingPrompt(state) : undefined;
  return {
    version: context.version,
    board,
    plan: context.plan,
    status: state.status === "finished" ? "finished" : state.status === "setup" ? "setup" : "active",
    turn: state.turnNumber,
    phase: state.phase,
    activeSide: SIDE[state.activeSeat],
    acting,
    legal,
    cardActions: human && state.status === "active" && !prompt ? getPotentialCardCommands(state, HUMAN_SEAT) : [],
    prompt: prompt && prompt.seat === HUMAN_SEAT ? promptView(state, prompt) : null,
    battle: battleView(state),
    humanActiveDon: state.players[HUMAN_SEAT].activeDon,
    lastMove: context.lastMove,
    result: resultView(state),
  };
}

export { BOT_SEAT, HUMAN_SEAT };
