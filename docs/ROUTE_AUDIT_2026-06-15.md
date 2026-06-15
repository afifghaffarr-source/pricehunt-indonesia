# Route Auth Audit — Complete (2026-06-15)

## Method

Scanned all 48 routes in `src/app/api/**/route.ts` for:
- Export methods (GET/POST/PUT/PATCH/DELETE)
- Auth pattern (`requireAuth`, `getAuthenticatedUser`, `supabase.auth.getUser`, `verifyApiKey`, `requireAdmin`, `INGESTION_SECRET`, `getServerSession`, `verifyCron`)
- Edge vs Node runtime

## Summary

| Category | Count | Status |
|---|---|---|
| Total routes | 48 | |
| Read-only (GET) | 27 | Mostly public, some cron-gated, some admin-only |
| Write with auth | 18 | All use proper auth pattern |
| Write intentionally public | 4 | Password reset, AI advisor (when needed), recommendations |
| **Write WITHOUT auth** | **2** | `recommendation/buy-or-wait` POST, `recommendation/fake-discount` POST |
| Admin routes (require admin) | 8 | All use `requireAdmin` from `admin-auth` (post-A-011) |
| Cron routes (verifyCron) | 3 | `cron/alerts`, `cron/digest`, `cron/prices` |
| Ingestion routes (verifyApiKey) | 2 | `ingestion`, `ingestion/offer-snapshot` |

## WRITE-NO-AUTH findings

### 🔴 LOW RISK: `recommendation/buy-or-wait` POST
- **Path:** `src/app/api/recommendation/buy-or-wait/route.ts:85`
- **Auth:** None
- **Risk:** Low. Pure computation, no external API call, no DB write. Just runs `generateBuyOrWaitRecommendation()` locally.
- **Mitigation possible:** Add `checkPersistentRateLimit` (5/min per IP) to prevent DoS.
- **Status:** Documented, not fixed (Phase 3 backlog).

### 🔴 LOW RISK: `recommendation/fake-discount` POST
- **Path:** `src/app/api/recommendation/fake-discount/route.ts:80`
- **Auth:** None
- **Risk:** Low. Same as above — pure local computation via `detectFakeDiscount()`.
- **Mitigation possible:** Add rate limit.
- **Status:** Documented, not fixed (Phase 3 backlog).

## Public-by-design routes (no auth needed)

| Route | Reason |
|---|---|
| `/api/auth/forgot-password` | Password reset must accept anonymous requests (security best practice) |
| `/api/auth/reset-password` | Same — user comes from email link, not logged in yet |
| `/api/auth/csrf` (GET) | CSRF token issuance must be public |
| `/api/deals` (GET) | Public data feed |
| `/api/products` (GET) | Public catalog |
| `/api/products/[id]` (GET) | Public product detail |
| `/api/search` (GET) | Public search |
| `/api/analytics` (GET) | Public analytics |
| `/api/leaderboard` (GET) | Public leaderboard |
| `/api/health`, `/api/health/db` | Public health checks (uptime monitor needs access) |
| `/api/ingestion/*` (GET) | Returns API status, public |
| `/api/recommendation/buy-or-wait` (GET) | Chrome extension public API |
| `/api/recommendation/fake-discount` (GET) | Chrome extension public API |
| `/api/refresh/queue` (GET) | Public queue status |
| `/api/registry/*` (GET) | Public marketplace registry |
| `/api/vexo/*` (GET) | Vexo image/health public |
| `/api/export/price-history` (GET) | Public price history export |

### ✅ Resolved: `/api/export/wishlist` GET

Uses `requireAuth()` from `@/lib/api-auth` + filters by `user.id`. Privacy-safe.

## Admin auth check (post-A-011)

All 8 admin routes verified use `requireAdmin` from `admin-auth`:
- `/api/admin/data-collection/conflicts` GET
- `/api/admin/data-collection/offers` GET
- `/api/admin/data-collection/rechecks` GET
- `/api/admin/data-collection/rechecks/[id]` PATCH
- `/api/admin/data-collection/manual-offer` POST
- `/api/admin/data-collection/resolve-conflict` POST
- `/api/backup` GET
- `/api/scrape` POST

`admin/data-collection/rechecks` GET was audited earlier as using `requireAdmin` from `admin-auth`. ✅ Consistent.

## Cron auth check

3 cron routes use `verifyCron` from `api-auth`:
- `/api/cron/alerts`
- `/api/cron/digest`
- `/api/cron/prices`

All gated by `Authorization: Bearer <CRON_SECRET>`. ✅ Vercel cron config sends this header.

## Verdict

**Auth posture is solid.** 2 routes have no auth (recommendations POST) but are pure local compute with no sensitive operation. Acceptable for MVP.

## Phase 3 Backlog (optional hardening)

1. Add `checkPersistentRateLimit` to `recommendation/buy-or-wait` POST + `recommendation/fake-discount` POST
2. Add rate limit to `auth/forgot-password` (email enumeration prevention, though Supabase already mitigates)
