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

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (used by client too, but also needed server-side)
- `CRON_SECRET`
- `INGESTION_SECRET`
- `RESEND_API_KEY`
- `OPENAI_API_KEY` (or `VEXO_API_KEY` if Vexo is the AI provider)
- `VEXO_API_KEY` (marketplace images, etc.)
- `NEXT_PUBLIC_APP_URL` — single source of truth for app origin (used by `getAppUrl()` in `src/lib/app-url.ts`)

Public (exposed to the browser — **no secrets**):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Optional:

- `SENTRY_DSN` (if/when wired in)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (if rate-limiting moves off in-memory)

See `.env.production.local.example` for the full annotated list.

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
