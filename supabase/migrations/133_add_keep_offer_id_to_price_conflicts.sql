-- BijakBeli: Add keep_offer_id to price_conflicts
-- Migration 133 (audit fix, 2026-06-17)
--
-- Background:
--   Admin conflict-resolution UI (ConflictsList) lets the admin pick
--   "Keep Original" or "Keep New". The /api/admin/data-collection/
--   resolve-conflict route already accepts `keep_offer_id` and tries
--   to write it — but the column did not exist on price_conflicts,
--   so every resolve attempt errored with "Failed to resolve conflict".
--
-- Fix:
--   Add a nullable `keep_offer_id` column. Additive, no data loss,
--   safe to apply on a populated table.
--
-- Safety:
--   - Nullable + no default → existing rows keep NULL.
--   - ON DELETE SET NULL → no cascade surprises if the winning offer
--     is ever removed.
--   - RLS on price_conflicts is unchanged (admin-writes policy from
--     migration 108 already covers UPDATE).

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS keep_offer_id UUID
  REFERENCES public.offers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.price_conflicts.keep_offer_id IS
  'Offer kept when admin resolves a conflict (Keep Original / Keep New). NULL if resolution does not pick a winner or predates this column.';

-- Track in the destructive-migration notes so future audits see it.
-- (Documented alongside migration 123.)
