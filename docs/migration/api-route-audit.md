# API Route Audit — Vercel → Cloudflare Pages Migration

**Date:** 2026-07-01
**Auditor:** Hermes subagent
**Total routes audited:** 56 (incl. 5 cron routes)
**Scope:** `src/app/api/**/route.ts` and `route.tsx`

## Categories

1. **DELETE** — not critical. Remove during migration.
2. **KEEP_AS_STATIC** — only reads via Supabase client (anon + user session). Replace with direct client-side `supabase-js` call from the static bundle; no server route needed.
3. **MOVE_TO_SUPABASE_EDGE** — needs `SERVICE_ROLE_KEY`, external API keys (Vexo, OpenAI, Resend), or runs as cron. Must move to Supabase Edge Functions (Deno).
4. **MOVE_TO_CF_PAGES_FUNCTIONS** — needs server-side but is a light proxy / cookie setter / dynamic image — fits Cloudflare Pages Functions (`functions/`).

## Decision key

- **Server-side if ANY true:** uses `createAdminClient()` (SERVICE_ROLE, bypasses RLS), reads `process.env.<SECRET>` at request time, calls a third-party API with a secret key, runs as `verifyCronSecret`-gated cron, or sets HttpOnly cookies.
- **Client-side if ALL true:** only calls `createClient()` (anon+session cookie RLS), no env secrets, no third-party fetches with keys, no cron, no HttpOnly cookie setting.
- Note: `createClient()` (`@/lib/supabase/server`) reads the SSR cookie to get the user's session — works on CF Pages with a small adapter, but **all KEEP_AS_STATIC routes can be replaced by a direct browser `supabase-js` call** using anon key + the user's own session. No server round-trip required.

---

## 1. Cron routes (5)

| Path | Function | Service Role? | External API | Category | Notes / Replacement |
|---|---|---|---|---|---|
| `cron/prices` | Simulate price fluctuation on offers + write snapshots + update product stats + fire email alerts. No-op in prod (`ENABLE_PRICE_SIMULATION` guard). | yes (`createAdminClient`) | Resend (email alerts) | **MOVE_TO_SUPABASE_EDGE** | Dev/debug only. Real prices come from ingestion. **Candidate for DELETE in prod** — keep only if you still run simulation in staging. As Edge Function: `supabase functions invoke cron-prices` on Supabase Cron. |
| `cron/alerts` | Scan `price_alerts`, send Resend email when `lowest_price <= target_price`, mark triggered. | yes | Resend (`RESEND_API_KEY`) | **MOVE_TO_SUPABASE_EDGE** | Supabase Edge + Supabase Cron (or pgcron). Needs `RESEND_API_KEY` secret. Also needs `auth.admin.getUserById` → service role. |
| `cron/digest` | Send weekly email digest to opted-in users. | no (delegates to `lib/email`) | Resend | **MOVE_TO_SUPABASE_EDGE** | Edge Function triggered by Supabase Cron (weekly). |
| `cron/orphan-auto-link` | Re-match orphan offers (`product_id IS NULL`) to products. Bounded to 500/run. | via `runOrphanAutoLink` lib (uses admin) | no | **MOVE_TO_SUPABASE_EDGE** | Edge + daily Supabase Cron. Heavy DB writes; needs service role. |
| `alerts/check` | Lightweight wrapper: calls `checkAndSendPriceAlerts()` from `lib/email`. | no (delegated) | Resend | **MOVE_TO_SUPABASE_EDGE** | Duplicate of `cron/alerts` functionally. **Consider DELETE** if `cron/alerts` covers it. If kept, Edge + Supabase Cron. |

**Cron verdict:** 4 → Supabase Edge (Supabase Cron schedule), 1 (`alerts/check`) likely DELETE as duplicate of `cron/alerts`. None stay on Vercel Cron — Vercel Cron won't exist on CF Pages.

---

## 2. Full route audit table (51 non-cron routes)

Grouped by category for readability. Counts:

