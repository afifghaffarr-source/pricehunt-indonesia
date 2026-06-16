-- Migration 130: Enforce unique (product_id, marketplace_id) on offers
-- Date: 2026-06-16
-- Purpose: Prevent duplicate offers for the same (product, marketplace) pair.
--          Replaces the de-facto state where the only unique was on `url`,
--          allowing up to 11 duplicate rows per (product, marketplace) when
--          URLs collided on placeholder patterns (mitigated in v1.5.1 adapter).
--
-- Pre-state (live DB inspected 2026-06-16):
--   - 208 offers total
--   - 199 with non-null product_id, 9 orphans (null product_id, all share 1 marketplace_id)
--   - 16 duplicate (product_id, marketplace_id) combos
--   - 35 extras to remove (164 unique combos vs 199 non-null rows)
--   - Only unique constraint: offers_url_key (UNIQUE url)
--   - 1812 price_snapshots; 134 at risk (~7.4%) — CASCADE FK on offer_id
--
-- Side effects:
--   - 35 offers deleted → 134 price_snapshots CASCADE-deleted
--   - 9 orphans (null product_id) untouched — they share a marketplace_id but
--     the new unique treats NULLs as distinct (Postgres default), so they coexist
--   - 164 unique (product_id, marketplace_id) combos remain (vs 199 before)
--
-- Apply:
--   npx supabase db query --linked --file supabase/migrations/130_offers_unique_product_marketplace.sql
--
-- Verify after:
--   SELECT COUNT(*) FROM public.offers;                              -- expect 173
--   SELECT COUNT(*) FROM public.price_snapshots;                     -- expect ~1678
--   SELECT conname FROM pg_constraint
--     WHERE conrelid = 'public.offers'::regclass AND contype = 'u'; -- expect 2 rows

-- Step 1: Dedup — keep 1 row per (product_id, marketplace_id) for non-null pairs.
-- Preserve the most-recently-updated row (ties broken by created_at DESC).
-- Orphan rows (product_id IS NULL) are excluded from this CTE; they remain as-is
-- because the new unique constraint treats NULLs as distinct.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY product_id, marketplace_id
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  ) AS rn
  FROM public.offers
  WHERE product_id IS NOT NULL AND marketplace_id IS NOT NULL
)
DELETE FROM public.offers o
USING ranked r
WHERE o.id = r.id AND r.rn > 1;
-- Expected: DELETE 35

-- Step 2: Add unique constraint. NULLS DISTINCT (Postgres default) lets the
-- 9 orphan rows coexist — the constraint only fires when both columns are set.
ALTER TABLE public.offers
ADD CONSTRAINT offers_product_marketplace_unique
UNIQUE (product_id, marketplace_id);
