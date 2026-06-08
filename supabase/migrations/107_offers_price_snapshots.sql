-- Migration: Offers and Price Snapshots Planning
-- Purpose: Add a stronger price model without breaking existing products/prices/price_history tables.

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  marketplace_id UUID NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
  marketplace_product_id TEXT,
  seller_name TEXT,
  seller_rating NUMERIC(3,2),
  is_official_store BOOLEAN NOT NULL DEFAULT FALSE,
  condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished', 'unknown')),
  variant TEXT,
  url TEXT NOT NULL,
  current_price INTEGER NOT NULL CHECK (current_price >= 0),
  original_price INTEGER CHECK (original_price IS NULL OR original_price >= 0),
  stock_status TEXT NOT NULL DEFAULT 'unknown' CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  location TEXT,
  shipping_estimate INTEGER CHECK (shipping_estimate IS NULL OR shipping_estimate >= 0),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, marketplace_id, marketplace_product_id)
);

CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK (price >= 0),
  original_price INTEGER CHECK (original_price IS NULL OR original_price >= 0),
  discount_percent NUMERIC(5,2),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'system',
  confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_offers_product_id ON offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_marketplace_id ON offers(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_offers_current_price ON offers(current_price);
CREATE INDEX IF NOT EXISTS idx_offers_last_checked_at ON offers(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_offer_captured ON price_snapshots(offer_id, captured_at DESC);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read offers"
  ON offers FOR SELECT
  USING (true);

CREATE POLICY "Public can read price snapshots"
  ON price_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Service role writes offers"
  ON offers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role writes price snapshots"
  ON price_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE offers IS 'Normalized marketplace listings per product. Existing prices table remains supported during migration.';
COMMENT ON TABLE price_snapshots IS 'Historical offer-level price observations for fake discount and deal intelligence.';