# Migration Audit & Reconciliation (v1.5.10)

**Date:** 2026-06-16
**Triggered by:** Production bug `PGRST205` on `product_reviews` (ReviewsList broken on every product page)

## Root Cause

Two consecutive migrations had **duplicate version numbers** in the migration directory, and **Supabase only applied one of each pair**. This left 9 tables in a "should exist" state — referenced by application code, but missing from the production database. No error during deployment, but every query to those tables returned `PGRST205` (`Could not find the table`) at runtime.

| Version | File 1 (applied) | File 2 (skipped) |
|---|---|---|
| `002` | `002_performance_indexes.sql` | `002_api_registry.sql` |
| `003` | `003_product_reviews.sql` (chosen) | `003_reviews_system.sql` |
| `111` | `111_seed_products.sql` | `111_seed_products_fixed.sql` |
| `112` | `112_fix_data_collection_schema.sql` | `112_fix_data_collection_schema_v2.sql` |
| `114` | `114_upgrade_offers_schema.sql` | `114_upgrade_offers_schema_v3.sql` (v3 applied) |
| `116` | `116_seed_crawl_targets.sql` | `116_seed_crawl_targets_v2.sql` |
| `120` | `120_performance_indexes.sql` | `120_performance_indexes_dashboard.sql` |

The `002/003` collisions were the most damaging because the skipped files created whole **API registry** and **reviews** systems that the app code imports unconditionally.

## Tables Found Missing in Production (Audit)

| Status | Table | Source Migration | Used By |
|---|---|---|---|
| ✅ APPLIED | `admin_users` | `121_admin_users.sql` | `src/lib/api-auth.ts`, `src/lib/admin-auth.ts` |
| ✅ APPLIED | `api_source_categories` | `002_api_registry.sql` | `src/lib/api-registry/data.ts` |
| ✅ APPLIED | `api_source_credentials` | `002_api_registry.sql` | `src/lib/api-registry/data.ts` |
| ✅ APPLIED | `api_source_health_checks` | `002_api_registry.sql` | `src/lib/api-registry/data.ts` |
| ✅ APPLIED | `api_source_usage_logs` | `002_api_registry.sql` | `src/lib/api-registry/data.ts` |
| ✅ APPLIED | `api_sources` | `002_api_registry.sql` | `src/lib/api-registry/data.ts` |
| ✅ APPLIED | `job_logs` | `100_job_logs_system.sql` | `src/lib/job-logger.ts` |
| ✅ APPLIED | `product_reviews` | `003_product_reviews.sql` | `src/app/api/products/[id]/reviews/route.ts`, `src/app/api/reviews/[id]/route.ts`, `src/components/product/ReviewsList.tsx` |
| ✅ APPLIED | `review_helpfulness` | `003_product_reviews.sql` | `src/app/api/reviews/[id]/helpful/route.ts` |

**Truly unused (safe to leave unapplied):**
- `reviews` (3rd-party table from `003_reviews_system.sql`) — referenced in `src/app/product/[slug]/page.tsx:465` but as an HTML `id="reviews"` attribute, not a DB table
- `review_votes` — no app references

**Intentionally dropped in v1.5.x refactor:**
- `prices` (001_initial_schema.sql) — replaced by `offers` in migration 126
- `price_history` (001_initial_schema.sql) — replaced by `price_snapshots` in migration 127

## Fixes Applied (v1.5.10)

1. **Re-ran 4 missing migrations** via `supabase db query --linked --file <path>`:
   - `002_api_registry.sql` → 5 tables
   - `003_product_reviews.sql` → 2 tables
   - `100_job_logs_system.sql` → 1 table
   - `121_admin_users.sql` → 1 table
2. **Patched `100_job_logs_system.sql`** — old RLS policy referenced `user_profiles.is_admin` (JSONB boolean, deprecated in v1.5.x). Replaced with `EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)`.
3. **New migration `131_product_reviews_user_profiles_fk.sql`** — original `003_product_reviews.sql` only had FK to `auth.users`, not `user_profiles`. The reviews API join (`user_profiles!inner(display_name, avatar_url)`) failed silently with `PGRST200`. Added explicit FK on `product_reviews.user_id` → `user_profiles.id` (and same for `review_helpfulness`).
4. **Removed v1.5.10 `available: false` short-circuit** in `src/app/api/products/[id]/reviews/route.ts` — was a temporary graceful fallback for the missing table. Now that the table exists, the real error path is exercised. The component (`ReviewsList.tsx`) was also cleaned up to drop the dead `available` state.

## Post-Fix Verification

| Check | Result |
|---|---|
| Tables in production | 26 (was 17 — 9 new) |
| `GET /api/products/{id}/reviews` | 200, no `PGRST205`/`PGRST200` |
| `POST /api/products/{id}/reviews` (no auth) | 401 with Indonesian error |
| `job_logs` insert/read/delete | 200/200/204 |
| `api_sources` query | 200, empty (no data yet) |
| Vitest | 299/299 pass |
| Build | clean |

## Lessons Learned

1. **Supabase CLI doesn't enforce unique version numbers** — local `supabase db push` would have flagged duplicates, but the previous apply path used the SQL Editor manually, so no such guard.
2. **PostgREST schema cache silently masks missing tables as `PGRST205`** — production queries fail at runtime, not deploy time. No migration tool I can use in retrospect to detect "table referenced by app code but not in schema".
3. **Idempotent migrations (`CREATE TABLE IF NOT EXISTS`) saved us** — re-running 002/003/100/121 was a no-op for any already-existing objects and created the missing ones.
4. **Foreign keys matter for PostgREST joins** — `auth.users` FK alone is not enough to embed `user_profiles` in a query. The actual join target needs an explicit FK.
5. **Audit policy:** before every prod push, run a "schema ↔ code" diff: list tables, list `.from()` calls, find the gap. This audit script: `/tmp/audit_migrations.py` + `/tmp/check_table_usage.py` (or saved as a recurring CI check).

## Future Hardening (suggested)

- Add a CI check that runs `/tmp/audit_migrations.py` + `/tmp/check_table_usage.py` on every PR — fail the build if `MISSING` count > 0.
- Rename duplicate-version migrations with suffixes: `002_api_registry.sql` → `002b_api_registry.sql`, etc. So they apply in deterministic order.
- Switch from manual SQL Editor to `supabase db push` (which respects the migration version ordering).
