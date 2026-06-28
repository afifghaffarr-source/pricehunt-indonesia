-- A-003 apply + verify bundle (SCHEMA-QUALIFIED)
-- Project: oklaxwjoyttpwgxhphko
-- URL: https://supabase.com/dashboard/project/oklaxwjoyttpwgxhphko/sql/new

-- Run this ENTIRE file. If still fails, run pieces one-by-one.

-- ============================================================
-- STEP 0: Diagnose — see what schema search_path sees
-- ============================================================
SHOW search_path;
SELECT current_schema(), current_schemas(false);

-- ============================================================
-- STEP 1: Apply (schema-qualified)
-- ============================================================
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS review_count INT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'IDR';

-- ============================================================
-- STEP 2: Verify columns exist
-- ============================================================
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'offers'
  AND column_name IN ('rating', 'review_count', 'currency')
ORDER BY column_name;

-- ============================================================
-- STEP 3: Row stats
-- ============================================================
SELECT
  COUNT(*) AS total_offers,
  COUNT(*) FILTER (WHERE currency = 'IDR') AS with_idr,
  COUNT(*) FILTER (WHERE rating IS NOT NULL) AS with_rating,
  COUNT(*) FILTER (WHERE review_count IS NOT NULL) AS with_review
FROM public.offers;

-- ============================================================
-- STEP 4: Full column list (compare to typegen)
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'offers'
ORDER BY ordinal_position;
