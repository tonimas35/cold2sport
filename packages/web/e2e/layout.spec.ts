/**
 * Layout at common window sizes: from DESKTOP_MIN_WIDTH (1240 px) up, the
 * desktop tabletop must fit (no clipped columns, move tray on screen);
 * narrower windows and tablets get the phone layout. Runs in the desktop
 * project only (it opens its own window sizes).
 */
import { expect, test } from "@playwright/test";
import { openAndStart, waitForHumanOrEnd, watchErrors } from "./driver.ts";

const DESKTOP_SIZES = [
  { width: 1240, height: 760 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];
const PHONE_LAYOUT_SIZES = [
  { width: 1239, height: 800 },
  { width: 1024, height: 768 },
  { width: 820, height: 1180 },
];

test("the desktop board fits from 1240 px; narrower windows get the phone layout", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "opens its own window sizes");
  for (const viewport of [...DESKTOP_SIZES, ...PHONE_LAYOUT_SIZES]) {
    const context = await browser.newContext({ viewport, baseURL: testInfo.project.use.baseURL });
    const page = await context.newPage();
    const watch = watchErrors(page);
    await openAndStart(page, { level: "rapido", first: "Yo", animations: "off", seed: "layout-1" });
    await waitForHumanOrEnd(page);
    await page.getByTestId("keep-hand").click();
    await waitForHumanOrEnd(page);
    const size = `${viewport.width}x${viewport.height}`;
    const layout = await page.locator("main[data-testid='one-piece-shell']").getAttribute("data-layout");

    if (viewport.width >= 1240) {
      expect(layout, size).toBe("desktop");
      const geometry = await page.evaluate(() => {
        const board = document.querySelector<HTMLElement>("[data-testid='one-piece-tabletop-board']");
        const playmat = board?.firstElementChild as HTMLElement | null;
        const mats = [...document.querySelectorAll<HTMLElement>("[data-testid='one-piece-tabletop-board'] section[data-seat]")];
        const tray = [...document.querySelectorAll<HTMLElement>("[aria-label='Table controls'] .tabletop-action-button")];
        const visible = playmat?.getBoundingClientRect();
        return {
          // Grid tracks wider than the playmat would push columns out of view.
          matOverflow: Math.max(...mats.map((mat) => mat.getBoundingClientRect().width - (playmat?.clientWidth ?? 0))),
          trayButtons: tray.length,
          trayOutside: tray.filter((button) => {
            const rect = button.getBoundingClientRect();
            return !visible || rect.right > visible.right + 1 || rect.left < visible.left - 1;
          }).length,
        };
      });
      expect(geometry.matOverflow, size).toBeLessThanOrEqual(1);
      expect(geometry.trayButtons, size).toBeGreaterThan(0);
      expect(geometry.trayOutside, size).toBe(0);
    } else {
      expect(layout, size).toBe("mobile");
      await expect(page.getByTestId("player-hand"), size).toBeVisible();
      await expect(page.getByTestId("show-moves"), size).toBeEnabled();
    }
    expect(watch.errors, size).toEqual([]);
    await context.close();
  }
});
