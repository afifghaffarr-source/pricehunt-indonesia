-- Migration 137: Add variant_id FK columns to offers, price_snapshots, products
-- Phase 1 schema refactor — additive columns only.
-- ON DELETE RESTRICT protects against accidentally orphaning price snapshots or offers.

BEGIN;

-- offers.variant_id (nullable; legacy rows stay null)
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS offers_variant_idx
  ON offers (variant_id)
  WHERE variant_id IS NOT NULL;

-- price_snapshots.variant_id
ALTER TABLE price_snapshots
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS price_snapshots_variant_idx
  ON price_snapshots (variant_id)
  WHERE variant_id IS NOT NULL;

-- products.default_variant_id
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS default_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_default_variant_idx
  ON products (default_variant_id);

COMMIT;
