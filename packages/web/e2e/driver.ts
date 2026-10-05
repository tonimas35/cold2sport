/**
 * Plays the app through its UI like a (very simple) player: keeps the opening
 * hand, answers each prompt with its first option or its smallest answer,
 * and in its main phase takes the first listed move a few times before ending
 * the turn. Used by the end-to-end tests and the think-time measurement.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { serveCardImages } from "./card-images.ts";

export interface StartOptions {
  readonly humanDeck?: string;
  readonly botDeck?: string;
  readonly first?: "Yo" | "El bot" | "Al azar";
  readonly level: "rapido" | "normal" | "fuerte";
  /** `off` makes the tests fast; screenshots of animations need `normal`. */
  readonly animations?: "off" | "fast" | "normal";
  /** Fixed game seed (`?seed=`): the same deal every run. */
  readonly seed?: string;
}

export interface Watch {
  readonly errors: string[];
}

/** Collects console errors and page errors (the tests require none). */
export function watchErrors(page: Page): Watch {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("crash", () => errors.push("page crashed"));
  return { errors };
}

export async function openAndStart(page: Page, options: StartOptions): Promise<void> {
  await serveCardImages(page);
  await page.goto(`./?anim=${options.animations ?? "off"}${options.seed ? `&seed=${encodeURIComponent(options.seed)}` : ""}`);
  await expect(page.getByTestId("start-game")).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId("human-deck-select").selectOption(options.humanDeck ?? "meta:OP17-079-monkey-d-luffy");
  await page.getByTestId("bot-deck-select").selectOption(options.botDeck ?? "meta:OP17-039-rocks-d-xebec");
  await page.getByTestId("first-player").getByText(options.first ?? "Yo", { exact: true }).click();
  await page.getByTestId(`level-${options.level}`).click();
  await page.getByTestId("start-game").click();
  await expect(page.getByTestId("one-piece-shell")).toBeVisible({ timeout: 60_000 });
}

export async function htmlData(page: Page, key: string): Promise<string | undefined> {
  return page.evaluate((k) => document.documentElement.dataset[k], key);
}

/** Waits until the human must act or the game is over. Returns which. */
export async function waitForHumanOrEnd(page: Page, timeoutMs = 180_000): Promise<"human" | "over"> {
  const handle = await page.waitForFunction(
    () => {
      const data = document.documentElement.dataset;
      if (data.opbotStatus === "over") return "over";
      if (document.querySelector('[data-testid="game-error"]')) return "error";
      return data.opbotTurn === "human" ? "human" : null;
    },
    null,
    { timeout: timeoutMs, polling: 50 },
  );
  const result = (await handle.jsonValue()) as "human" | "over" | "error";
  if (result === "error") throw new Error(`game error: ${await page.getByTestId("game-error").innerText()}`);
  return result;
}

async function firstEnabled(locators: Locator): Promise<Locator | null> {
  const count = await locators.count();
  for (let i = 0; i < count; i++) {
    const candidate = locators.nth(i);
    if (await candidate.isEnabled()) return candidate;
  }
  return null;
}

export interface StepHooks {
  /** Called once the first time a prompt panel is on screen. */
  onPrompt?: () => Promise<void>;
}

/**
 * Makes one decision. `movesThisTurn` caps main-phase moves so the scripted
 * player always ends its turn. Returns what it did, for logging.
 */
