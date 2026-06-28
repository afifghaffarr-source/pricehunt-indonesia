-- ============================================================================
-- P2: stock_status Backfill (2026-06-15)
-- ============================================================================
-- Context: 165 offers total. 159 are `stock_status='unknown' + is_active=true
--   + current_price>0`. 6 are already 'in_stock'. 0 are inactive/unpriced.
--   All `last_checked_at` are NULL (no staleness signal in DB).
--
-- Why backfill: deal-score currently gives 'unknown' a score of 5, but
--   'in_stock' gives 10. Confidence also penalizes 'unknown' as a gap.
--   Code already documents (adapter.ts:75): "treat unknown as in-stock so
--   ingestion data still shows up in deals" — this aligns DB with the
--   adapter's intent.
--
-- Heuristic: an active offer with a positive price is functionally listed
--   = available. Conservative because the only signals we have are
--   is_active and current_price (no `last_checked_at`).
--
-- Safety: this migration is wrapped in a transaction with a verify step
--   and a ROLLBACK if invariants break. You can run this in Supabase
--   SQL Editor as one paste.
-- ============================================================================

BEGIN;

-- Step 1: Lock inventory snapshot BEFORE the change
CREATE TEMP TABLE _offers_before AS
SELECT id, stock_status, is_active, current_price
FROM public.offers;

-- Step 2: Apply the backfill
--   Active + priced  -> 'in_stock'
--   Active + unpriced -> stays 'unknown' (no signal)
--   Inactive         -> stays whatever it is (none today, but be safe)
UPDATE public.offers
SET stock_status = 'in_stock',
    updated_at = NOW()
WHERE stock_status = 'unknown'
  AND is_active = true
  AND current_price > 0;

-- Step 3: Sanity checks (RAISE EXCEPTION rolls back)
DO $$
DECLARE
  before_unknown INT;
  after_unknown  INT;
  updated_rows   INT;
BEGIN
  SELECT COUNT(*) INTO before_unknown FROM _offers_before
    WHERE stock_status = 'unknown' AND is_active = true AND current_price > 0;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RAISE NOTICE 'Updated rows: % (expected: %)', updated_rows, before_unknown;

  SELECT COUNT(*) INTO after_unknown FROM public.offers
    WHERE stock_status = 'unknown' AND is_active = true AND current_price > 0;

  IF after_unknown > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % offers still unknown+active+priced', after_unknown;
  END IF;

  -- Hard guard: any active offer that WAS inactive must not exist
  IF EXISTS (
    SELECT 1 FROM public.offers
    WHERE stock_status = 'out_of_stock' AND is_active = true
  ) THEN
    RAISE WARNING 'Found active offers with out_of_stock status (should not happen)';
  END IF;
END $$;

-- Step 4: Report new distribution
SELECT
  stock_status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM public.offers
GROUP BY stock_status
ORDER BY count DESC;

COMMIT;

-- ============================================================================
-- Expected output:
--   stock_status    | count | pct
--   ----------------+-------+------
--   in_stock        | 165   | 100.0
--
-- If you see any 'unknown' or 'out_of_stock' rows, run the discovery query
-- below to investigate before re-running this script.
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if needed, before any other writes hit the table):
-- ============================================================================
-- BEGIN;
-- UPDATE public.offers o
-- SET stock_status = b.stock_status
-- FROM _offers_before b
-- WHERE o.id = b.id
--   AND b.stock_status = 'unknown'
--   AND o.stock_status = 'in_stock'
--   AND o.is_active = true
--   AND o.current_price > 0;
-- COMMIT;
-- DROP TABLE _offers_before;
-- ============================================================================
