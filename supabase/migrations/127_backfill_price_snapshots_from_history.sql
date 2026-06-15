-- ============================================================================
-- Migration 127: Backfill price_snapshots from price_history (for chart UX)
-- ============================================================================
-- Date: 2026-06-15
-- Author: BijakBeli.app Phase 7 (Next Steps)
--
-- CONTEXT
-- After migration 126, all products have offers data. However, 5 products
-- have 0 `price_snapshots` (per-offer historical log) but rich `price_history`
-- (per-product+marketplace historical log). The chart code in
-- src/lib/supabase/data.ts merges BOTH tables.
--
-- Goal: seed `price_snapshots` from `price_history` so the 5 backfilled
-- products get an immediate chart. Future scraper runs will add more.
--
-- MAPPING (price_history → price_snapshots)
--   h.product_id + h.marketplace_id  → find matching offer_id
--   h.price                          → current_price
--   h.recorded_at                    → captured_at (date → timestamp)
--   h.created_at                     → use as default
--
-- IDEMPOTENT: only inserts if no snapshot exists for (offer_id, captured_at)
-- ============================================================================

INSERT INTO public.price_snapshots (
  offer_id,
  current_price,
  captured_at,
  source
)
SELECT
  o.id                                                    AS offer_id,
  h.price                                                 AS current_price,
  (h.recorded_at::timestamp + interval '12 hours')        AS captured_at,
  'manual_admin'                                          AS source
FROM public.price_history h
JOIN public.offers o
  ON o.product_id = h.product_id
  AND o.marketplace_id = h.marketplace_id
WHERE NOT EXISTS (
  -- Idempotent: skip if snapshot already exists for this offer+date
  SELECT 1 FROM public.price_snapshots ps
  WHERE ps.offer_id = o.id
    AND DATE(ps.captured_at) = h.recorded_at
);

-- ============================================================================
-- VERIFICATION (run after applying)
-- ============================================================================
-- 1. Snapshots added
--    SELECT source, COUNT(*) FROM public.price_snapshots GROUP BY source;
--    Expected:
--      existing: 300
--      history_backfill: ~5000 (5 products × 6 marketplaces × ~180 days)
--
-- 2. Products with chart data
--    SELECT
--      p.slug,
--      (SELECT COUNT(*) FROM price_snapshots ps JOIN offers o ON o.id = ps.offer_id WHERE o.product_id = p.id) AS snaps
--    FROM products p
--    ORDER BY snaps DESC;
--    Expected: All 5 backfilled products should have non-zero snaps
-- ============================================================================
