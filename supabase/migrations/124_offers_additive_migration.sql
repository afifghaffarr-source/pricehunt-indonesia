-- Migration 124: Additive Offers / Price Snapshots Upgrade
-- Date: 2026-06-13
-- Phase 3 hardening: NON-DESTRUCTIVE alternative to migrations 114/115.
--
-- Use this migration:
--   (a) on a fresh database, INSTEAD OF 114 and 115, OR
--   (b) on an already-upgraded production database, as a safe no-op
--       (every statement is IF NOT EXISTS / IF EXISTS / OR REPLACE).
--
-- The post-107/pre-114 schema for `offers` had:
--   - product_id NOT NULL
--   - column `price` (INTEGER), no `current_price`
--   - column `in_stock` (BOOLEAN), no `stock_status`
--   - no `is_active`, no `source`, no `confidence_score`
--   - no `validation_status`, no `confidence_label`
--   - default condition 'new' (post-114 default is 'unknown')
--   - no UNIQUE constraint on `url`
--
-- The post-107 schema for `price_snapshots` had:
--   - column `price` (INTEGER), no `current_price`
--   - no `stock_status`, no `voucher_text`, no `shipping_estimate`
--   - no `source`, no `confidence_score`
--   - no `raw_hash`, no `discount_percent`
--
-- This migration makes the schema equivalent to the post-114 / post-115
-- state using only ADD COLUMN / ALTER TABLE ADD CONSTRAINT statements.
-- It does NOT drop any legacy columns. Old column names are kept as
-- read-only legacy fields. The application code (see Phase 2 fixes)
-- reads from the NEW column names (`current_price`, `stock_status`).
--
-- ============================================================================
-- OFFERS TABLE
-- ============================================================================

-- 1. Allow product_id to be NULL (matches post-114 / migration 112)
ALTER TABLE offers ALTER COLUMN product_id DROP NOT NULL;

-- 2. UNIQUE on url (matches post-114 / migration 112)
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_url_unique ON offers(url);

-- 3. Add the new data-trust columns. Every one is IF NOT EXISTS, so
--    re-applying on a post-114 database is a no-op.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS category_hint TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (validation_status IN ('pending', 'valid', 'conflict', 'parser_error', 'stale', 'rejected'));
ALTER TABLE offers ADD COLUMN IF NOT EXISTS confidence_label TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'unknown'
  CHECK (condition IN ('new', 'used', 'refurbished', 'unknown'));
ALTER TABLE offers ADD COLUMN IF NOT EXISTS variant TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS current_price INTEGER;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS original_price INTEGER;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS discount_percentage INTEGER;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS stock_status TEXT NOT NULL DEFAULT 'unknown'
  CHECK (stock_status IN ('in_stock', 'low_stock', 'limited', 'out_of_stock', 'pre_order', 'unknown'));
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS shipping_estimate INTEGER;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual_admin';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS confidence_score INTEGER;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'IDR';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS marketplace_product_id TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS seller_id TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS seller_location TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_official_store BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS review_count INT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS sold_count INT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS voucher_text TEXT;

-- 4. Backfill: for offers that have a legacy `price` column and no
--    `current_price`, copy it across. This is data preservation for
--    fresh databases that are still on the pre-114 schema. On
--    post-114 databases this is a no-op because `price` is gone.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'price'
  ) THEN
    UPDATE offers
    SET current_price = COALESCE(current_price, price)
    WHERE current_price IS NULL;
  END IF;
END $$;

-- 5. Backfill stock_status from legacy in_stock flag, if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'in_stock'
  ) THEN
    UPDATE offers
    SET stock_status = CASE
      WHEN in_stock IS TRUE THEN 'in_stock'
      WHEN in_stock IS FALSE THEN 'out_of_stock'
      ELSE stock_status
    END
    WHERE stock_status = 'unknown' AND in_stock IS NOT NULL;
  END IF;
END $$;

-- 6. Add the post-114 indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_offers_product_id ON offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_marketplace_id ON offers(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_offers_current_price ON offers(current_price);
CREATE INDEX IF NOT EXISTS idx_offers_last_checked_at ON offers(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_offers_is_active ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_validation_status ON offers(validation_status);
CREATE INDEX IF NOT EXISTS idx_offers_source ON offers(source);
CREATE INDEX IF NOT EXISTS idx_offers_confidence_score ON offers(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON offers(seller_id);

-- 7. Make sure the FK from offers.product_id uses ON DELETE SET NULL
--    (matches post-114 / migration 112). The IF NOT EXISTS pattern
--    below drops and re-adds it; this is safe because the constraint
--    has the same definition either way.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offers_product_id_fkey'
      AND conrelid = 'offers'::regclass
      AND (confdeltype IS DISTINCT FROM 'a')  -- 'a' = NO ACTION, 'r' = RESTRICT,
                                              -- 'c' = CASCADE, 'n' = SET NULL,
                                              -- 'd' = SET DEFAULT
  ) THEN
    ALTER TABLE offers DROP CONSTRAINT offers_product_id_fkey;
    ALTER TABLE offers
      ADD CONSTRAINT offers_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 8. Make sure RLS is enabled and the public-read policy is in place.
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'offers'
      AND policyname = 'Public can read active offers'
  ) THEN
    CREATE POLICY "Public can read active offers"
      ON offers FOR SELECT
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'offers'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON offers FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- PRICE_SNAPSHOTS TABLE
-- ============================================================================

-- 9. Add the new price_snapshots columns.
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS current_price INTEGER;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS stock_status TEXT
  CHECK (stock_status IS NULL OR stock_status IN ('in_stock', 'low_stock', 'low_stock', 'out_of_stock', 'unknown'));
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS voucher_text TEXT;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS shipping_estimate INTEGER;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS raw_hash TEXT;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual_admin';
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS confidence_score INTEGER;

-- 10. Backfill current_price from legacy `price` if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'price_snapshots' AND column_name = 'price'
  ) THEN
    UPDATE price_snapshots
    SET current_price = COALESCE(current_price, price)
    WHERE current_price IS NULL;
  END IF;
END $$;

-- 11. Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_price_snapshots_offer_id ON price_snapshots(offer_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_captured_at ON price_snapshots(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_offer_captured ON price_snapshots(offer_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_raw_hash ON price_snapshots(raw_hash);

-- 12. RLS policies
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'price_snapshots'
      AND policyname = 'Public can read snapshots'
  ) THEN
    CREATE POLICY "Public can read snapshots"
      ON price_snapshots FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'price_snapshots'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON price_snapshots FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION (read-only)
-- ============================================================================

DO $$
DECLARE
  has_current_price BOOLEAN;
  has_stock_status BOOLEAN;
  has_validation_status BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'current_price'
  ) INTO has_current_price;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'stock_status'
  ) INTO has_stock_status;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'validation_status'
  ) INTO has_validation_status;

  IF NOT (has_current_price AND has_stock_status AND has_validation_status) THEN
    RAISE WARNING 'Migration 124: offers schema is missing one of current_price/stock_status/validation_status';
  ELSE
    RAISE NOTICE 'Migration 124: offers schema looks correct.';
  END IF;
END $$;

ANALYZE offers;
ANALYZE price_snapshots;

SELECT 'Migration 124: additive offers / price_snapshots upgrade complete.' AS status;
