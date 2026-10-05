/**
 * Bot think time per level, measured in the browser (the bot runs in the
 * game worker). Three CPU settings:
 *
 *   x1            this machine, desktop headless Chromium;
 *   devtools-x4   Chrome DevTools CPU throttling 4x (Emulation.setCPUThrottlingRate):
 *                 slows the page's main thread only, NOT the worker (see throttle.ts);
 *   process-x4    the renderer processes (page + worker) paused 3/4 of the time,
 *                 a stand-in for a phone ~4x slower than this machine.
 *
 * Not part of the default end-to-end run:
 *
 *   WEB_PERF=1 pnpm --filter @opbot/web exec playwright test think-time --project=desktop
 *
 * Writes out/web-think-times.json and prints one line per run.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { botThinkTimes, openAndStart, play, summarizeTimes } from "./driver.ts";
import { ProcessThrottle } from "./throttle.ts";

const OUT = resolve(import.meta.dirname, "../../../out/web-think-times.json");
const TURNS = Number(process.env.WEB_PERF_TURNS ?? 8);
const SEED = process.env.WEB_PERF_SEED ?? "think-time-1";

for (const cpu of ["x1", "devtools-x4", "process-x4"] as const) {
  for (const level of ["rapido", "normal", "fuerte"] as const) {
    test(`think time: ${level}, ${cpu}`, async ({ page }, testInfo) => {
      test.skip(!process.env.WEB_PERF, "set WEB_PERF=1 to measure");
      test.skip(testInfo.project.name !== "desktop", "measured on the desktop project");
      const throttle = cpu === "process-x4" ? new ProcessThrottle(4) : null;
      if (cpu === "devtools-x4") {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      }
      // Same seed for every run: the same deal, so the levels and CPU settings face the same positions at the start.
      await openAndStart(page, { level, first: "El bot", animations: "off", seed: SEED });
      throttle?.start();
      let result;
      try {
        result = await play(page, "desktop", { untilTurn: TURNS });
      } finally {
        throttle?.stop();
      }
      const summary = summarizeTimes(await botThinkTimes(page));
      expect(summary.withChoice).toBeGreaterThan(0);
      mkdirSync(resolve(OUT, ".."), { recursive: true });
      const all = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, "utf8")) as Record<string, unknown>) : {};
      all[`${level}@${cpu}`] = { level, cpu, seed: SEED, turnsPlayed: result.turn - 1, finished: result.finished, ...summary, measuredAt: new Date().toISOString() };
      writeFileSync(OUT, `${JSON.stringify(all, null, 1)}\n`);
      console.log(`[think] ${level} ${cpu}: ${JSON.stringify(summary)}`);
    });
  }
}
