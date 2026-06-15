-- A-003 apply + verify bundle for Supabase SQL Editor
-- Project: oklaxwjoyttpwgxhphko
-- URL: https://supabase.com/dashboard/project/oklaxwjoyttpwgxhphko/sql/new

-- ============================================================
-- STEP 1: Apply (run this first, expect "Success. No rows returned")
-- ============================================================

ALTER TABLE offers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS review_count INT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'IDR';

-- ============================================================
-- STEP 2: Verify columns exist (run after Step 1, expect 3 rows)
-- ============================================================

SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'offers'
  AND column_name IN ('rating', 'review_count', 'currency')
ORDER BY column_name;

-- ============================================================
-- STEP 3: Verify existing rows got default currency (expect 165)
-- ============================================================

SELECT
  COUNT(*) AS total_offers,
  COUNT(*) FILTER (WHERE currency = 'IDR') AS with_idr,
  COUNT(*) FILTER (WHERE rating IS NOT NULL) AS with_rating,
  COUNT(*) FILTER (WHERE review_count IS NOT NULL) AS with_review
FROM offers;

-- ============================================================
-- STEP 4: Sanity check — full offers column list (compare to typegen)
-- ============================================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'offers'
ORDER BY ordinal_position;

-- ============================================================
-- STEP 5: RLS check — make sure columns inherit offers policies
-- (expect: no rows = policies use column-list or "ALL")
-- ============================================================

SELECT polname, polcmd, polqual IS NOT NULL AS has_using
FROM pg_policy
WHERE polrelid = 'public.offers'::regclass
ORDER BY polname;
