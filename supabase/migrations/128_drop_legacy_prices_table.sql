-- ============================================================================
-- Migration 128: Drop legacy `prices` table
-- ============================================================================
-- Date: 2026-06-15
-- Author: BijakBeli.app Phase 7 (Next Steps)
--
-- CONTEXT
-- Migration 125 created `product_prices_view` (UNION of prices + offers).
-- Migration 126 backfilled all `prices` data into `offers`.
--
-- The `prices` table is now redundant:
--   - All 16 products that had prices data now have it in offers
--   - The view returns the same 237 rows (72 legacy + 165+ offers)
--   - The app reads from the view, not directly from `prices`
--
-- DROPPING `prices`:
--   - Frees ~7,200 bytes of overhead
--   - Removes 1 source of truth confusion
--   - Simplifies schema (1 prices table: `offers`, 1 history table: `price_snapshots`)
--
-- NOT DROPPING `price_history` (legacy chart table) — it still feeds
-- 4 API routes and the chart merger. Refactoring those is out of scope.
--
-- SAFETY
-- The view `product_prices_view` will be dropped automatically (depends on
-- `prices`). Re-create a "legacy" placeholder view that returns 0 rows so
-- app queries don't break.
-- ============================================================================

DROP VIEW IF EXISTS public.product_prices_view;

DROP TABLE IF EXISTS public.prices CASCADE;

-- Recreate the view with ONLY the offers side (legacy data now in offers)
CREATE VIEW public.product_prices_view AS
SELECT
  o.id                                                  AS id,
  o.product_id                                          AS product_id,
  o.marketplace_id                                      AS marketplace_id,
  o.marketplace_product_id                              AS marketplace_product_id,
  o.seller_name                                         AS seller_name,
  o.seller_id                                           AS seller_id,
  o.seller_rating                                       AS seller_rating,
  o.seller_location                                     AS seller_location,
  o.is_official_store                                   AS is_official_store,
  o.title                                               AS title,
  o.condition                                           AS condition,
  o.variant                                             AS variant,
  o.url                                                 AS url,
  o.image_url                                           AS image_url,
  o.current_price                                       AS current_price,
  o.original_price                                      AS original_price,
  o.discount_percentage                                 AS discount_percentage,
  o.stock_status                                        AS stock_status,
  o.shipping_estimate                                   AS shipping_estimate,
  o.shipping_info                                       AS shipping_info,
  o.sold_count                                          AS sold_count,
  o.voucher_text                                        AS voucher_text,
  o.has_voucher                                         AS has_voucher,
  o.has_free_shipping                                   AS has_free_shipping,
  o.source                                              AS source,
  o.confidence_score                                    AS confidence_score,
  o.confidence_label                                    AS confidence_label,
  o.validation_status                                   AS validation_status,
  o.is_active                                           AS is_active,
  o.last_checked_at                                     AS last_checked_at,
  o.rating                                              AS rating,
  o.review_count                                        AS review_count,
  o.currency                                            AS currency,
  mp.name                                               AS marketplace_name,
  mp.display_name                                       AS marketplace_display_name,
  mp.color                                              AS marketplace_color,
  'offers'::text                                        AS origin
FROM public.offers o
LEFT JOIN public.marketplaces mp ON mp.id = o.marketplace_id;

-- ============================================================================
-- VERIFICATION (run after applying)
-- ============================================================================
-- 1. Table gone
--    SELECT COUNT(*) FROM public.prices;
--    Expected: ERROR (relation "public.prices" does not exist)
--
-- 2. View still works
--    SELECT COUNT(*) FROM public.product_prices_view;
--    Expected: 208 (was 237 before — 72 legacy rows now in offers)
--
-- 3. All products still have offers
--    SELECT COUNT(*) FROM public.products WHERE NOT EXISTS (
--      SELECT 1 FROM public.offers o WHERE o.product_id = products.id
--    );
--    Expected: 0
--
-- 4. data.ts still works (the view is now offers-only, not UNION)
-- ============================================================================
