-- Migration 122: Performance Indexes Safety Patch
-- Date: 2026-06-13
-- Phase 3 hardening: defensive cleanup for any leftover bad indexes from
-- migration 120 that referenced wrong column names or volatile predicates.
--
-- This migration is IDEMPOTENT. It is safe to run on databases where:
--   (a) migration 120 was already applied (with or without the bugs), or
--   (b) migration 120 has not been applied yet.
--
-- It does NOT drop or recreate any user data.

-- ============================================================================
-- 1. Crawl targets: drop and recreate the index that referenced `status`
--    instead of `crawl_status`. The column is `crawl_status` (per migration
--    110). The buggy index would never have been created because the
--    predicate references a non-existent column, but we DROP IF EXISTS
--    defensively for safety.
-- ============================================================================

DROP INDEX IF EXISTS idx_crawl_targets_priority;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crawl_targets_priority
ON crawl_targets(priority_score DESC, next_crawl_at ASC)
WHERE crawl_status = 'queued';

-- ============================================================================
-- 2. Rate limits: drop any partial index that used NOW() (non-immutable).
--    Recreate as a plain index on window_start. A partial cleanup index
--    cannot be used because partial index predicates must be IMMUTABLE.
--
-- FIX (2026-06-15): The actual table is `api_rate_limits` (created in
-- migration 106), not `rate_limits`. The original 122 referenced the
-- wrong table name, which would have failed with "relation does not
-- exist" on a clean apply. Confirmed via probe_schema.py against
-- production Supabase (oklaxwjoyttpwgxhphko).
-- ============================================================================

DROP INDEX IF EXISTS idx_rate_limits_cleanup;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_cleanup
ON api_rate_limits(window_start);

-- ============================================================================
-- 3. Products name search: ensure a portable search index exists.
--    The `indonesian` text search config is not installed by default on
--    Supabase Postgres. We:
--      a) ensure pg_trgm is available,
--      b) add a GIN trigram index (for ILIKE search),
--      c) add a GIN tsvector index using the `simple` config (always
--         available). This is what migration 120 ships going forward.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm
ON products USING gin(name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_search
ON products USING gin(to_tsvector('simple', name));

-- ============================================================================
-- 4. Sanity verify: ensure the corrected indexes now exist.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_crawl_targets_priority'
  ) THEN
    RAISE WARNING 'idx_crawl_targets_priority missing after migration 122';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_rate_limits_cleanup'
  ) THEN
    RAISE WARNING 'idx_rate_limits_cleanup missing after migration 122';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_products_name_trgm'
  ) THEN
    RAISE WARNING 'idx_products_name_trgm missing after migration 122';
  END IF;
END $$;

ANALYZE crawl_targets;
ANALYZE rate_limits;
ANALYZE products;
