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

  // In CI we start the server manually in the workflow (so we can run a
  // diagnostic curl between build and tests). When PLAYWRIGHT_BASE_URL is
  // set, Playwright skips the webServer block entirely.
  // Locally (no env var), webServer auto-builds + starts.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm start",
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000, // build can take 60-120s on small VPS
        // Pipe BOTH stdout and stderr so CI logs surface server errors
        // (e.g. Supabase auth failures, layout errors). Without this, a
        // broken page just shows the global-error.tsx with no clue why.
        stdout: "pipe",
        stderr: "pipe",
        // Explicitly inherit env (Supabase URLs/keys, etc.) — Playwright
        // already inherits by default, but being explicit guards against
        // future regressions in env propagation. Drop undefined values to
        // satisfy Playwright's typed env map.
        env: Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined)
        ) as Record<string, string>,
      },
});
