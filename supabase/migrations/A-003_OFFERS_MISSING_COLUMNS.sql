-- A-003 Self-Heal SQL — Part 3a (offers missing columns)
-- Date: 2026-06-15
--
-- Context: Migration 124_offers_additive_migration.sql was partially applied
-- to production. Three columns from Part 3 (rating, review_count, currency)
-- were skipped. This bundle runs ONLY the missing statements — safe to apply.
--
-- Run in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql):
--   1. Select project
--   2. New query
--   3. Paste this entire file
--   4. Run (Ctrl+Enter)
--
-- Expected output:
--   ALTER TABLE (3x)
--   "Success. No rows returned"
--
-- Verification (run after):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'offers'
--   AND column_name IN ('rating', 'review_count', 'currency');
--   -- Expected: 3 rows

ALTER TABLE offers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS review_count INT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'IDR';
