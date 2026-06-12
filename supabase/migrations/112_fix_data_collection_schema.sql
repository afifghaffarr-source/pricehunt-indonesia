-- Migration 112: Fix Data Collection Schema Issues
-- Purpose: Resolve schema bugs found in migrations 107, 108, 110
-- Safe to run: All operations are backward-compatible or additive
-- Date: 2026-06-12

-- ============================================================================
-- FIX 1: offers.product_id should be NULLABLE
-- Reason: Ingestion API should be able to save offers without product match
-- ============================================================================

ALTER TABLE offers 
  ALTER COLUMN product_id DROP NOT NULL;

COMMENT ON COLUMN offers.product_id IS 'Optional product reference. Can be NULL when product matching fails during ingestion.';

-- ============================================================================
-- FIX 2: Add UNIQUE constraint on offers.url
-- Reason: Ingestion API uses onConflict: "url" but constraint doesn't exist
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_url_unique ON offers(url);

COMMENT ON INDEX idx_offers_url_unique IS 'Enforce URL uniqueness for upsert operations during data ingestion';

-- ============================================================================
-- FIX 3: Fix crawl_targets index - wrong column name
-- Reason: Migration 110 used "status" but column is "crawl_status"
-- ============================================================================

-- Drop the incorrect index if it exists
DROP INDEX IF EXISTS idx_crawl_targets_next_crawl_at;

-- Recreate with correct column name
CREATE INDEX IF NOT EXISTS idx_crawl_targets_next_crawl_at 
  ON crawl_targets(next_crawl_at) 
  WHERE crawl_status = 'queued';

-- ============================================================================
-- FIX 4: Update data_sources.type enum to include browser_collector
-- Reason: Migration 110 inserts browser_collector but enum doesn't support it
-- ============================================================================

-- First, check if we need to update the constraint
-- Drop old constraint if exists
ALTER TABLE data_sources 
  DROP CONSTRAINT IF EXISTS data_sources_type_check;

-- Add new constraint with browser_collector included
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

COMMENT ON CONSTRAINT data_sources_type_check ON data_sources IS 'Valid data source types including browser_collector for semi-automated collection';

-- ============================================================================
-- FIX 5: Update existing extension_snapshot records to browser_collector
-- Reason: Migration 110 seeded as extension_snapshot but should be browser_collector
-- ============================================================================

-- Update the seed data entry created in migration 110
UPDATE data_sources 
SET type = 'browser_collector'
WHERE name = 'browser_collector' 
  AND type = 'extension_snapshot';

-- ============================================================================
-- FIX 6: Update offers FK to ON DELETE SET NULL for product_id
-- Reason: Allow product deletion without cascading delete to offers
-- ============================================================================

-- Drop existing FK constraint
ALTER TABLE offers 
  DROP CONSTRAINT IF EXISTS offers_product_id_fkey;

-- Recreate with SET NULL behavior
ALTER TABLE offers 
  ADD CONSTRAINT offers_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES products(id) 
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT offers_product_id_fkey ON offers IS 'Allow offers to survive product deletion (orphaned offers can be matched later)';

-- ============================================================================
-- FIX 7: Ensure recheck_requests.offer_id is optional
-- Reason: Users might request recheck by product_id only
-- ============================================================================

ALTER TABLE recheck_requests 
  ALTER COLUMN offer_id DROP NOT NULL;

COMMENT ON COLUMN recheck_requests.offer_id IS 'Optional specific offer to recheck. NULL means recheck all offers for the product.';

-- ============================================================================
-- FIX 8: Add validation_status to offers if missing (idempotent)
-- Reason: Some installations might have run 107/108 before 110
-- ============================================================================

-- This was in migration 110 but we ensure it's here for consistency
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

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

/*
-- Verify product_id is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'offers' AND column_name = 'product_id';
-- Expected: is_nullable = 'YES'

-- Verify URL unique constraint exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'offers' AND indexname = 'idx_offers_url_unique';
-- Expected: 1 row with UNIQUE constraint

-- Verify data_sources constraint includes browser_collector
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'data_sources'::regclass AND conname = 'data_sources_type_check';
-- Expected: constraint definition includes 'browser_collector'

-- Verify crawl_targets index uses correct column
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'crawl_targets' AND indexname = 'idx_crawl_targets_next_crawl_at';
-- Expected: WHERE crawl_status = 'queued'

-- Test insert offer without product_id
INSERT INTO offers (
  product_id, marketplace_id, url, current_price, source
) VALUES (
  NULL, 
  (SELECT id FROM marketplaces LIMIT 1),
  'https://test-url-' || gen_random_uuid()::text,
  100000,
  'browser_collector'
) RETURNING id;
-- Expected: Success with offer_id returned
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ offers.product_id is now NULLABLE
-- ✅ offers.url has UNIQUE constraint
-- ✅ crawl_targets index fixed (crawl_status not status)
-- ✅ data_sources.type supports browser_collector
-- ✅ offers FK changed to ON DELETE SET NULL
-- ✅ recheck_requests.offer_id is NULLABLE
-- ✅ Idempotent validation_status check
