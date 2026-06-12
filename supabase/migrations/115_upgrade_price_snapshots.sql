-- Migration 115: Upgrade Price Snapshots Table
-- Date: 2026-06-12
-- Purpose: Replace old price_snapshots schema with data trust schema
-- Safe: 0 existing rows

-- STEP 1: Drop old table (safe, no data)
DROP TABLE IF EXISTS price_snapshots CASCADE;

-- STEP 2: Create NEW price_snapshots with correct schema
CREATE TABLE price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  
  -- Price data
  current_price INTEGER NOT NULL CHECK (current_price >= 0),
  original_price INTEGER CHECK (original_price IS NULL OR original_price >= 0),
  discount_percent NUMERIC(5,2),
  
  -- Stock data
  stock_status TEXT NOT NULL DEFAULT 'unknown' CHECK (stock_status IN ('in_stock', 'low_stock', 'limited', 'out_of_stock', 'pre_order', 'unknown')),
  
  -- Metadata
  voucher_text TEXT,
  shipping_estimate INTEGER CHECK (shipping_estimate IS NULL OR shipping_estimate >= 0),
  
  -- Data trust
  source TEXT NOT NULL DEFAULT 'manual_admin' CHECK (source IN ('official_api', 'affiliate_feed', 'browser_collector', 'extension_snapshot', 'targeted_crawler', 'community_proof', 'manual_admin')),
  confidence_score INTEGER CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  
  -- Timestamps
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 3: Create indexes
CREATE INDEX idx_price_snapshots_offer_id ON price_snapshots(offer_id);
CREATE INDEX idx_price_snapshots_captured_at ON price_snapshots(captured_at DESC);
CREATE INDEX idx_price_snapshots_offer_captured ON price_snapshots(offer_id, captured_at DESC);

-- STEP 4: RLS
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read snapshots"
  ON price_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Service role full access"
  ON price_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- VERIFICATION: Table should exist with 0 rows
-- Run after migration:
-- SELECT COUNT(*) FROM price_snapshots; -- Expected: 0