export async function decide(page: Page, layout: "phone" | "desktop", movesThisTurn: number, hooks: StepHooks = {}): Promise<string> {
  if (await page.getByTestId("mulligan-panel").isVisible()) {
    await page.getByTestId("keep-hand").click();
    return "keep";
  }
  const prompt = page.getByTestId("prompt-panel");
  if (await prompt.isVisible()) {
    await hooks.onPrompt?.();
    const option = await firstEnabled(prompt.locator('[data-testid^="prompt-option-"]'));
    if (option) {
      await option.click();
      return "prompt:option";
    }
    for (const id of ["prompt-skip", "prompt-none"]) {
      const button = prompt.getByTestId(id);
      if ((await button.count()) && (await button.isEnabled())) {
        await button.click();
        return `prompt:${id}`;
      }
    }
    const confirm = prompt.getByTestId("prompt-confirm");
    const picks = prompt.locator('[data-testid^="prompt-pick-"]');
    for (let i = 0; i < (await picks.count()) && !(await confirm.isEnabled()); i++) {
      if (await picks.nth(i).isEnabled()) await picks.nth(i).click();
    }
    await confirm.click();
    return "prompt:confirm";
  }
  const choice = page.getByTestId("choice-panel");
  if (await choice.isVisible()) {
    const target = (await firstEnabled(choice.locator('[data-testid^="choice-target-"]'))) ?? choice.getByTestId("choice-don-1");
    await target.click();
    return "choice";
  }
  if (movesThisTurn < 5) {
    if (layout === "phone") {
      const show = page.getByTestId("show-moves");
      if (await show.isEnabled()) {
        await show.click();
        await page.getByTestId("moves-panel").getByTestId("move-0").click();
        return "move";
      }
    } else {
      const tray = page.getByTestId("one-piece-tabletop-board").getByLabel("Table controls").locator("button");
      const move = await firstEnabled(tray);
      if (move) {
        await move.click();
        return "move";
      }
    }
  }
  await page.getByTestId(layout === "phone" ? "end-turn-mobile" : "end-turn").click();
  return "end";
}

export interface PlayResult {
  readonly decisions: number;
  readonly finished: boolean;
  readonly turn: number;
}

/** Plays until the game is over, or until `untilTurn` is reached. */
export async function play(
  page: Page,
  layout: "phone" | "desktop",
  options: { untilTurn?: number; maxDecisions?: number; hooks?: StepHooks; onTurn?: (turn: number) => Promise<void> } = {},
): Promise<PlayResult> {
  let decisions = 0;
  let movesThisTurn = 0;
  let lastTurn = -1;
  for (; decisions < (options.maxDecisions ?? 2000); decisions++) {
    const state = await waitForHumanOrEnd(page);
    const turn = Number(await htmlData(page, "opbotTurnNumber"));
    if (state === "over") return { decisions, finished: true, turn };
    if (options.untilTurn !== undefined && turn >= options.untilTurn) return { decisions, finished: false, turn };
    if (turn !== lastTurn) {
      lastTurn = turn;
      movesThisTurn = 0;
      await options.onTurn?.(turn);
    }
    const before = await htmlData(page, "opbotVersion");
    const what = await decide(page, layout, movesThisTurn, options.hooks);
    if (what === "move") movesThisTurn++;
    // Wait for the answer: a new position, or a chooser opened by the move
    // (attack target, number of DON!!), so the next decision never acts on a
    // stale screen.
    await page
      .waitForFunction(
        (v) =>
          document.documentElement.dataset.opbotVersion !== v ||
          Boolean(document.querySelector('[data-testid="choice-panel"]')) ||
          Boolean(document.querySelector('[data-testid="game-error"]')),
        before,
        { timeout: 30_000, polling: 50 },
      )
      .catch(() => undefined);
  }
  throw new Error(`no end after ${decisions} decisions`);
}

export async function botThinkTimes(page: Page): Promise<Array<{ turn: number; ms: number; options: number | null }>> {
  return page.evaluate(() => (window as unknown as { __opbotStats?: { bot: Array<{ turn: number; ms: number; options: number | null }> } }).__opbotStats?.bot ?? []);
}

export function summarizeTimes(samples: ReadonlyArray<{ ms: number; options: number | null }>) {
  const thinking = samples.filter((s) => (s.options ?? 2) > 1).map((s) => s.ms).sort((a, b) => a - b);
  const pick = (q: number) => (thinking.length ? thinking[Math.min(thinking.length - 1, Math.floor(q * thinking.length))]! : 0);
  const mean = thinking.length ? thinking.reduce((a, b) => a + b, 0) / thinking.length : 0;
  return {
    decisions: samples.length,
    withChoice: thinking.length,
    meanMs: Math.round(mean),
    medianMs: Math.round(pick(0.5)),
    p90Ms: Math.round(pick(0.9)),
    maxMs: Math.round(thinking.at(-1) ?? 0),
  };
}
