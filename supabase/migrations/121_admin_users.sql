-- Migration 121: Admin users (secure role storage)
-- Purpose: Replace the use of `user_profiles.preferences.is_admin` for authorization
--          with a dedicated, RLS-protected table.
--
-- IMPORTANT: This migration is additive and SAFE for production.
-- - It does NOT drop or modify any existing table.
-- - It does NOT auto-seed any user as admin.
-- - Legacy `preferences.is_admin` is intentionally NOT migrated automatically.
--   Admin access is granted explicitly via service_role (see docs/ADMIN_SEED.md).
--
-- Authorization model after this migration:
--   * All admin checks MUST go through `is_admin(uid)` (defined below) or
--     `src/lib/admin-auth.ts` in the application.
--   * `user_profiles.preferences` is no longer consulted for admin authorization.
--     It can still be used for display/preferences but must never be trusted
--     for access control.

-- ============================================================================
-- TABLE: admin_users
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'super_admin')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role) WHERE revoked_at IS NULL;

COMMENT ON TABLE admin_users IS
  'Authoritative source for admin role. Managed only via service_role. RLS prevents regular users from mutating their own or others'' admin status.';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- A user may read their OWN admin row (so the client can show "you are admin"
-- badges, server still enforces). No SELECT for other users.
DROP POLICY IF EXISTS "Users can view own admin row" ON admin_users;
CREATE POLICY "Users can view own admin row"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

-- Intentionally NO policy for INSERT/UPDATE/DELETE for `authenticated` or `anon`.
-- Only the service_role (or SECURITY DEFINER functions owned by superuser) can
-- mutate admin_users. This blocks privilege escalation via the regular client.
-- (Postgres default is DENY when RLS is enabled and no policy matches.)

-- ============================================================================
-- HELPER FUNCTION: is_admin(uid uuid)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = uid
      AND revoked_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'Single source of truth for admin check. Returns true iff uid has a non-revoked row in admin_users. Bypasses RLS safely because it is SECURITY DEFINER + stable.';

-- ============================================================================
-- SEED INSTRUCTIONS (MANUAL, VIA SERVICE ROLE)
-- ============================================================================
-- To grant the FIRST admin, run in Supabase SQL editor (or psql with the
-- service role connection):
--
--   INSERT INTO public.admin_users (user_id, role, granted_by, notes)
--   VALUES ('<USER_UUID>', 'super_admin', NULL, 'Initial bootstrap admin');
--
-- Replace <USER_UUID> with auth.users.id of the trusted account.
-- No automatic promotion from `preferences.is_admin` is performed.
-- See docs/ADMIN_SEED.md for the full runbook.
