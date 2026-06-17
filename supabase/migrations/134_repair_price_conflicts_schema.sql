-- BijakBeli: Repair price_conflicts schema on prod
-- Migration 134 (audit fix, 2026-06-17)
--
-- Background:
--   The prod `price_conflicts` table is missing 8 columns + 3 indexes
--   defined by migration 108. Detected during audit (P7 verification):
--   admin conflict resolution was completely broken on prod —
--   GET /api/admin/data-collection/conflicts and POST .../resolve-conflict
--   both errored 500 with "column ... does not exist".
--
--   Migration 108 was apparently never fully applied to prod, OR was
--   reverted at some point. Migration 133 (keep_offer_id) worked only
--   because it uses ADD COLUMN IF NOT EXISTS — but the base schema
--   underneath was incomplete.
--
-- Diagnosis (run 2026-06-17 against prod):
--   - REST `select=*&limit=1` returned HTTP 200 / []   → table exists
--   - REST `Prefer: count=exact` returned `*/0`         → table is empty
--   - REST `select=offer_id` returned HTTP 400          → column missing
--   - Same for: conflict_type, difference_percent, difference_amount,
--               status, resolved_by, detected_at, snapshot_a_id,
--               snapshot_b_id
--
-- Fix:
--   Add the 8 missing columns with their migration-108 definitions,
--   then create the 3 missing indexes. Table is empty, so NOT NULL +
--   FK + CHECK apply cleanly with no backfill required.
--
-- Safety:
--   - Additive only. No DROP, no DELETE, no data loss (table is empty).
--   - Idempotent (IF NOT EXISTS everywhere).
--   - Reversible: each column can be dropped individually if needed.
--   - The `status` column is the one referenced by the resolve-conflict
--     route's update, the conflicts list filter, and the BUG-03 audit
--     path. Adding it back unblocks all three.

-- ============================================================================
-- 1. Columns
-- ============================================================================

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS offer_id UUID NOT NULL
    REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS snapshot_a_id UUID;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS snapshot_b_id UUID;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS difference_percent NUMERIC(5,2) NOT NULL,
  ADD COLUMN IF NOT EXISTS difference_amount NUMERIC NOT NULL;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive'));

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS resolved_by UUID;

-- ============================================================================
-- 2. Indexes (from migration 108)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_price_conflicts_offer_id
  ON public.price_conflicts(offer_id);

CREATE INDEX IF NOT EXISTS idx_price_conflicts_status
  ON public.price_conflicts(status);

CREATE INDEX IF NOT EXISTS idx_price_conflicts_detected_at
  ON public.price_conflicts(detected_at DESC);
