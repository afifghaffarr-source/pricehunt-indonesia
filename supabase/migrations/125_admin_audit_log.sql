-- Migration 125: admin_audit_log
--
-- Phase 9 hardening. Append-only audit trail for privileged admin
-- actions (resolve-conflict, manual-offer, recheck, future admin
-- mutations).
--
-- Design goals:
-- - Additive: no DROP, no destructive changes to existing tables.
-- - RLS-locked: anonymous/authenticated users have NO access. Only the
--   service role (server-side) can insert/select.
-- - Lightweight: best-effort writes must never block admin actions.
--
-- Reads are intended to be performed via admin tools using the service
-- role. There is intentionally no RLS policy allowing regular users to
-- read or write this table.
--
-- Required by:
--   - src/lib/admin-audit.ts
--   - resolve-conflict, manual-offer, and other admin handlers (T4)

create table if not exists public.admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references auth.users(id) on delete set null,
  actor_email   text,
  action        text not null,
  target_type   text,
  target_id     text,
  metadata      jsonb not null default '{}'::jsonb,
  request_id    text,
  ip            text,
  user_agent    text,
  created_at    timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Append-only audit log of privileged admin actions. Server-only via service role.';

-- Helpful indexes for the (admin) reader path.
create index if not exists admin_audit_log_actor_id_idx
  on public.admin_audit_log (actor_id);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_action_idx
  on public.admin_audit_log (action);

-- RLS: lock the table from the public/anonymous/authenticated client.
alter table public.admin_audit_log enable row level security;

-- No policies are created for SELECT/INSERT/UPDATE/DELETE for the
-- anon or authenticated roles. With RLS enabled and no policy, those
-- roles are denied by default. The service role bypasses RLS, which is
-- the only intended write path.

-- Defense-in-depth: revoke any privileges that may have been granted
-- by default in earlier migrations.
revoke all on public.admin_audit_log from public;
revoke all on public.admin_audit_log from anon;
revoke all on public.admin_audit_log from authenticated;
