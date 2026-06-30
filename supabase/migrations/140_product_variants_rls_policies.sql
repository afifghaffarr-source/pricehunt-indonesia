-- Migration 140: Add RLS policies for product_variants
--
-- BUG DISCOVERED (2026-06-30): Migration 136 enabled RLS on
-- product_variants but never added any policies. Result: anon and
-- authenticated users couldn't read ANY variant row, even though the
-- RLS-enabled table appeared to "work" in tests that used the service
-- role key.
--
-- The visible symptom: the per-variant price stats card on the product
-- page (Phase 7, a17fdb6) silently never rendered, because
-- `getProductVariants()` returns `[]` for anon users and the page
-- mapping filtered out all rows. Confirmed by:
--   - Direct Supabase query with service role → 7 rows returned
--   - Same query with anon key → 0 rows returned
--   - Page.tsx `variantsCount: 0` in production debug log
--
-- Fix: mirror the `offers` policy pattern. Public read (any variant,
-- not just is_active — the page already filters by parent product
-- visibility upstream), and a service-role bypass for admin operations
-- (Phase 1 backfill scripts, manual SQL).

BEGIN;

-- 1. Public read — anyone can SELECT. Page does its own filtering by
--    product_id. We don't restrict to is_active here because the page
--    renders variant pickers that show inactive options for context
--    (e.g. "previously available" badges).
CREATE POLICY "Public read variants"
  ON product_variants
  FOR SELECT
  USING (true);

-- 2. Service role full — admin / backfill / cron scripts that use the
--    service-role JWT to write variants. Mirrors the `offers` table
--    policy.
CREATE POLICY "Service role full"
  ON product_variants
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- Verify
SELECT
  relname,
  relrowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policy WHERE polrelid = c.oid) AS policy_count
FROM pg_class c
WHERE relname = 'product_variants'
  AND relnamespace = 'public'::regnamespace;
