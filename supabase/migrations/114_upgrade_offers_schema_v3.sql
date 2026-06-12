-- Migration 114 v3: Upgrade Offers Table (APPLIED 2026-06-12)
-- Date: 2026-06-12
-- Status: ✅ APPLIED SUCCESSFULLY
-- Purpose: Replace old offers schema with data trust schema

-- STEP 1: Create backup of 8 existing offers
CREATE TABLE offers_backup_20260612 AS 
SELECT * FROM offers;

-- STEP 2: Drop old offers and recreate with new schema
DROP TABLE offers CASCADE;

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  marketplace_id UUID NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
  marketplace_product_id TEXT,
  seller_name TEXT,
  seller_id TEXT,
  seller_rating NUMERIC(3,2),
  seller_location TEXT,
  is_official_store BOOLEAN NOT NULL DEFAULT FALSE,
  title TEXT,
  condition TEXT NOT NULL DEFAULT 'unknown' CHECK (condition IN ('new', 'used', 'refurbished', 'unknown')),
  variant TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  category_hint TEXT,
  current_price INTEGER NOT NULL CHECK (current_price >= 0),
  original_price INTEGER CHECK (original_price IS NULL OR original_price >= 0),
  discount_percentage INTEGER CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100)),
  stock_status TEXT NOT NULL DEFAULT 'unknown' CHECK (stock_status IN ('in_stock', 'low_stock', 'limited', 'out_of_stock', 'pre_order', 'unknown')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  shipping_estimate INTEGER CHECK (shipping_estimate IS NULL OR shipping_estimate >= 0),
  source TEXT NOT NULL DEFAULT 'manual_admin' CHECK (source IN ('official_api', 'affiliate_feed', 'browser_collector', 'extension_snapshot', 'targeted_crawler', 'community_proof', 'manual_admin')),
  confidence_score INTEGER CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  confidence_label TEXT CHECK (confidence_label IN ('sangat dipercaya', 'dipercaya', 'cukup dipercaya', 'perlu dicek ulang', 'data belum pasti')),
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'conflict', 'parser_error', 'stale', 'rejected')),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(url)
);

-- STEP 3: Create indexes
CREATE INDEX idx_offers_product_id ON offers(product_id);
CREATE INDEX idx_offers_marketplace_id ON offers(marketplace_id);
CREATE INDEX idx_offers_current_price ON offers(current_price);
CREATE INDEX idx_offers_last_checked_at ON offers(last_checked_at);
CREATE INDEX idx_offers_is_active ON offers(is_active);
CREATE INDEX idx_offers_validation_status ON offers(validation_status);

-- STEP 4: RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active" ON offers FOR SELECT USING (is_active = true);
CREATE POLICY "Service role full" ON offers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- STEP 5: Migrate data (OLD schema → NEW schema)
INSERT INTO offers (
  id, product_id, marketplace_id, seller_name, seller_rating, title, url, image_url, category_hint,
  current_price, original_price, discount_percentage, stock_status, is_active, shipping_estimate,
  source, confidence_score, confidence_label, validation_status, last_checked_at, created_at, updated_at
)
SELECT 
  id, product_id, marketplace_id, seller_name, seller_rating, title, url, image_url, category_hint,
  price, original_price, discount_percentage,
  CASE WHEN in_stock THEN 'in_stock' ELSE 'out_of_stock' END,
  true, shipping_cost,
  'manual_admin', 75, 'dipercaya',
  COALESCE(validation_status, 'pending'),
  NOW(), created_at, updated_at
FROM offers_backup_20260612;

-- VERIFICATION RESULTS (2026-06-12):
-- ✅ 5 new columns created: condition, confidence_score, current_price, source, stock_status
-- ✅ 8 offers migrated successfully
-- ✅ 8 backup rows preserved in offers_backup_20260612