- DELETE: 7
- KEEP_AS_STATIC: 21
- MOVE_TO_SUPABASE_EDGE: 20
- MOVE_TO_CF_PAGES_FUNCTIONS: 3

### DELETE (7)

| Path | Function | Why delete |
|---|---|---|
| `health` | Static `200 healthy` JSON. | CF Pages serves a static site; no process to health-check. Replace with a static `/health.html` or CF Pages `/_health` if needed. |
| `health/db` | DB ping (`products.limit(1).single()`). | Direct client-side Supabase ping or a 2-line CF Pages Function. Not worth preserving as a route. If you want a status page, build it inline. |
| `recommendations` | Stub returning `{recommendations:[]}` so `<AIRecommendations/>` doesn't 404. | Delete the route; fix the client to not fetch it (or co-locate the stub in the component). |
| `recommendations/feedback` | Stub `200 ok` (no persistence). | Delete + remove client call. |
| `vexo/health` | Reachability check for Vexo API. Config/ops data, not user-facing. | Delete; surface Vexo status via `registry/health` (already covers it). |
| `backup` | Admin-only `.sql` seed file dump of products/marketplaces/offers/snapshots. | Ops tool, runs server-side with admin auth + reads the whole DB. If you need it, run as a one-shot Supabase Edge Function or local script (`psql`/`pg_dump`). Not a request handler on a static frontend. |
| `admin/deploy-status` | Compares running Vercel SHA with Vercel API latest deployment. | Vercel-specific env vars and Vercel API token. Useless on CF Pages. Delete outright. |

### KEEP_AS_STATIC (21) — replace with direct client-side `supabase-js`

All of these only call `createClient()` (anon + user session cookie), perform standard RLS-scoped reads/writes on user-owned rows, and need no server secrets. The browser Supabase client can do them directly with no migration of server code.

| Path | Function | Replacement plan |
|---|---|---|
| `search` | Product search with variant filters via `searchProductsFromDB`. | Move `searchProductsFromDB` to a shared lib imported client-side and call `supabase.from(...)` directly with anon key. RLS should allow public read of products/offers. |
| `products` | List products (category/sort/paginate). | Plain `supabase.from('products').select('*',{count:'exact'})` from client. |
| `products/[id]` | Product detail + offers via adapter + price history helper. | Same — `fetchPriceHistoryByProductId` + offers query client-side. Adapter is pure. |
| `deals` | Deal-score ranking (reads products + offers + `fetchHistoricalStatsByProductIds`). All reads via `createClient`. No service role. | Pure client-side: same queries, `calculateDealScore` is pure. RLS must allow public reads. Public endpoint already. |
| `leaderboard` | Reads `user_profiles` (public fields) and computes points. | Client-side query. (Watch RLS: ensure `user_profiles` SELECT is public for `id, display_name, preferences` — already the case since `auth/session` and `reviews` already read it.) |
| `products/[id]/reviews` GET | List reviews + user_profiles join. | Direct client query with the same select. Already public (no auth). |
| `products/[id]/reviews` POST | Auth'd insert to `product_reviews` (RLS-scoped). | Direct client insert with user session. RLS already enforces ownership. |
| `reviews/[id]` PATCH/DELETE | Auth'd update/delete (`eq('user_id', user.id)`). | Direct client mutation — RLS already guards. The `eq(user_id)` belt is fine to keep client-side. |
| `reviews/[id]/helpful` | Auth'd toggle on `review_helpfulness`. | Direct client UPSERT/DELETE; RLS scopes to user. |
| `price-report` | Auth'd insert into `price_reports`. | Direct client insert with session; RLS scopes `user_id`. |
| `recheck-request` | Auth'd insert into `recheck_requests`. | Direct client insert; RLS scopes `requested_by`. |
| `push/subscribe` POST/DELETE | Auth'd JSON merge on `user_profiles.preferences`. | Client-side: read preferences, merge, update with `eq('id', user.id)`. RLS already owns this. |
| `auth/session` | Reads user + `user_profiles.is_admin`. | Client already has the session via `supabase.auth.getUser()` in the browser — replace the fetch with a local call + a small `user_profiles` read. |
| `auth/csrf` | Issues a CSRF token as a cookie. | CSRF is for server endpoints; on a static SPA with Supabase auth (JWT in cookie/storage) + RLS, you typically don't need a separate CSRF token endpoint. Delete and rely on SameSite cookies + Supabase's own CSRF handling. If you want defense-in-depth, generate the token client-side and store in memory (less useful). **Likely DELETE.** Filing under KEEP_AS_STATIC because it's a no-DB cookie setter — see CF Functions row if you keep it. |
| `export/price-history` | Auth'd CSV of `price_snapshots`. | Pure read + CSV formatting. Do the query client-side and build the CSV string in JS — `Blob` + `<a download>`. No server needed. |
| `export/wishlist` | Auth'd CSV of `wishlists` + products. | Same as above — client-side query + CSV Blob. |
| `user/export` | Auth'd JSON export of profile/wishlists/alerts/reviews. | Client-side `Promise.all` of the same queries + `Blob`. |
| `extension/current-price` | Read `offers` by URL (extension watcher). Auth'd via `INGESTION_SECRET`. | Since the extension already holds `INGESTION_SECRET`, it cannot be a public anon-key query. **Reclassify: MOVE_TO_SUPABASE_EDGE** to keep the secret server-side. (See edge section.) |
| `registry` GET | Lists API sources from DB (+ appends Vexo from env). | Move to a static JSON file committed to the repo or a client query on `api_sources`. |
| `recommendation/fake-discount` | GET: read product prices → `detectFakeDiscount`. POST: pure function on submitted prices. | `detectFakeDiscount` is pure → run client-side. GET path becomes a client product fetch + the pure call. |
| `recommendation/buy-or-wait` | Same shape as fake-discount; `generateBuyOrWaitRecommendation` is pure. | Client-side. |

