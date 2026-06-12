-- Migration 114: Upgrade Offers Table to New Schema
-- Date: 2026-06-12
-- Purpose: Replace old offers schema with data trust schema (current_price, stock_status, etc)

-- STEP 1: Backup existing offers (8 rows)
CREATE TABLE IF NOT EXISTS offers_backup_20260612 AS 
SELECT * FROM offers;

-- STEP 2: Drop old offers table and dependent objects
DROP TABLE IF EXISTS offers CASCADE;

-- STEP 3: Create NEW offers table with correct schema
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations (product_id now NULLABLE per Migration 112)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  marketplace_id UUID NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
  
  -- Marketplace data
  marketplace_product_id TEXT,
  seller_name TEXT,
  seller_id TEXT,
  seller_rating NUMERIC(3,2),
  seller_location TEXT,
  is_official_store BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Product details
  title TEXT,
  condition TEXT NOT NULL DEFAULT 'unknown' CHECK (condition IN ('new', 'used', 'refurbished', 'unknown')),
  variant TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  category_hint TEXT,
  
  -- Pricing
  current_price INTEGER NOT NULL CHECK (current_price >= 0),
  original_price INTEGER CHECK (original_price IS NULL OR original_price >= 0),
  discount_percentage INTEGER CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100)),
  
  -- Availability
  stock_status TEXT NOT NULL DEFAULT 'unknown' CHECK (stock_status IN ('in_stock', 'low_stock', 'limited', 'out_of_stock', 'pre_order', 'unknown')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Shipping
  shipping_estimate INTEGER CHECK (shipping_estimate IS NULL OR shipping_estimate >= 0),
  
  -- Data trust metadata
  source TEXT NOT NULL DEFAULT 'manual_admin' CHECK (source IN ('official_api', 'affiliate_feed', 'browser_collector', 'extension_snapshot', 'targeted_crawler', 'community_proof', 'manual_admin')),
  confidence_score INTEGER CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  confidence_label TEXT CHECK (confidence_label IN ('sangat dipercaya', 'dipercaya', 'cukup dipercaya', 'perlu dicek ulang', 'data belum pasti')),
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'conflict', 'parser_error', 'stale', 'rejected')),
  
  -- Timestamps
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(url)
);

-- STEP 4: Create indexes
CREATE INDEX idx_offers_product_id ON offers(product_id);
CREATE INDEX idx_offers_marketplace_id ON offers(marketplace_id);
CREATE INDEX idx_offers_current_price ON offers(current_price);
CREATE INDEX idx_offers_last_checked_at ON offers(last_checked_at);
CREATE INDEX idx_offers_is_active ON offers(is_active);
CREATE INDEX idx_offers_validation_status ON offers(validation_status);
CREATE INDEX idx_offers_url_unique ON offers(url);

-- STEP 5: RLS policies
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active offers"
  ON offers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role full access"
  ON offers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- STEP 6: Migrate 8 existing offers from backup
-- Map old schema to new schema
INSERT INTO offers (
  id,
  product_id,
  marketplace_id,
  seller_name,
  seller_rating,
  title,
  url,
  image_url,
  category_hint,
  current_price,
  original_price,
  discount_percentage,
  stock_status,
  is_active,
  shipping_cost,
  source,
  confidence_score,
  confidence_label,
  validation_status,
  last_checked_at,
  created_at,
  updated_at
)
SELECT 
  id,
  product_id,
  marketplace_id,
  seller_name,
  seller_rating,
  title,
  url,
  image_url,
  category_hint,
  price as current_price,
  original_price,
  discount_percentage,
  CASE 
    WHEN in_stock = true THEN 'in_stock'
    WHEN in_stock = false THEN 'out_of_stock'
    ELSE 'unknown'
  END as stock_status,
  true as is_active,
  shipping_cost,
  'manual_admin' as source,
  75 as confidence_score,
  'dipercaya' as confidence_label,
  COALESCE(validation_status, 'pending') as validation_status,
  NOW() as last_checked_at,
  created_at,
  updated_at
FROM offers_backup_20260612;

-- STEP 7: Verify migration
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM offers_backup_20260612;
  SELECT COUNT(*) INTO new_count FROM offers;
  
  IF old_count != new_count THEN
    RAISE EXCEPTION 'Migration failed: old count % != new count %', old_count, new_count;
  END IF;
  
  RAISE NOTICE 'Migration successful: % offers migrated', new_count;
END $$;
