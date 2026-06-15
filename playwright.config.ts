import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test config for BijakBeli.app
 *
 * Tests critical user flows against the real running app + real Supabase
 * (read-only by default). The `webServer` block auto-starts `next dev` if
 * the app isn't already running.
 *
 * Override base URL for staging/production runs:
 *   PLAYWRIGHT_BASE_URL=https://staging.bijakbeli.app npx playwright test
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Generous timeouts — first request triggers DB warmup
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Auto-build + start `next start` only when hitting localhost.
  // We use production mode (not dev) because:
  //   1. dev server's memory threshold restart (default ~1.5GB) wipes the
  //      Turbopack cache, causing next test to hit 30s compile timeout
  //   2. `next start` is deterministic — same as CI
  // Skip with PLAYWRIGHT_BASE_URL pointing to an already-running server.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm start",
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000, // build can take 60-120s on small VPS
        stdout: "ignore",
        stderr: "pipe",
      },
});
