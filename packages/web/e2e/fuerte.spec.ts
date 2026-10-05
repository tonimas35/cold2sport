/**
 * The strongest level in the browser: at least three turns against the
 * Fuerte bot (search, 32 simulations per decision) on the desktop, recording
 * how long each bot decision took in the worker and whether the page's main
 * thread stayed responsive meanwhile (long tasks).
 * Output: out/web-screenshots/fuerte-think-times.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { botThinkTimes, openAndStart, play, summarizeTimes, watchErrors } from "./driver.ts";

const OUT = resolve(import.meta.dirname, "../../../out/web-screenshots");

test("three turns against the Fuerte bot", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop only (the phone layout is covered by the full game)");
  mkdirSync(OUT, { recursive: true });
  const watch = watchErrors(page);
  // Long main-thread tasks while the bot thinks would mean a frozen page.
  await page.addInitScript(() => {
    const holder = window as unknown as { __longTasks: number[] };
    holder.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) holder.__longTasks.push(Math.round(entry.duration));
    }).observe({ type: "longtask", buffered: true });
  });

  await openAndStart(page, { level: "fuerte", first: "El bot", animations: "off" });
  const result = await play(page, "desktop", { untilTurn: 6 });
  expect(result.turn).toBeGreaterThanOrEqual(6); // bot turns 1, 3 and 5 played

  const times = await botThinkTimes(page);
  const summary = summarizeTimes(times);
  const longTasks = await page.evaluate(() => (window as unknown as { __longTasks: number[] }).__longTasks);
  writeFileSync(`${OUT}/fuerte-think-times.json`, `${JSON.stringify({ summary, longTasks, times }, null, 1)}\n`);
  console.log(`[fuerte] turns ${result.turn - 1}, bot decisions ${summary.decisions} (${summary.withChoice} with a choice):`, summary);
  console.log(`[fuerte] main-thread long tasks (ms): ${longTasks.join(", ") || "none"}`);
  await page.screenshot({ path: `${OUT}/desktop-fuerte.png` });

  expect(summary.withChoice).toBeGreaterThan(5);
  // The worker thinks; the page must not: no main-thread task anywhere near a bot decision.
  expect(Math.max(0, ...longTasks)).toBeLessThan(Math.max(1000, summary.maxMs / 2));
  expect(watch.errors).toEqual([]);
});
