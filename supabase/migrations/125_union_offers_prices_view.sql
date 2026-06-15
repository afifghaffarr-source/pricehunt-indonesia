-- ============================================================================
-- Migration 125: Union view for prices + offers (P7 schema alignment)
-- ============================================================================
-- Date: 2026-06-15
-- Author: BijakBeli.app Phase 7
--
-- CONTEXT
-- The migration from `prices` (legacy) to `offers` (new schema) is in
-- progress. As of 2026-06-15, the data is DISJOINT:
--   - Some products have rows in `prices` only (legacy data)
--   - Some products have rows in `offers` only (new ingestion)
--   - No product has data in BOTH tables
--
-- The web app currently queries `prices` via PostgREST FK embed, so
-- products with only new `offers` data show ZERO prices on the public
-- product pages. This breaks the homepage and product detail pages.
--
-- This migration creates a READ-ONLY view that UNIONs both tables with
-- field mapping, so the app can query a single source while migration
-- completes.
--
-- Once all products have data in `offers` (post-scraper backfill), drop
-- the `prices` table and the view. (Out of scope for this migration.)
--
-- ============================================================================
-- DESIGN
-- ============================================================================
-- 1. Read-only view, no DML.
-- 2. Field mapping: `prices` columns → `offers` column names
--    (e.g., `price` → `current_price`, `seller` → `seller_name`,
--     `in_stock` (bool) → `stock_status` (enum), etc.)
-- 3. Legacy rows get a synthetic `source = 'legacy_prices'` tag so
--    downstream code can identify and prioritize new data.
-- 4. Includes a `marketplace_name` denormalized column (joined from
--    `marketplaces`) for read-side convenience — saves a join in the
--    TypeScript layer.
-- 5. Includes `is_official_store` heuristic for legacy rows (NULL in
--    `prices`, but `seller` text often contains "Official"/"Resmi").
-- 6. NO `WHERE` filter — include out-of-stock legacy rows too so
--    consumers can decide stock handling.
-- ============================================================================

-- Drop if exists (idempotent re-runs)
DROP VIEW IF EXISTS public.product_prices_view;

CREATE VIEW public.product_prices_view AS
-- ============================================================================
-- PART 1: Legacy `prices` table (mapped to offers shape)
-- ============================================================================
SELECT
  p.id                                                  AS id,
  p.product_id                                          AS product_id,
  p.marketplace_id                                      AS marketplace_id,
  NULL::text                                            AS marketplace_product_id,
  p.seller                                              AS seller_name,
  NULL::text                                            AS seller_id,
  p.seller_rating                                       AS seller_rating,
  NULL::text                                            AS seller_location,
  -- Heuristic: seller text contains "official"/"resmi"/"authorized"
  (p.seller ILIKE ANY (ARRAY['%official%', '%resmi%', '%authorized%', '%flagship%']))::boolean
                                                         AS is_official_store,
  NULL::text                                            AS title,
  'unknown'::text                                       AS condition,
  NULL::text                                            AS variant,
  p.url                                                 AS url,
  NULL::text                                            AS image_url,
  p.price                                               AS current_price,
  NULL::integer                                         AS original_price,
  NULL::integer                                         AS discount_percentage,
  CASE
    WHEN p.in_stock IS TRUE THEN 'in_stock'::text
    WHEN p.in_stock IS FALSE THEN 'out_of_stock'::text
    ELSE 'unknown'::text
  END                                                   AS stock_status,
  p.shipping_cost                                       AS shipping_estimate,
  NULL::jsonb                                           AS shipping_info,
  NULL::integer                                         AS sold_count,
  NULL::text                                            AS voucher_text,
  false                                                 AS has_voucher,
  (p.shipping_cost = 0)                                AS has_free_shipping,
  'legacy_prices'::text                                 AS source,
  50                                                    AS confidence_score,
  'perlu dicek ulang'::text                             AS confidence_label,
  'pending'::text                                       AS validation_status,
  true                                                  AS is_active,
  p.last_updated                                        AS last_checked_at,
  NULL::numeric                                         AS rating,
  NULL::integer                                         AS review_count,
  'IDR'::text                                           AS currency,
  mp.name                                               AS marketplace_name,
  mp.display_name                                       AS marketplace_display_name,
  mp.color                                              AS marketplace_color,
  'legacy'::text                                        AS origin
