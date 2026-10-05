/**
 * A whole game through the UI, on a phone and on a desktop: Luffy (OP17-079)
 * against the Rápido bot with Rocks (OP17-039). The scripted player clicks
 * its way to the end; the game must finish with a winner, with no console
 * errors, and the downloaded record must be the `pnpm opbot play` format.
 * Screenshots: out/web-screenshots/<project>-{start,mid,prompt,end}.png.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { serveCardImages } from "./card-images.ts";
import { htmlData, openAndStart, play, waitForHumanOrEnd, watchErrors } from "./driver.ts";

const SHOTS = resolve(import.meta.dirname, "../../../out/web-screenshots");
const RECORDS = resolve(import.meta.dirname, "../../../out/web-records");

test("a full game against the Rápido bot", async ({ page }, testInfo) => {
  const layout = testInfo.project.name === "phone" ? "phone" : "desktop";
  mkdirSync(SHOTS, { recursive: true });
  mkdirSync(RECORDS, { recursive: true });
  const watch = watchErrors(page);
  const shot = (name: string) => page.screenshot({ path: `${SHOTS}/${layout}-${name}.png` });

  await openAndStart(page, { level: "rapido", first: "Yo", animations: "off" });
  await waitForHumanOrEnd(page);
  await shot("start");

  let promptShot = false;
  let midShot = false;
  const result = await play(page, layout, {
    hooks: {
      onPrompt: async () => {
        if (promptShot) return;
        promptShot = true;
        await shot("prompt");
      },
    },
    onTurn: async (turn) => {
      if (!midShot && turn >= 5) {
        midShot = true;
        await shot("mid");
      }
    },
  });
  expect(result.finished).toBe(true);

  const over = page.getByTestId("game-over");
  await expect(over).toBeVisible();
  const title = await page.getByTestId("game-over-title").innerText();
  expect(["¡Has ganado!", "Gana el bot"]).toContain(title);
  await shot("end");

  // The record downloads in the `pnpm opbot play` format.
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("download-record").click();
  const download = await downloadPromise;
  const file = resolve(RECORDS, `${layout}-${download.suggestedFilename()}`);
  await download.saveAs(file);
  const record = JSON.parse(readFileSync(file, "utf8"));
  expect(record.version).toBe(1);
  expect(record.players).toEqual({ south: "human", north: "policy-honest" });
  expect(record.decks.south.leader).toBe("OP17-079");
  expect(record.decks.north.leader).toBe("OP17-039");
  expect(["south", "north"]).toContain(record.winner);
  expect(record.commandLog.length).toBeGreaterThan(30);

  // Post-game review in the worker (desktop only: it is the slow part).
  if (layout === "desktop") {
    const started = Date.now();
    await page.getByTestId("review").click();
    await expect(page.getByTestId("review-result")).toBeVisible({ timeout: 10 * 60_000 });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[${layout}] review: ${seconds} s — ${(await page.getByTestId("review-result").innerText()).split("\n")[0]}`);
    await page.screenshot({ path: `${SHOTS}/${layout}-review.png` });
  }

  testInfo.annotations.push({
    type: "result",
    description: `${title} in turn ${await htmlData(page, "opbotTurnNumber")} after ${result.decisions} human decisions; record ${file}`,
  });
  console.log(`[${layout}] ${title} · turn ${await htmlData(page, "opbotTurnNumber")} · ${result.decisions} decisions · ${file}`);
  expect(watch.errors).toEqual([]);
  expect(promptShot).toBe(true);
});

test("a deck pasted with an error is refused with a readable message", async ({ page }) => {
  const watch = watchErrors(page);
  await serveCardImages(page);
  await page.goto("./?anim=off");
  await expect(page.getByTestId("start-game")).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId("human-deck-select").selectOption("paste");
  await page.getByTestId("human-deck-text").fill("1xOP17-079\n4xOP17-086\nhola mundo");
  await expect(page.getByTestId("human-deck-errors")).toContainText("Línea 3");
  await expect(page.getByTestId("start-game")).toBeDisabled();
  expect(watch.errors).toEqual([]);
});
