-- Performance indexes (deferred until data volume justifies them)
-- Date: 2026-06-15
--
-- Current data volumes: 64 products, 165 offers, 300 price_snapshots, 212 crawl_targets
-- PostgREST round-trip is the dominant latency (~150-200ms). DB queries are sub-10ms.
--
-- ADD THESE INDEXES when:
-- - products > 10K rows
-- - offers > 100K rows
-- - price_snapshots > 1M rows
-- - crawl_targets > 5K rows
--
-- Run each statement separately with EXPLAIN ANALYZE first to confirm the planner picks it.
-- Use CONCURRENTLY in production to avoid table locks (requires no concurrent DDL).

-- ============================================================================
-- 1. offers: filter+sort hot path
--    Current: 303ms for is_active=true + order by current_price.asc (vs 163ms baseline)
--    When: offers > 10K rows
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_active_price
  ON public.offers (current_price)
  WHERE is_active = true;

-- ============================================================================
-- 2. crawl_targets: cron scraper hot path (eq.pending/queued + sort by priority)
--    Current: 348ms baseline, 400 ERR for priority_score (column selection issue)
--    When: crawl_targets > 5K rows
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crawl_targets_status_priority
  ON public.crawl_targets (priority_score DESC)
  WHERE crawl_status IN ('pending', 'queued');

-- ============================================================================
-- 3. products: homepage deal_score sort
--    Current: 168ms (acceptable). No index needed.
--    When: products > 10K rows
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_deal_score
  ON public.products (deal_score DESC)
  WHERE deal_score > 0;

-- ============================================================================
-- 4. ingestion_logs: filter by job_name in metadata + sort by started_at
--    Current: 152ms (acceptable). job-logger just rewired, 0 rows.
--    When: ingestion_logs > 50K rows
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ingestion_logs_job_name
  ON public.ingestion_logs ((metadata->>'job_name'), started_at DESC);

-- ============================================================================
-- 5. price_snapshots: history queries (per offer, by time)
--    Current: 192ms. Already likely indexed via FK on offer_id, but composite helps.
--    When: price_snapshots > 1M rows
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_snapshots_offer_time
  ON public.price_snapshots (offer_id, captured_at DESC);

-- ============================================================================
-- VERIFICATION (run after applying any/all of the above)
-- ============================================================================
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename IN ('offers', 'crawl_targets', 'products', 'ingestion_logs', 'price_snapshots')
-- ORDER BY tablename, indexname;