FROM public.prices p
LEFT JOIN public.marketplaces mp ON mp.id = p.marketplace_id

UNION ALL

-- ============================================================================
-- PART 2: New `offers` table (native shape)
-- ============================================================================
SELECT
  o.id                                                  AS id,
  o.product_id                                          AS product_id,
  o.marketplace_id                                      AS marketplace_id,
  o.marketplace_product_id                              AS marketplace_product_id,
  o.seller_name                                         AS seller_name,
  o.seller_id                                           AS seller_id,
  o.seller_rating                                       AS seller_rating,
  o.seller_location                                     AS seller_location,
  COALESCE(o.is_official_store, false)                  AS is_official_store,
  o.title                                               AS title,
  COALESCE(o.condition, 'unknown')                      AS condition,
  o.variant                                             AS variant,
  o.url                                                 AS url,
  o.image_url                                           AS image_url,
  o.current_price                                       AS current_price,
  o.original_price                                      AS original_price,
  o.discount_percentage                                 AS discount_percentage,
  COALESCE(o.stock_status, 'unknown')                   AS stock_status,
  o.shipping_estimate                                   AS shipping_estimate,
  o.shipping_info                                       AS shipping_info,
  o.sold_count                                          AS sold_count,
  o.voucher_text                                        AS voucher_text,
  COALESCE(o.has_voucher, false)                        AS has_voucher,
  COALESCE(o.has_free_shipping, false)                  AS has_free_shipping,
  COALESCE(o.source, 'unknown')                         AS source,
  COALESCE(o.confidence_score, 50)                      AS confidence_score,
  COALESCE(o.confidence_label, 'perlu dicek ulang')     AS confidence_label,
  COALESCE(o.validation_status, 'pending')              AS validation_status,
  COALESCE(o.is_active, true)                           AS is_active,
  o.last_checked_at                                     AS last_checked_at,
  o.rating                                              AS rating,
  o.review_count                                        AS review_count,
  COALESCE(o.currency, 'IDR')                           AS currency,
  mp.name                                               AS marketplace_name,
  mp.display_name                                       AS marketplace_display_name,
  mp.color                                              AS marketplace_color,
  'offers'::text                                        AS origin
FROM public.offers o
LEFT JOIN public.marketplaces mp ON mp.id = o.marketplace_id;

-- ============================================================================
-- VERIFICATION (run after applying)
-- ============================================================================
-- 1. View exists and has rows
--    SELECT COUNT(*) FROM public.product_prices_view;
--    Expected: 165 (offers) + 72 (legacy prices) = 237
--
-- 2. Sample by origin
--    SELECT origin, COUNT(*)
--    FROM public.product_prices_view
--    GROUP BY origin;
--    Expected:
--      offers  | 165
--      legacy  | 72
--
-- 3. Check field mapping correctness (no NULLs in critical fields)
--    SELECT
--      COUNT(*) FILTER (WHERE current_price IS NULL) AS null_prices,
--      COUNT(*) FILTER (WHERE seller_name IS NULL) AS null_sellers,
--      COUNT(*) FILTER (WHERE marketplace_name IS NULL) AS null_marketplaces
--    FROM public.product_prices_view;
--    Expected: all 0
-- ============================================================================

-- ============================================================================
-- GRANTS (RLS)
-- ============================================================================
-- View inherits RLS from underlying tables. Both `offers` and `prices`
-- are readable by anon (public) and writable by service_role only.
-- Default grants should work; explicit GRANT for clarity:
GRANT SELECT ON public.product_prices_view TO anon, authenticated, service_role;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP VIEW IF EXISTS public.product_prices_view;
-- ============================================================================
