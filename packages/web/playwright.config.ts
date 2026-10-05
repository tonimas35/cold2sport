/**
 * End-to-end tests of the built app (`pnpm web:build` first): headless
 * Chromium at a phone size and a desktop size, against `vite preview`.
 * Browsers: the preinstalled ones (PLAYWRIGHT_BROWSERS_PATH); CHROMIUM_PATH
 * points at a specific binary if the bundled version does not match.
 */
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.WEB_E2E_PORT ?? 4174);
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.spec\.ts/,
  timeout: 15 * 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "../../out/web-e2e-results",
  use: {
    baseURL: `http://127.0.0.1:${port}/`,
    trace: "off",
    ...(executablePath && { launchOptions: { executablePath } }),
  },
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "phone",
      use: {
        ...devices["iPhone 13"],
        // Chromium with the iPhone 13 viewport (390x844), touch and mobile UA.
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1366, height: 820 } },
    },
  ],
});
