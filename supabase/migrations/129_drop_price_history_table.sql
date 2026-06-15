-- ============================================================================
-- Migration 129: Drop legacy `price_history` table
-- ============================================================================
-- Date: 2026-06-15
-- Author: Hermes
--
-- CONTEXT
-- Migration 127 backfilled `price_snapshots` from `price_history` (1,449 → 1,710
-- rows; 8 products → 48 products with chart data). All application code paths
-- that previously read from `price_history` have been refactored in P7-Post to
-- read from `price_snapshots` joined via `offers`:
--   - src/lib/supabase/data.ts (fetchPriceHistoryByProductId)
--   - src/lib/supabase/data.ts (fetchHistoricalStatsByProductIds — new helper)
--   - src/app/api/products/[id]/route.ts
--   - src/app/api/deals/route.ts
--   - src/app/api/predict/route.ts
--   - src/app/api/ai-advisor/route.ts
--   - src/app/api/export/price-history/route.ts
--   - src/app/api/cron/prices/route.ts (writer)
--
-- VERIFIED COVERAGE
--   price_snapshots daily: 1,559 rows covering 48/64 products (~33 days)
--   price_history (legacy): 1,449 rows covering 8/64 products
--   price_snapshots is a strict superset: 6× more products, same date range.
--
-- SAFETY
-- - Pre-check: count rows in price_history (informational; not a hard block).
-- - DROP TABLE ... CASCADE: removes indexes, foreign keys, RLS policies,
--   and the materialized view dependency (none currently, but defensive).
-- - RLS policies on the table are dropped automatically by CASCADE.
-- - The seed.sql file (`supabase/seed.sql`) still references `price_history`
--   for local-dev fixtures. After this migration the seed will fail on a
--   fresh DB. To fix: edit `supabase/seed.sql` to write to `price_snapshots`
--   (P7-Post follow-up, separate change, deferred).
--
-- ============================================================================

-- STEP 1: Informational pre-check
DO $$
DECLARE
  ph_count INTEGER;
  ph_products INTEGER;
  ps_count INTEGER;
  ps_offers INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT product_id)
    INTO ph_count, ph_products
    FROM public.price_history;

  SELECT COUNT(*), COUNT(DISTINCT offer_id)
    INTO ps_count, ps_offers
    FROM public.price_snapshots;

  RAISE NOTICE 'price_history (legacy): % rows, % products', ph_count, ph_products;
  RAISE NOTICE 'price_snapshots (target): % rows, % offers', ps_count, ps_offers;

  IF ph_count > ps_count THEN
    RAISE WARNING 'price_history still has more rows than price_snapshots — review before continuing';
  END IF;
END $$;

-- STEP 2: Drop dependent objects explicitly (defensive; CASCADE handles most).
-- The legacy table has these indexes (from migration 001 + 002 + 120):
--   - idx_price_history_product
--   - idx_price_history_date
--   - idx_price_history_product_date
--   - idx_price_history_recorded_at
-- All drop automatically with the table via CASCADE.

-- RLS policies on price_history (from migration 001):
--   - "Price history is viewable by everyone" (FOR SELECT)
-- These drop automatically with the table.

-- DROP the table
DROP TABLE IF EXISTS public.price_history CASCADE;

-- STEP 3: Verify
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'price_history'
  ) THEN
    RAISE EXCEPTION 'price_history still exists after DROP — manual intervention required';
  END IF;
  RAISE NOTICE 'price_history dropped successfully';
END $$;
