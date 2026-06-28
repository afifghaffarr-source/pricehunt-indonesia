# Coverage exclusions

This document explains why specific files are excluded from the v8 coverage
measurement in `vitest.config.ts`. The exclusion list exists so that the
coverage thresholds (lines: 26, functions: 21, branches: 28, statements: 26)
reflect **unit-testable** code, not infrastructure that is exercised by other
means.

Last updated: 2026-06-22 (v1.5.24 — coverage threshold tightening)

## Why some files are excluded

Coverage tools only see code that runs during the unit-test process. Code that
is exercised via other paths (Playwright E2E, live API integration, Vercel
runtime) will appear as "uncovered" because the unit-test process never
executes it. Excluding these files keeps the threshold meaningful without
forcing unrealistic mocking.

## Files excluded

### `src/lib/supabase/*` — DB layer via integration tests

| File | Reason |
|---|---|
| `admin.ts` | `createAdminClient()` reads `SUPABASE_SERVICE_ROLE_KEY` and throws if missing. Mocking the Supabase client to unit-test this is heavy and would just test the mock. The throw behavior is exercised by every API route that imports `createAdminClient` — any misconfiguration crashes in production immediately. |
| `auth.ts` | Supabase auth helpers. Same reasoning — integration-tested via `/api/auth/*` routes + E2E. |
| `client.ts` | Browser Supabase client. Requires `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The browser bundle is built by Next.js and exercised by E2E tests. |
| `server.ts` | Server Supabase client. Same — built and used by every server component + route. Integration coverage only. |
| `data.ts` | Pure barrel re-export from `transforms.ts`/`products.ts`/`prices.ts`/`user-data.ts`. The downstream files are tested individually. |
| `offers.ts` | 240 lines of `.from("offers").select(...)` patterns. Mocking Supabase for each query adds ~30 test mocks with no real coverage gain. All calls go through API routes that E2E exercises. |
| `user-data.ts` | Same pattern as `offers.ts` — Supabase query helpers. |

### `src/lib/vexo/*` — Vexo API client

| File | Reason |
|---|---|
| `client.ts` | 195 lines of fetch wrapper with caching, fallback chains, and Vexo API endpoints. Mocking fetch + the cache module is heavy. Sub-modules (`endpoints.ts`, `errors.ts`) ARE tested directly. The full client is exercised by the live Phase 8 collector in production. |
| `cache.ts` | In-memory TTL cache for Vexo responses. Only meaningfully testable with `vi.useFakeTimers()` plus a mocked `Date.now()`. The cache is a thin layer over `Map` — bugs would surface immediately in dev. |
| `normalizers.ts` | Response-shape transformations. Tested implicitly by `errors.ts` consumers + the live collector. |

### `src/lib/api-registry/**` — API registry

DB-driven admin page. All functions are `.from(...).select(...)` patterns;
integration-tested via the `/admin/api-registry` page (Playwright).

### `src/lib/marketplace/product-matcher.ts` — TBD

Currently unused in the active codebase. Was added for a marketplace-matching
feature that was deferred. Will be either:
- Deleted (if the feature is permanently dropped), or
- Moved to `apps/mobile/` (which is excluded from CI scope), or
- Tested once it has real consumers

Tracked: this exclusion is a tech-debt marker, not a permanent state.

## How to lift these exclusions

If you add unit tests for any excluded file, remove it from the
`vitest.config.ts` exclude list and re-run `npm run test:coverage`. The file
will then count toward the global thresholds — expect a small drop, which
is why we round down the thresholds for headroom.

## Threshold values

```
lines:      26%  (current measured: 26.59%)
functions:  21%  (current measured: 21.46%)
branches:   28%  (current measured: 28.35%)
statements: 26%  (current measured: 26.91%)
```

Set just below measured baseline to allow ~0.5–1 pp headroom for floating-
point jitter and future file additions that may slightly drop the average.

These numbers are **enforced** by `npm run test:coverage`. CI fails on
regression. To raise them, write more tests in `src/test/` — see existing
files for the pattern.