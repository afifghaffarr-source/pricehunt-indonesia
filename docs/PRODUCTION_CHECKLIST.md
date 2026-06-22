# Production Deployment Checklist

Last updated: 2026-06-14

Use this checklist before every production deploy. It is intentionally
short and ordered by blast radius. If a box is unchecked, do not ship.

---

## 1. Code quality gates (blocking, automated in CI)

- [ ] `npm ci` clean
- [ ] `npm run lint` — 0 errors (warnings allowed only with a `// eslint-disable-next-line` comment in-tree)
- [ ] `npm run typecheck` — `tsc --noEmit` exit 0
- [ ] `npm run test` — all tests pass
- [ ] `npm run build` — exit 0, all routes registered, proxy (middleware) present

CI runs all of the above. **Do not bypass the CI run with `gh workflow run --force`.**

---

## 2. Database / migrations

- [ ] All migrations in `supabase/migrations/` from `001_` through the latest have been applied to the target environment
- [ ] No `DROP TABLE … CASCADE` in any un-applied migration. If you need to drop, follow `docs/MIGRATION_ROLLBACK.md` and use a separate cleanup migration
- [ ] `admin_users` (migration 121) is populated. See `docs/ADMIN_SEED.md` for the first-admin flow
- [ ] `supabase/migrations/122_performance_indexes_safe.sql` applied — no volatile `NOW()` predicates in partial indexes
- [ ] RLS policies verified for:
  - `admin_users` — only service role / explicit admin can write
  - `user_profiles` — user cannot set `is_admin`/`role` from the client
  - `products`, `offers`, `prices` — read public, write admin/service only

---

## 3. Environment variables (Vercel → Production)

Required (server-only, do not prefix with `NEXT_PUBLIC_`):

- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `INGESTION_SECRET`
- `RESEND_API_KEY`
- `OPENAI_API_KEY` (or `VEXO_API_KEY` if Vexo is the AI provider)
- `VEXO_API_KEY` (marketplace images, etc.)
- `VEXO_API_BASE_URL` — defaults to `https://vexoapi.dev` if unset. Used by `/api/vexo/*` and `/api/internal/vexo-search`.
- `VEXO_API_TIMEOUT_MS` — defaults to `10000` (10 s). Used by `/api/vexo/health`.
- `VEXO_CACHE_TTL_SECONDS` — defaults to `3600` (1 h). Used by `/api/vexo/health`.
- `ENABLE_PRICE_SIMULATION` — **must be `false` in production**. When `true`, `/api/cron/prices` and `/api/scrape` overwrite real prices with random simulation values. Use only for dev/testing.
- `VAPID_PRIVATE_KEY` — Web Push server-side signing key. Pair with `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Push-notification callers treat a missing pair as "feature unavailable".
- `VAPID_SUBJECT` — defaults to `mailto:admin@bijakbeli.id`. Web Push `subject` claim.
- `EXTERNAL_API_KEY` — optional. Used by `src/lib/api-auth.ts` for admin API authentication. Routes return 503 (fail-closed) when unset.
- `SENTRY_DSN` — optional. Server-side error reporting.
- `SENTRY_ORG` / `SENTRY_PROJECT` — build-time only. Required only when `SENTRY_DSN` is set (Sentry plugin in `next.config.ts`).
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (if rate-limiting moves off in-memory)

Public (exposed to the browser — **no secrets**):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` — preferred. Read via `getAppUrl()` from `@/lib/app-url` (single source of truth)
- `NEXT_PUBLIC_SITE_URL` — **deprecated legacy**. Kept as fallback in `getAppUrl()` only; do not use directly.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — Web Push browser key (safe to expose).
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` — optional. Google Search Console HTML tag verification.
- `NEXT_PUBLIC_SENTRY_DSN` — optional. Browser-side Sentry DSN.

Framework / runtime (not configurable):

- `NODE_ENV` — set automatically by Next.js (`development` | `production` | `test`)
- `VERCEL_URL` — auto-injected by Vercel at runtime. Used as a fallback by `getAppUrl()` when `NEXT_PUBLIC_APP_URL` is unset.

Centralised helpers (see `src/lib/env.ts` — **server-only**):

- `getIngestionSecret()` — replaces the 7× duplicated `const expectedSecret = process.env.INGESTION_SECRET` reads across `/api/ingestion/*`, `/api/refresh/*`, `/api/internal/vexo-search`, and `src/proxy.ts`. Returns `null` when unset (caller decides whether to reject with 401 or 500).
- `getCronSecret()` — replaces the direct `process.env.CRON_SECRET` read in `src/proxy.ts`. Returns `null` when unset.
- `getVexoConfig()` — returns `{ baseUrl, apiKey, timeoutMs, cacheTtlSeconds }`. Defaults baked in once (previously hardcoded in 3 routes). Invalid numeric values fall back to defaults with a `console.warn`.
- `getVapidConfig()` — returns `{ publicKey, privateKey, subject }` or `null` when keys are missing. Used by `src/lib/push-notifications.ts`.
- `isPriceSimulationEnabled()` — typed wrapper around `process.env.ENABLE_PRICE_SIMULATION === 'true'`. Used by `/api/cron/prices` and `/api/scrape`.

See `.env.production.local.example` for the full annotated list with sample values.

---

## 4. Security headers (set in `next.config.ts`)

Verify on `https://<your-domain>/` (production only) with `curl -I`:

- [ ] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- [ ] `Cross-Origin-Opener-Policy: same-origin`
- [ ] `Cross-Origin-Resource-Policy: same-origin`
- [ ] `Cross-Origin-Embedder-Policy: credentialless`
- [ ] `Content-Security-Policy` present, no `unsafe-eval` in production
- [ ] `X-Powered-By` header **not** present (`poweredByHeader: false`)

---

## 5. Admin access

- [ ] At least one row in `admin_users` with the deployer's user UUID
- [ ] That user's `auth.users.email_confirmed_at` is set
- [ ] Direct verification on `/admin` and `/admin/data-collection` — both should render the admin shell, not redirect to login
- [ ] Service-role key is **not** exposed to the browser bundle (`grep -r "SUPABASE_SERVICE_ROLE_KEY" .next/static` returns nothing)

---

## 6. CSRF / CORS

- [ ] `/api/admin/*` rejects same-origin POST without `x-csrf-token` cookie+header (verify by curling)
- [ ] Cross-origin POST to `/api/admin/*` is rejected even with a valid token
- [ ] `Access-Control-Allow-Origin` echoes only origins in `ALLOWED_ORIGINS` (or `chrome-extension://*` for the extension)
- [ ] `chrome-extension://*` pattern still works for the price-collection extension

---

## 7. Cron jobs

Vercel cron schedules are defined in `vercel.json`. Verify they appear in
Vercel → Project → Settings → Cron Jobs after deploy.

- [ ] `/api/cron/prices` — every 30 min
- [ ] `/api/cron/conflicts` — every hour
- [ ] `/api/cron/recheck` — every 6 hours

Each handler must reject requests that don't carry `Authorization: Bearer <CRON_SECRET>`.

---

## 8. Error / observability

- [ ] `src/app/error.tsx` and `src/app/global-error.tsx` render the
      generic Indonesian message in production (NODE_ENV !== "development")
- [ ] `error.digest` is logged to the error reporting service (currently
      `console.error` — wire to Sentry/equivalent before public launch)
- [ ] No `console.log` of full request bodies, tokens, or service-role keys
      in the build output (`grep -r "console.log" src/ | grep -iE "token|key|password"` should be empty)

---

## 9. Performance / UX smoke (manual, ~10 min)

- [ ] Homepage loads < 2 s on a throttled "Fast 3G" run in DevTools
- [ ] Search returns results in < 1.5 s for a common query (e.g. "iPhone")
- [ ] Product page renders offers (not a 404) for at least 5 sampled products
- [ ] Report-price submit shows a success toast and persists to the DB
- [ ] Admin conflict resolution updates `conflicts.status` to `resolved` and is reflected after a page refresh
- [ ] Wishlist + price alert sign-up works end-to-end on mobile (DevTools device emulation)

---

## 10. Rollback plan

- [ ] Vercel: previous deployment is one click away (Project → Deployments → Promote to Production)
- [ ] Database: backup taken via Supabase dashboard before the migration window if migration touches `offers` / `prices` / `products` data
- [ ] `docs/MIGRATION_ROLLBACK.md` is up to date for the migration set being shipped

If rollback is needed:

1. Vercel: Promote the previous deployment.
2. If a migration is the cause: stop the app, run the inverse SQL described in `docs/MIGRATION_ROLLBACK.md` against Supabase, then redeploy the previous app version.
3. Communicate in `#pricehunt-incidents`.

---

## Sign-off

- [ ] Engineer of record: _____________  Date: _______
- [ ] Reviewer: _____________  Date: _______

---

## 11. Audit findings (2026-06-17)

Schema and code audit discovered significant drift between the migration
files in this repo and the live prod database. Anyone running through
this checklist should know the recent context.

### What was found

- **Migration 108 was never fully applied to prod.** The
  `price_conflicts` table was missing 8 columns. The admin conflict
  resolution page was 100% broken in prod (the empty table hid the bug).
- **21 columns existed in prod that no migration declared.** Likely
  hand-applied via the Supabase Dashboard. Affected tables:
  `price_conflicts` (9), `price_reports` (5), `recheck_requests` (4),
  `crawl_targets` (3).
- **`recheck_requests` had 3 column renames between migration 110 and
  prod** (`priority` → `priority_score`, `completed_at` → `processed_at`,
  `result` → `result_message`). Code was already aligned with prod;
  only the migration files were stale.
- **The PostgREST embed `offer:offers(...)` on `price_conflicts`
  became ambiguous** after migration 133 added a second FK to `offers`
  (`keep_offer_id`). The conflicts list returned HTTP 300 with
  `PGRST201 "Could not embed because more than one relationship"`.

### What was applied

| Migration | Purpose | Status |
|---|---|---|
| 133 | Add `keep_offer_id` to `price_conflicts` | applied |
| 134 | Repair 8 missing columns on `price_conflicts` (table was empty so NOT NULL + FK applied cleanly) | applied |
| 135 | Add 21 prod-only columns to 4 tables so a fresh DB setup matches prod | applied |
| Route fix `f4d340f` | Disambiguate the `offer:offers` embed with `!price_conflicts_offer_id_fkey` | deployed |

### Pre-deploy check additions

Before running this checklist, verify the migrations above have been
applied to the target environment. If you are spinning up a **fresh**
prod (not an existing one), the migration order is:
`001_…132_ → 133 → 134 → 135 → 136+`. Skipping any of 133/134/135
re-introduces the audit's findings.

### Code audit state

- All 5 security-critical issues (P1–P5) confirmed fixed in v1.5.27
- P6 (report-price enum mismatch) fixed
- P7 (conflict resolution) — route + migrations 133/134/135 + embed fix
- P8 (product notFound) — already correct
- P9 (search pagination) — fixed, locked in by new test
  `src/test/search-pagination.test.ts`
- P10–P17, P19 — confirmed fixed in earlier work
- P14 (destructive migrations) — documented in migration 123
- **P18 (env vars, broad) — CLOSED in v1.5.23.** Full audit completed; central
  helpers added in `src/lib/env.ts`. The PRODUCTION_CHECKLIST section 3 now
  matches the actual code: 14 env vars previously undocumented are added
  (`VEXO_API_BASE_URL`, `VEXO_API_TIMEOUT_MS`, `VEXO_CACHE_TTL_SECONDS`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_SENTRY_DSN`,
  `ENABLE_PRICE_SIMULATION`, `SENTRY_ORG`, `SENTRY_PROJECT`,
  `EXTERNAL_API_KEY`, `NEXT_PUBLIC_SITE_URL` legacy, `VERCEL_URL` runtime).
  Two env vars previously listed as required were removed because the code
  never reads them: `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the codebase
  uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` via the
  Supabase client helpers).
- **P20 (type safety, residual) — CLOSED in v1.5.22.** Zero `: any` / `as any`
  / `@ts-ignore` in `src/app` + `src/lib` + `src/components` + `src/test`.
  (Production code was already clean since v1.5.21; the remaining 1 `as any`
  in `src/test/freshness-claim-regression.test.tsx` was a deliberate defensive
  contract test for null. Fixed by widening the `TrustSignalsBar` prop type
  to `lastUpdated?: Date | string | null` so the type is honest about what
  the runtime accepts.) Scripts under `scripts/` are intentionally excluded
  from tsconfig and eslint (operational tooling, out of CI scope); they
  retain their own `any` usage and are not part of this P20 closure.
- P21 (docs) — addressed by `docs/architecture.md` etc. landing pages

### Tests

- Unit: 496 passing, 3 skipped, 0 failing
- Coverage thresholds are soft (set to 0 in `vitest.config.ts`).
  Tighten when the team commits to coverage goals.
