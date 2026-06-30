import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/test/**/*.test.ts", "src/**/*.test.ts", "src/**/*.test.tsx", "__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    exclude: ["node_modules", ".next", ".kilo", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "lcov"],
      include: [
        "src/lib/**/*.{ts,tsx}",
        "src/app/api/**/*.{ts,tsx}",
        "src/components/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/types/**",
        "src/**/types.ts",
        "src/**/index.ts",
        // DB-layer helpers exercised through Supabase integration tests + E2E,
        // not unit tests. Listed in docs/COVERAGE_EXCLUSIONS.md with rationale.
        "src/lib/supabase/admin.ts",
        "src/lib/supabase/auth.ts",
        "src/lib/supabase/client.ts",
        "src/lib/supabase/server.ts",
        "src/lib/supabase/data.ts",
        "src/lib/supabase/offers.ts",
        "src/lib/supabase/user-data.ts",
        // Vexo client is exercised through route handlers + live collector;
        // pure-helper sub-modules (errors.ts) are covered directly.
        "src/lib/vexo/client.ts",
        "src/lib/vexo/cache.ts",
        "src/lib/vexo/normalizers.ts",
        // API registry reads through Supabase.
        "src/lib/api-registry/**",
        // Schema/types barrels with no executable logic.
        "src/lib/marketplace/product-matcher.ts",
        // Marketplace scrapers hit live HTTP + Playwright/Camoufox browsers
        // that don't work in jsdom unit tests. The browser extension is the
        // production data path; these adapters are reference implementations
        // for future residential-proxy setups. Re-include once mocked.
        "src/lib/scraper/brave-search-shopping-adapter.ts",
        "src/lib/scraper/multi-strategy-shopping-adapter.ts",
        "src/lib/scraper/shopee-camoufox-adapter.ts",
        "src/lib/scraper/shopee-normalizer.ts",
      ],
      thresholds: {
        // v1.5.24 (2026-06-22): tightened from 0 to current measured baseline.
        // Round-down buffer accounts for floating-point jitter + future file
        // additions that may slightly drop the percentage. CI fails on regression.
        // 4 new test files added in this commit:
        //   src/test/env.test.ts        (covers src/lib/env.ts)
        //   src/test/validation.test.ts (covers src/lib/validation.ts)
        //   src/test/vexo-errors.test.ts (covers src/lib/vexo/errors.ts)
        //   see docs/COVERAGE_EXCLUSIONS.md for the exclude rationale.
        lines: 26,
        functions: 21,
        branches: 28,
        statements: 26,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
