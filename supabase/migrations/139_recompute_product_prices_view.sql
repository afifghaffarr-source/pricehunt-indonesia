-- ============================================================================
-- Migration 139: Recompute `product_prices_view` to expose `variant_id`
-- ============================================================================
-- Phase 1 schema refactor — view recomputation for variant-aware reads.
--
-- CONTEXT
-- Migration 137 added `offers.variant_id UUID` (nullable; references
-- `product_variants(id)` with ON DELETE RESTRICT).
-- Migration 138 backfilled the default variant row for every product and
-- pointed every existing offer at it, so `variant_id` is now effectively
-- populated for catalog-bound rows.
--
-- Migration 128 already replaced the legacy `prices ∪ offers` union view
-- with an offers-only definition after dropping `public.prices`. That
-- post-128 view does NOT expose `variant_id`, so variant-aware UI in
-- Phase 3 has to JOIN `offers` on every read. This migration re-renders
-- the view with the column natively exposed, making it the single read
-- path for variant-aware price lookups.
--
-- BACKWARD COMPATIBILITY
-- Every prior column is preserved (same names, same order, except
-- `variant_id` inserted directly after `product_id` so its position
-- reads naturally as "this offer's variant for this product"). The new
-- column is nullable per the underlying table, so legacy / orphan offers
-- continue to materialize without modification.
--
-- SAFETY
-- View recreation is idempotent: we DROP before CREATE. Underlying
-- `offers` table is unchanged (no column add, no row touch). All
-- consumers query the view by column name, so insertion of a column
-- between `product_id` and `marketplace_id` cannot break existing SELECT
-- lists that enumerate columns explicitly only if they bind by ordinal
-- position (none in the codebase — every consumer uses named columns
-- or `*`).
-- ============================================================================

BEGIN;

-- Drop if exists (idempotent re-runs)
DROP VIEW IF EXISTS public.product_prices_view;

CREATE OR REPLACE VIEW public.product_prices_view AS
SELECT
  o.id                                                  AS id,
  o.product_id                                          AS product_id,
  o.variant_id                                          AS variant_id,
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
-- GRANTS (RLS)
-- ============================================================================
-- View inherits RLS from `offers` (readable by anon / authenticated,
-- writable by service_role only). Explicit GRANT for clarity, matching
-- the GRANT line established in migration 125.
GRANT SELECT ON public.product_prices_view TO anon, authenticated, service_role;

-- ============================================================================
-- VERIFICATION (run after applying)
-- ============================================================================
-- 1. View exists and has the new column
--    SELECT variant_id FROM public.product_prices_view LIMIT 1;
--    Expected: NULL for legacy/null offers, UUID for post-backfill ones.
--
-- 2. Row count is unchanged from the post-128 baseline
--    SELECT COUNT(*) FROM public.product_prices_view;
--    Expected: same as pre-139 (no rows lost, no duplication).
--
-- 3. variant_id join works without the extra offers round-trip
--    SELECT pv.slug, COUNT(*)
--    FROM public.product_prices_view ppv
--    LEFT JOIN product_variants pv ON pv.id = ppv.variant_id
--    GROUP BY pv.slug
--    ORDER BY 2 DESC;
--    Expected: a result set where the `default` slug dominates after
--    a fresh migration 138 backfill.
-- ============================================================================

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
-- DROP VIEW IF EXISTS public.product_prices_view;
-- -- Re-apply migration 128's offers-only view verbatim (without variant_id).
-- COMMIT;
-- ============================================================================
