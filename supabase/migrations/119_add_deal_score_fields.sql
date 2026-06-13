-- Migration 119: Add Deal Score Required Fields
-- Date: 2026-06-13
-- Purpose: Add missing fields needed by deal score engine (src/lib/deal-score.ts)
-- Context: Deal score logic expects seller_review_count, has_voucher, has_free_shipping
--          but offers table only has seller_rating and is_official_store

-- ============================================================================
-- ANALYSIS: What's Missing
-- ============================================================================
-- Deal score engine (calculateDealScore) uses:
--   ✅ sellerRating          → offers.seller_rating (exists)
--   ❌ sellerReviewCount     → MISSING (ingestion sends review_count)
--   ✅ isOfficialStore       → offers.is_official_store (exists)
--   ❌ hasVoucher            → MISSING (ingestion sends voucher_text)
--   ❌ hasFreeShipping       → MISSING (not collected yet)
--   ✅ stockStatus           → offers.stock_status (exists)
--   ✅ currentPrice          → offers.current_price (exists)
--   ✅ originalPrice         → offers.original_price (exists)

-- STEP 1: Add seller_review_count
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS seller_review_count INTEGER CHECK (seller_review_count IS NULL OR seller_review_count >= 0);

COMMENT ON COLUMN offers.seller_review_count IS 'Number of reviews for this seller (for trust scoring)';

-- STEP 2: Add sold_count (bonus: useful for social proof)
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS sold_count INTEGER CHECK (sold_count IS NULL OR sold_count >= 0);

COMMENT ON COLUMN offers.sold_count IS 'Number of items sold (social proof indicator)';

-- STEP 3: Add voucher fields
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS voucher_text TEXT;

ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS has_voucher BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN offers.voucher_text IS 'Voucher description text from marketplace (e.g., "Diskon 50rb")';
COMMENT ON COLUMN offers.has_voucher IS 'Computed flag: TRUE if voucher_text is not empty';

-- STEP 4: Add shipping fields
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS has_free_shipping BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS shipping_info TEXT;

COMMENT ON COLUMN offers.has_free_shipping IS 'TRUE if offer includes free shipping';
COMMENT ON COLUMN offers.shipping_info IS 'Shipping details text (e.g., "Gratis Ongkir", "Rp 15.000")';

-- STEP 5: Create indexes for deal score queries
CREATE INDEX IF NOT EXISTS idx_offers_seller_review_count ON offers(seller_review_count) WHERE seller_review_count IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_has_voucher ON offers(has_voucher) WHERE has_voucher = true;
CREATE INDEX IF NOT EXISTS idx_offers_has_free_shipping ON offers(has_free_shipping) WHERE has_free_shipping = true;

-- STEP 6: Backfill has_voucher from existing voucher_text (if any data exists)
-- This will run on existing rows, new rows should set has_voucher during insert
UPDATE offers 
SET has_voucher = true 
WHERE voucher_text IS NOT NULL AND voucher_text != '' AND has_voucher = false;

-- STEP 7: Add trigger to auto-compute has_voucher on INSERT/UPDATE
CREATE OR REPLACE FUNCTION compute_offer_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set has_voucher based on voucher_text
  IF NEW.voucher_text IS NOT NULL AND NEW.voucher_text != '' THEN
    NEW.has_voucher := true;
  ELSE
    NEW.has_voucher := false;
  END IF;
  
  -- Auto-set has_free_shipping based on shipping_info
  IF NEW.shipping_info IS NOT NULL AND (
    LOWER(NEW.shipping_info) LIKE '%gratis%' OR
    LOWER(NEW.shipping_info) LIKE '%free%' OR
    LOWER(NEW.shipping_info) LIKE '%bebas%'
  ) THEN
    NEW.has_free_shipping := true;
  ELSIF NEW.shipping_estimate = 0 THEN
    NEW.has_free_shipping := true;
  ELSE
    NEW.has_free_shipping := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_compute_offer_flags ON offers;
CREATE TRIGGER trigger_compute_offer_flags
  BEFORE INSERT OR UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION compute_offer_flags();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify:

-- 1. Check new columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'offers' 
-- AND column_name IN ('seller_review_count', 'sold_count', 'voucher_text', 'has_voucher', 'has_free_shipping', 'shipping_info')
-- ORDER BY column_name;

-- 2. Check indexes created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'offers' 
-- AND indexname LIKE '%voucher%' OR indexname LIKE '%shipping%' OR indexname LIKE '%review%';

-- 3. Sample data
-- SELECT id, seller_name, seller_rating, seller_review_count, has_voucher, has_free_shipping 
-- FROM offers 
-- LIMIT 5;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP TRIGGER IF EXISTS trigger_compute_offer_flags ON offers;
-- DROP FUNCTION IF EXISTS compute_offer_flags();
-- DROP INDEX IF EXISTS idx_offers_seller_review_count;
-- DROP INDEX IF EXISTS idx_offers_has_voucher;
-- DROP INDEX IF EXISTS idx_offers_has_free_shipping;
-- ALTER TABLE offers DROP COLUMN IF EXISTS seller_review_count;
-- ALTER TABLE offers DROP COLUMN IF EXISTS sold_count;
-- ALTER TABLE offers DROP COLUMN IF EXISTS voucher_text;
-- ALTER TABLE offers DROP COLUMN IF EXISTS has_voucher;
-- ALTER TABLE offers DROP COLUMN IF EXISTS has_free_shipping;
-- ALTER TABLE offers DROP COLUMN IF EXISTS shipping_info;
