/**
 * Card art in the end-to-end tests. The app loads card images from the URLs
 * in the card data (optcgapi.com). The tests never depend on that site: an
 * image is served from out/card-image-cache/ when it was downloaded before
 * (`bun e2e/fetch-card-images.ts`, for realistic screenshots) and otherwise
 * replaced by a small generated placeholder. Either way the browser sees a
 * successful image response, so missing art cannot fail the "no console
 * errors" check.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

export const CACHE_DIR = resolve(import.meta.dirname, "../../../out/card-image-cache");

export function cacheFileFor(url: string): string {
  return resolve(CACHE_DIR, url.replace(/^.*\/Card_Images\//, "").replace(/[^\w.-]/g, "_"));
}

function placeholder(url: string): string {
  const id = /Card_Images\/([A-Z0-9]+-\d{3})/.exec(url)?.[1] ?? "card";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="350" viewBox="0 0 250 350">
  <rect width="250" height="350" rx="14" fill="#f3e3c3" stroke="#7a1f2b" stroke-width="6"/>
  <text x="125" y="185" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="700" fill="#7a1f2b">${id}</text>
</svg>`;
}

export async function serveCardImages(page: Page): Promise<{ cached: number; placeholders: number }> {
  const stats = { cached: 0, placeholders: 0 };
  await page.route(/^https:\/\/(www\.)?optcgapi\.com\//, async (route) => {
    const url = route.request().url();
    const file = cacheFileFor(url);
    if (existsSync(file)) {
      stats.cached++;
      await route.fulfill({ status: 200, contentType: "image/jpeg", body: readFileSync(file) });
    } else {
      stats.placeholders++;
      await route.fulfill({ status: 200, contentType: "image/svg+xml", body: placeholder(url) });
    }
  });
  return stats;
}
