-- ============================================================================
-- Migration 126: Backfill `prices` data into `offers` table
-- ============================================================================
-- Date: 2026-06-15
-- Author: BijakBeli.app Phase 7 (Next Steps)
--
-- CONTEXT
-- After migration 125 (union view), 6 products still have data ONLY in
-- the legacy `prices` table. These products are invisible to the new
-- `data.ts` (which queries via FK embed to `offers`) and have no chart
-- data in `price_snapshots`.
--
-- This migration copies the legacy data into the modern `offers` schema
-- so the migration is complete. The `prices` table is then safe to drop
-- (separate migration).
--
-- IDEMPOTENT
-- Safe to re-run. Uses `WHERE NOT EXISTS` to prevent duplicates.
-- A row is considered "duplicate" if same (product_id, marketplace_id)
-- already exists in offers.
--
-- FIELD MAPPING (prices → offers)
--   p.price              → o.current_price
--   p.seller             → o.seller_name
--   p.seller_rating      → o.seller_rating
--   p.shipping_cost      → o.shipping_estimate
--   p.in_stock=true      → o.stock_status = 'in_stock'
--   p.in_stock=false     → o.stock_status = 'out_of_stock'
--   p.in_stock=null      → o.stock_status = 'unknown'
--   p.url                → o.url
--   p.last_updated       → o.last_checked_at
--
-- HEURISTICS APPLIED
--   is_official_store: seller text contains 'official'/'resmi'/'authorized'
--   has_free_shipping: shipping_cost = 0
--   source: 'legacy_backfill' (for audit trail)
--   confidence_score: 50 (low — data is from old scraper)
--   validation_status: 'pending' (needs re-verification)
-- ============================================================================

INSERT INTO public.offers (
  product_id,
  marketplace_id,
  seller_name,
  seller_rating,
  is_official_store,
  url,
  current_price,
  stock_status,
  shipping_estimate,
  has_free_shipping,
  source,
  confidence_score,
  confidence_label,
  validation_status,
  last_checked_at,
  is_active
)
SELECT
  p.product_id,
  p.marketplace_id,
  p.seller,
  p.seller_rating,
  (p.seller ILIKE ANY (ARRAY['%official%', '%resmi%', '%authorized%', '%flagship%'])),
  p.url,
  p.price,
  CASE
    WHEN p.in_stock IS TRUE THEN 'in_stock'
    WHEN p.in_stock IS FALSE THEN 'out_of_stock'
    ELSE 'unknown'
  END,
  p.shipping_cost,
  (p.shipping_cost = 0),
  'manual_admin',
  50,
  'perlu dicek ulang',
  'pending',
  p.last_updated,
  true
FROM public.prices p
WHERE NOT EXISTS (
  -- Skip if (product_id, marketplace_id) already exists in offers
  SELECT 1 FROM public.offers o
  WHERE o.product_id = p.product_id
    AND o.marketplace_id = p.marketplace_id
)
-- Skip if URL already exists in offers (different product, same URL)
AND NOT EXISTS (
  SELECT 1 FROM public.offers o
  WHERE o.url = p.url
);

-- ============================================================================
-- VERIFICATION (run after applying)
-- ============================================================================
-- 1. New offers added
--    SELECT COUNT(*) FROM public.offers WHERE source = 'manual_admin';
--    Expected: 6 + existing manual_admin rows (only NEW ones count)
--
-- 2. No more "only_legacy" products
--    SELECT COUNT(DISTINCT product_id)
--    FROM public.product_prices_view
--    WHERE origin = 'legacy'
--    AND product_id NOT IN (SELECT DISTINCT product_id FROM public.product_prices_view WHERE origin = 'offers');
--    Expected: 0
--
-- 3. View row count
--    SELECT COUNT(*) FROM public.product_prices_view;
--    Expected: 237 (unchanged — view is UNION, no new rows)
-- ============================================================================
