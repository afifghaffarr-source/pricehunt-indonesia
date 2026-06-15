-- ============================================================================
-- P3: Apply A-005 Performance Indexes (2026-06-15)
-- ============================================================================
-- Context: A-005 was authored to be "deferred until data volume justifies
--   them" (current: 165 offers, 64 products, 212 crawl_targets, 300
--   price_snapshots). User approved early apply.
--
-- A-005 caveat: uses CREATE INDEX CONCURRENTLY which REQUIRES running
--   outside a transaction. The Supabase SQL Editor wraps queries in
--   implicit transactions, so CONCURRENTLY will FAIL when pasted as
--   a single block.
--
-- This file provides BOTH versions:
--   A) SQL Editor version (non-CONCURRENTLY) — locks briefly, OK at 165 rows
--   B) Production / CLI version (CONCURRENTLY) — no locks, run from psql/CLI
--
-- Run SECTION A in Supabase SQL Editor if you're following the simple
-- copy-paste workflow. Skip to SECTION B if deploying to production.
-- ============================================================================

-- ============================================================================
-- SECTION A: Supabase SQL Editor (paste this section, ~30 sec total)
-- ============================================================================
-- Trade-off: each CREATE INDEX locks its target table for write briefly
--   (read continues). At 165 offers this is <100ms. Safe.
-- ============================================================================

-- 1. offers: filter+sort hot path
CREATE INDEX IF NOT EXISTS idx_offers_active_price
  ON public.offers (current_price)
  WHERE is_active = true;

-- 2. crawl_targets: cron scraper hot path
CREATE INDEX IF NOT EXISTS idx_crawl_targets_status_priority
  ON public.crawl_targets (priority_score DESC)
  WHERE crawl_status IN ('pending', 'queued');

-- 3. products: homepage deal_score sort
CREATE INDEX IF NOT EXISTS idx_products_deal_score
  ON public.products (deal_score DESC)
  WHERE deal_score > 0;

-- 4. ingestion_logs: filter by job_name in metadata + sort by started_at
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_job_name
  ON public.ingestion_logs ((metadata->>'job_name'), started_at DESC);

-- 5. price_snapshots: history queries (per offer, by time)
CREATE INDEX IF NOT EXISTS idx_price_snapshots_offer_time
  ON public.price_snapshots (offer_id, captured_at DESC);

-- Refresh planner stats so the indexes are immediately considered
ANALYZE public.offers;
ANALYZE public.crawl_targets;
ANALYZE public.products;
ANALYZE public.ingestion_logs;
ANALYZE public.price_snapshots;

-- ============================================================================
-- VERIFICATION (always run, regardless of section A or B)
-- ============================================================================
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_offers_active_price',
    'idx_crawl_targets_status_priority',
    'idx_products_deal_score',
    'idx_ingestion_logs_job_name',
    'idx_price_snapshots_offer_time'
  )
ORDER BY tablename, indexname;

-- Expected: 5 rows returned (one per index)
-- If any are missing, see ROLLBACK section below and re-run section A.

-- ============================================================================
-- SECTION B: Production CLI / psql (no table locks)
-- ============================================================================
-- Use this when offers > 10K rows or any table > 1M rows.
-- Run EACH statement separately, NOT in a single transaction.
-- ============================================================================
/*

-- Run each of these one at a time from psql or a migration script:

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_active_price
  ON public.offers (current_price)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crawl_targets_status_priority
  ON public.crawl_targets (priority_score DESC)
  WHERE crawl_status IN ('pending', 'queued');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_deal_score
  ON public.products (deal_score DESC)
  WHERE deal_score > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ingestion_logs_job_name
  ON public.ingestion_logs ((metadata->>'job_name'), started_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_snapshots_offer_time
  ON public.price_snapshots (offer_id, captured_at DESC);

ANALYZE public.offers;
ANALYZE public.crawl_targets;
ANALYZE public.products;
ANALYZE public.ingestion_logs;
ANALYZE public.price_snapshots;

*/

-- ============================================================================
-- PERFORMANCE TEST (optional but recommended)
-- ============================================================================
-- Run BEFORE and AFTER applying P3 to see planner picks the new indexes.
-- Note: at 165 rows, you may not see a query-time difference (data is
--   already in memory). The benefit is structural — future inserts land
--   in the right B-tree order.
-- ============================================================================
/*

-- Test 1: offers filter+sort (uses idx_offers_active_price if applied)
EXPLAIN ANALYZE
SELECT id, current_price FROM public.offers
WHERE is_active = true
ORDER BY current_price ASC
LIMIT 50;

-- Test 2: crawl_targets cron hot path
EXPLAIN ANALYZE
SELECT id, url, priority_score FROM public.crawl_targets
WHERE crawl_status IN ('pending', 'queued')
ORDER BY priority_score DESC
LIMIT 50;

-- Test 3: products deal_score sort
EXPLAIN ANALYZE
SELECT id, name, deal_score FROM public.products
WHERE deal_score > 0
ORDER BY deal_score DESC
LIMIT 50;

*/

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*

DROP INDEX IF EXISTS public.idx_offers_active_price;
DROP INDEX IF EXISTS public.idx_crawl_targets_status_priority;
DROP INDEX IF EXISTS public.idx_products_deal_score;
DROP INDEX IF EXISTS public.idx_ingestion_logs_job_name;
DROP INDEX IF EXISTS public.idx_price_snapshots_offer_time;

*/
