-- Migration: Add product_reviews.user_id → user_profiles.id FK
-- Date: 2026-06-16
-- Purpose: Fix PostgREST join for /api/products/[id]/reviews
--          Migration 003_product_reviews.sql only created FK to auth.users,
--          but the reviews API joins on user_profiles (display_name + avatar_url).
--          Add the missing FK constraint so PostgREST can resolve the join.

-- Step 1: Verify the 1:1 relationship assumption
-- user_profiles.id mirrors auth.users.id 1:1 (every user_profile row references a
-- unique auth user). We add the FK to enable PostgREST embedding.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'product_reviews_user_id_user_profiles_fkey'
      AND table_name = 'product_reviews'
  ) THEN
    -- Only safe because user_profiles.id is structurally identical to auth.users.id
    ALTER TABLE product_reviews
      ADD CONSTRAINT product_reviews_user_id_user_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: Same fix for review_helpfulness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'review_helpfulness_user_id_user_profiles_fkey'
      AND table_name = 'review_helpfulness'
  ) THEN
    ALTER TABLE review_helpfulness
      ADD CONSTRAINT review_helpfulness_user_id_user_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
