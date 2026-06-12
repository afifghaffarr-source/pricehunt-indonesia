-- Migration 112: Fix Data Collection Schema Issues (v2 - Simplified)
-- Purpose: Resolve schema bugs found in migrations 107, 108, 110
-- Date: 2026-06-12

-- FIX 1: offers.product_id should be NULLABLE
ALTER TABLE offers 
  ALTER COLUMN product_id DROP NOT NULL;

-- FIX 2: Add UNIQUE constraint on offers.url
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_url_unique ON offers(url);

-- FIX 3: Fix crawl_targets index - wrong column name
DROP INDEX IF EXISTS idx_crawl_targets_next_crawl_at;
CREATE INDEX IF NOT EXISTS idx_crawl_targets_next_crawl_at 
  ON crawl_targets(next_crawl_at) 
  WHERE crawl_status = 'queued';

-- FIX 4: Update data_sources.type enum to include browser_collector
ALTER TABLE data_sources 
  DROP CONSTRAINT IF EXISTS data_sources_type_check;

ALTER TABLE data_sources 
  ADD CONSTRAINT data_sources_type_check 
  CHECK (type IN (
    'official_api',
    'affiliate_feed',
    'browser_collector',
    'extension_snapshot',
    'targeted_crawler',
    'community_proof',
    'manual_admin'
  ));

-- FIX 5: Update existing extension_snapshot records to browser_collector
UPDATE data_sources 
SET type = 'browser_collector'
WHERE name = 'browser_collector' 
  AND type = 'extension_snapshot';

-- FIX 6: Update offers FK to ON DELETE SET NULL for product_id
ALTER TABLE offers 
  DROP CONSTRAINT IF EXISTS offers_product_id_fkey;

ALTER TABLE offers 
  ADD CONSTRAINT offers_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES products(id) 
  ON DELETE SET NULL;

-- FIX 7: Ensure recheck_requests.offer_id is optional
ALTER TABLE recheck_requests 
  ALTER COLUMN offer_id DROP NOT NULL;

-- FIX 8: Add validation_status to offers if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'validation_status'
  ) THEN
    ALTER TABLE offers 
      ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'pending' 
      CHECK (validation_status IN ('pending', 'valid', 'conflict', 'parser_error', 'stale', 'rejected'));
    
    CREATE INDEX idx_offers_validation_status ON offers(validation_status);
  END IF;
END $$;

-- Migration 112 Complete