Notes:
- `extension/current-price` was initially listed here, but its `INGESTION_SECRET` bearer auth makes it server-side → moved to EDGE.
- `auth/csrf` is a coin-flip between KEEP_AS_STATIC (no DB) and DELETE (CSRF token doesn't add much when there are no server endpoints). Recommended DELETE.

### MOVE_TO_SUPABASE_EDGE (20) — service role / secret keys / scraping

| Path | Function | Server-side need | Replacement plan |
|---|---|---|---|
| `ingestion` POST | Bulk insert offers + price_snapshots + `ingestion_logs` from collectors. Auth: `INGESTION_SECRET`. Uses admin client (RLS bypass). | SERVICE_ROLE + secret | Supabase Edge Function `ingestion`. Supabase Cron or external POST with `INGESTION_SECRET` as edge secret. |
| `ingestion/offer-snapshot` POST | Single-offer upsert + variant resolution + confidence + snapshot. Auth: `INGESTION_SECRET`. Admin client. | SERVICE_ROLE + secret + matcher/normalizer libs | Same as above. Port `lib/ingestion/*` to Deno-compatible TS (mostly already pure). |
| `refresh/trigger` POST/GET | Set `next_crawl_at=now` on `crawl_targets`. Auth: `INGESTION_SECRET`. Admin client. | SERVICE_ROLE + secret | Edge Function `refresh-trigger`. |
| `refresh/queue` GET | Due-targets query (admin client). Auth: `INGESTION_SECRET`. | SERVICE_ROLE + secret | Edge Function `refresh-queue`. |
| `refresh/calculate-priorities` POST/GET | Reads targets via admin client + computes priority scores. Auth: `INGESTION_SECRET`. | SERVICE_ROLE + secret | Edge Function. Logic is pure once rows fetched — could be Deno. |
| `internal/vexo-search` POST | Server-side Vexo Google search + AI extract price. Auth: `INGESTION_SECRET`. Uses `VEXO_API_KEY`. Rate-limited. | VEXO_API_KEY + secret | Edge Function. The whole point is keeping `VEXO_API_KEY` server-side. |
| `vexo/ai` POST | `getAIInsight` via Vexo AI. Auth: user. Uses `VEXO_API_KEY`. | VEXO_API_KEY | Edge Function with Vexo secret. Auth check via user JWT can move to edge (verify JWT). |
| `vexo/search` GET | `discoverProducts` / `discoverProductsAcrossMarketplaces` via Vexo. Auth: user. Uses `VEXO_API_KEY`. | VEXO_API_KEY | Edge Function. |
| `vexo/images` GET | `searchImages` via Vexo. Public (auth optional). Uses `VEXO_API_KEY`. | VEXO_API_KEY | Edge Function. Public rate-limited. |
| `vexo/marketplace` GET | Vexo marketplace scraper. Auth: user. Uses `VEXO_API_KEY`. | VEXO_API_KEY | Edge Function. Currently refuses mock data — keep that guard. |
| `extension/current-price` GET | Reads offer by URL. Auth: `INGESTION_SECRET`. **Reclassified from KEEP_AS_STATIC** because the bearer secret must stay server-side. | secret | Edge Function `extension-current-price`. Cheap — also doable as CF Pages Function if you prefer (see below). |
| `predict` POST | OpenAI gpt-4o-mini price prediction. Auth required. Uses `OPENAI_API_KEY`. | OPENAI_API_KEY + auth | Edge Function with OpenAI secret + JWT verify. |
| `ai-advisor` POST | OpenAI verdict with `ai_cache` (admin client) and persisting `products.ai_verdict`. Auth required. | SERVICE_ROLE + OPENAI_API_KEY + auth | Edge Function. Needs service role for the `ai_cache` write + admin-only `products.update`. |
| `admin/data-collection/offers` GET | Admin-only offers list with joins. Auth: `requireAdmin`. Uses `createClient` not admin — but `requireAdmin` server-side checks admin role. | admin auth + audit | Edge Function with admin JWT verify. **Borderline KEEP_AS_STATIC** — could be a client query IF the admin UI verifies role client-side, but `requireAdmin` is server-gated so safer to keep server-side. |
| `admin/data-collection/offers/[id]/validate` PATCH | Admin-only offer status update + auto-link + audit log. Admin + admin client. | SERVICE_ROLE + admin auth + audit | Edge Function. Needs service role (RLS only grants UPDATE to service_role per migration 124). |
| `admin/data-collection/manual-offer` POST | Admin-only manual offer insert/update + audit. Service role + admin auth. | SERVICE_ROLE + admin auth + audit | Edge Function. |
| `admin/data-collection/conflicts` GET | Admin-only reads `price_conflicts`. Uses `createClient`. | admin auth (gate) | Edge Function with admin verify. Read-only — borderline static. Keep server for the admin gate. |
| `admin/data-collection/rechecks` GET | Admin-only reads `recheck_requests`. Uses `createClient`. | admin auth gate | Same as conflicts. |
| `admin/data-collection/rechecks/[id]` PATCH | Admin-only updates recheck status + audit. | admin auth + audit | Edge Function. |
| `admin/data-collection/resolve-conflict` POST | Admin-only resolves a `price_conflicts` row + audit. | admin auth + audit | Edge Function. |

### MOVE_TO_CF_PAGES_FUNCTIONS (3)

| Path | Function | Why CF Pages Functions |
|---|---|---|
| `auth/forgot-password` POST | Rate-limited wrapper around `supabase.auth.resetPasswordForEmail`. Needs IP extraction + rate-limit table writes (uses `createClient`, no service role — but writes to rate-limit table). Uses `getAppUrl()`. | Light proxy with rate limiting + cookie-aware. CF Pages Function can read headers, write rate-limit rows via anon client, and call `resetPasswordForEmail`. Could also be Supabase Edge. Filed under CF because rate-limit-by-IP needs edge headers and it's a thin wrapper. |
| `auth/reset-password` POST | Rate-limited `verifyOtp` (recovery) + `updateUser`. Uses `createClient`. | Same rationale — CF Pages Function with rate limit. Token + password validation in-place. |
| `og/search` GET (`.tsx`) | Dynamic OG image via `next/og` `ImageResponse`. Reads query, renders JSX → PNG. No DB, no secrets. | This is *the* canonical CF Pages Functions use case: server-render an OG PNG. CF Workers support `@vercel/og` or `@cf-wasm/og`. No secrets, no DB, just an image render. Move to `functions/api/og/search.ts` on CF Pages. |

`auth/csrf` could also live here as a tiny cookie-setter Pages Function if you decide to keep CSRF — but the recommendation is DELETE.

---

## Summary counts

| Category | Count | Notes |
|---|---:|---|
| DELETE | 7 | `health`, `health/db`, `recommendations`, `recommendations/feedback`, `vexo/health`, `backup`, `admin/deploy-status` |
| KEEP_AS_STATIC (client-side `supabase-js`) | 20 | All public/auth'd RLS-scoped reads + writes on user-owned rows. Replace with browser `supabase` calls + pure logic moved to `lib/`. |
| MOVE_TO_SUPABASE_EDGE | 20 | Service role, Vexo/OpenAI/Resend keys, ingestion/refresh, cron jobs, admin guarded ops. |
| MOVE_TO_CF_PAGES_FUNCTIONS | 3 | `auth/forgot-password`, `auth/reset-password`, `og/search` |
| (Reclassified edge: `extension/current-price`) | +1 | Originally static-rec, but `INGESTION_SECRET` bearer → server-side. |
| **Total** | **50** | Plus 5 cron routes counted in MOVE_TO_SUPABASE_EDGE → **56 routes total**. |

Counts above are non-cron. Cron rows: 5 → 5 in MOVE_TO_SUPABASE_EDGE (with `alerts/check` flagged as duplicate/delete candidate).

## Reclassification note for `extension/current-price`
This appears under both KEEP_AS_STATIC (line 21) and MOVE_TO_SUPABASE_EDGE lists above. The correct classification is **MOVE_TO_SUPABASE_EDGE**: it is bearer-auth'd with `INGESTION_SECRET`, which the browser extension must never expose to a public anon-key query. Treat the KEEP_AS_STATIC mention as struck-through. If you want to avoid Edge entirely, the cheapest alternative is a CF Pages Function that holds `INGESTION_SECRET` server-side — file under either Edge or CF, your call. Both work; Edge keeps it next to Supabase.

## General migration notes

- `createClient` (SSR cookie → user session) → on CF Pages, replace with the browser Supabase client (anon key + `localStorage` or PKCE cookie session). All KEEP_AS_STATIC routes effectively evaporate.
- `createAdminClient()` (SERVICE_ROLE) → only inside Supabase Edge Functions or CF Pages Functions (with secret bound to the platform's secret store). Never ship to the static bundle.
- `lib/api-auth.ts` `requireAuth`/`getAuthenticatedUser`/`verifyCronSecret` and `lib/admin-auth.ts` `requireAdmin` must be ported to whichever server runtime you choose. For Edge Functions, `verifyCronSecret` becomes a header check against the edge secret.
- Cron jobs can't run on CF Pages — move them to **Supabase Cron (pg_cron → `pg_cron.schedule` invoking `net.http_post`)** calling the deployed Edge Functions, or to an external cron (GitHub Actions + `curl` to the Edge Function URL with the secret). Both remove the Vercel Cron dependency entirely.
- OpenAI routes (`predict`, `ai-advisor`) — `OPENAI_API_KEY` only ever loaded via `next/server` runtime env. Move to Edge/CF secrets. The `ai_cache` table writes in `ai-advisor` need the service role.
- All admin routes need RLS or service-role verification of `user_profiles.is_admin`. Currently `requireAdmin` does that server-side. Replicate in Edge: `verifyJWT` (Supabase JWT) → load `user_profiles.is_admin` → 403 if false.
