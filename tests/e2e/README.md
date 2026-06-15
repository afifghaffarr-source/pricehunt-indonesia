# E2E Tests (Playwright)

End-to-end tests for the 4 critical user flows of BijakBeli.app.

## Setup

```bash
# One-time: install Playwright Chromium
npm run test:e2e:install
```

## Run

```bash
# Run all E2E tests (auto-starts `next build && next start` if needed)
npm run test:e2e

# Run with browser visible (debugging)
npm run test:e2e:headed

# Run against a specific URL (e.g. preview deployment)
PLAYWRIGHT_BASE_URL=https://staging.bijakbeli.app npm run test:e2e
```

## What we test

| File | Flow | Why it's critical |
|---|---|---|
| `tests/e2e/home.spec.ts` | Landing page renders hero + product cards | First impression, SEO landing |
| `tests/e2e/search.spec.ts` | Search bar → /search?q=... → results | Core feature |
| `tests/e2e/product-detail.spec.ts` | /product/[slug] renders offers + 404 for unknown | Deepest user path |
| `tests/e2e/auth.spec.ts` | Login form fields, validation, invalid-cred error | Account access |

## Why `next build && next start`, not `next dev`?

The dev server auto-restarts when memory approaches its threshold (~1.5 GB on
small VPS), which wipes the Turbopack cache. The next test that hits a fresh
route then exceeds the 30s navigation timeout on per-route compilation.

`next start` is deterministic — same as CI, no per-route compile, no memory
restart. The trade-off is a longer initial build (~60s on this VPS) but
tests then run in ~25s.

## Why `workers=1`?

The tests hit the real Supabase project. Running them in parallel would
risk hitting rate limits on the Supabase REST API. CI uses `--workers=1`
explicitly; locally you can drop the flag to run in parallel.

## CI

E2E runs as a separate workflow (`.github/workflows/e2e.yml`) on every
push to master/main and every PR. It:

1. Caches Playwright browsers between runs
2. Builds the app
3. Runs `npx playwright test --workers=1`
4. Uploads HTML report + traces as artifacts (3 days on success, 7 on failure)

The Vitest unit tests still run in the main `ci.yml` workflow.

## Adding a new test

1. Pick the closest existing spec file (or create a new one)
2. Use semantic locators first: `getByRole`, `getByLabel`, `getByText`
3. Use `data-testid` only as a last resort — semantic locators are more
   resilient to refactoring
4. Don't add `as any` to E2E — these tests should be the *most* type-safe
5. Run locally before pushing
