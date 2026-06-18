-- BijakBeli: Reconcile prod schema with migrations
-- Migration 135 (audit fix, 2026-06-17)
--
-- Background:
--   The audit of 2026-06-17 discovered significant schema drift between
--   the migration files in this repo and the live prod database. Many
--   columns exist in prod that are NOT defined in any migration file
--   (likely added via the Supabase Dashboard). Migration 108 itself was
--   never fully applied to prod (repaired by migration 134).
--
--   This migration makes the migration files catch up to reality. It is
--   PURELY ADDITIVE: every statement is `ADD COLUMN IF NOT EXISTS` and
--   no existing column is dropped, renamed, or modified. After this
--   migration, a fresh database setup will have the same columns that
--   prod has today (modulo any NOT NULL/FK tightening that the prod
--   tables gained via dashboard edits — see "Caveats" below).
--
-- Caveats:
--   - Some columns are added here as NULL even where the prod schema
--     likely has them as NOT NULL. The user can tighten constraints
--     in a follow-up migration after the data layer is reconciled.
--   - For `recheck_requests`, the prod renamed several columns:
--       priority           -> priority_score
--       completed_at       -> processed_at
--       result             -> result_message
--     This migration does NOT add the old (migration-110) names. Code
--     that still references them must be updated separately. A
--     follow-up migration can drop the old names after the code is
--     updated and the data has been backfilled.
--   - For `crawl_targets`, migration 110 defined `max_retries` which
--     does not exist in prod. This migration does NOT add it.
--   - For `price_reports`, migration 110 defined `url` and `updated_at`
--     which are not in prod. This migration DOES add them so a fresh
--     setup matches the migration design (prod may gain them later).
--
-- Tables covered (5 — `offers` and `admin_users` are already in sync):
--   - price_conflicts
--   - price_reports
--   - recheck_requests
--   - crawl_targets
-- ============================================================================

-- ============================================================================
-- price_conflicts
-- Migration 108 + 133 + 134 defined: id, offer_id, source_a, price_a,
-- snapshot_a_id, source_b, price_b, snapshot_b_id, difference_percent,
-- difference_amount, status, resolution_note, detected_at, resolved_at,
-- resolved_by, keep_offer_id. Added by 135: 9 columns that exist in prod
-- but were not in any migration (hand-applied via Supabase Dashboard).
-- ============================================================================

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS marketplace_id UUID REFERENCES public.marketplaces(id) ON DELETE CASCADE;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS conflict_status TEXT NOT NULL DEFAULT 'open';

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS price_diff_percentage NUMERIC(5,2);

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS confidence_a NUMERIC;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS confidence_b NUMERIC;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS offer_a_id UUID REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS offer_b_id UUID REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE public.price_conflicts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes for the new FK columns (will be no-ops on prod where they exist)
CREATE INDEX IF NOT EXISTS idx_price_conflicts_product_id
  ON public.price_conflicts(product_id);
CREATE INDEX IF NOT EXISTS idx_price_conflicts_marketplace_id
  ON public.price_conflicts(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_price_conflicts_offer_a_id
  ON public.price_conflicts(offer_a_id);
CREATE INDEX IF NOT EXISTS idx_price_conflicts_offer_b_id
  ON public.price_conflicts(offer_b_id);
CREATE INDEX IF NOT EXISTS idx_price_conflicts_conflict_status
  ON public.price_conflicts(conflict_status);

-- ============================================================================
-- price_reports
-- Migration 110 defined: id, product_id, user_id, offer_id, report_type,
-- message, url, reported_price, report_status, created_at, updated_at.
-- Added by 135: 3 columns that exist in prod (resolution_note,
-- resolved_at, resolved_by) + 2 columns that prod is missing (url,
-- updated_at) so a fresh setup matches the migration design.
-- ============================================================================

ALTER TABLE public.price_reports
  ADD COLUMN IF NOT EXISTS resolution_note TEXT;

ALTER TABLE public.price_reports
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE public.price_reports
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.price_reports
  ADD COLUMN IF NOT EXISTS url TEXT;

ALTER TABLE public.price_reports
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_price_reports_resolved_by
  ON public.price_reports(resolved_by);

-- ============================================================================
-- recheck_requests
-- Migration 110 defined: id, product_id, offer_id, requested_by, priority,
-- request_status, created_at, completed_at, result, error_message.
-- Prod renamed/added: priority_score, processed_at, result_message, reason.
-- Added by 135: only the new prod-only names. The old migration-110 names
-- are NOT added (they don't exist in prod). Code updates must use the
-- new names — see audit notes for affected files.
-- ============================================================================

ALTER TABLE public.recheck_requests
  ADD COLUMN IF NOT EXISTS priority_score INT DEFAULT 0;

ALTER TABLE public.recheck_requests
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

ALTER TABLE public.recheck_requests
  ADD COLUMN IF NOT EXISTS result_message TEXT;

ALTER TABLE public.recheck_requests
  ADD COLUMN IF NOT EXISTS reason TEXT;

-- ============================================================================
-- crawl_targets
-- Migration 110 defined 15 columns. Prod has 17 — extras: domain, source,
-- metadata. Added by 135. (max_retries from migration 110 is NOT added
-- because prod doesn't have it.)
-- ============================================================================

ALTER TABLE public.crawl_targets
  ADD COLUMN IF NOT EXISTS domain TEXT;

ALTER TABLE public.crawl_targets
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.crawl_targets
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================================
-- Documentation: record the reconciliation in the destructive-migration
-- notes file (123) so future audits see the full history.
-- ============================================================================

COMMENT ON TABLE public.price_conflicts IS
  'Auto-detected price conflicts between different data sources for quality assurance. Schema reconciled with prod by migration 135 (2026-06-17).';

COMMENT ON TABLE public.price_reports IS
  'User-submitted price reports. Schema reconciled with prod by migration 135 (2026-06-17).';

COMMENT ON TABLE public.recheck_requests IS
  'User/admin requested re-crawls. Schema reconciled with prod by migration 135 (2026-06-17). Note: column names differ from migration 110 (priority_score, processed_at, result_message) — see audit notes.';

COMMENT ON TABLE public.crawl_targets IS
  'Queue for targeted URL refresh with priority scoring. Schema reconciled with prod by migration 135 (2026-06-17).';
