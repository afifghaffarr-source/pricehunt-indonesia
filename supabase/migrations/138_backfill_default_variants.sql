-- Migration 138: Backfill default variants for existing products + offers
-- Phase 1 schema refactor — idempotent INSERT…WHERE NOT EXISTS pattern.

BEGIN;

-- 1. Insert default variant rows for every product that has none yet.
INSERT INTO product_variants (id, product_id, slug, is_default, is_active)
SELECT gen_random_uuid(), p.id, 'default', TRUE, TRUE
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants pv
  WHERE pv.product_id = p.id AND pv.is_default = TRUE
);

-- 2. Backfill offers.variant_id for offers that have a product_id but no variant.
UPDATE offers o
SET variant_id = pv.id
FROM product_variants pv
WHERE o.product_id = pv.product_id
  AND pv.is_default = TRUE
  AND o.variant_id IS NULL
  AND o.product_id IS NOT NULL;

-- 3. Backfill products.default_variant_id
UPDATE products p
SET default_variant_id = pv.id
FROM product_variants pv
WHERE p.id = pv.product_id
  AND pv.is_default = TRUE
  AND p.default_variant_id IS NULL;

COMMIT;
