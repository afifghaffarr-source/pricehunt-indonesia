# Admin Seeding Guide

This document explains how to promote a user to admin **safely** under
the new role system introduced in `supabase/migrations/121_admin_users.sql`.

## Why this is not exposed in the app

The old code used `user_profiles.preferences.is_admin` to decide who
was an admin. Because the `preferences` column is user-editable (a
normal user can `UPDATE` their own profile row), that flag was an
authentication bypass: any user could set it to `true` and become
admin.

The new `admin_users` table is **not** writable by normal users. It
is protected by RLS so that:

- Authenticated users can `SELECT` only their own admin row (to know
  "am I an admin?") but the result is meaningless if you do not pass
  the admin check.
- No one can `INSERT` / `UPDATE` / `DELETE` `admin_users` via the
  PostgREST API. The only path is the service-role client used by
  trusted server code (migrations, manual ops, or a dedicated admin
  promotion API guarded by an existing admin).

`isUserAdmin()` now reads from `admin_users`, never from
`user_profiles.preferences`. The legacy column is **not** consulted
for authorization. If you find a code path still checking it, treat
that as a security bug.

## Seeding the first admin

You need exactly one row to bootstrap the system. Do it from the
Supabase SQL editor or via the `psql` CLI as the `postgres` role:

```sql
-- Replace with the auth.users.id of the person you want to bootstrap.
insert into public.admin_users (user_id, role, is_active, created_by, notes)
values (
  '00000000-0000-0000-0000-000000000000',
  'super_admin',
  true,
  null,
  'Bootstrap admin'
)
on conflict (user_id) do update
  set is_active = excluded.is_active,
      role = excluded.role;
```

After running this:

1. Sign in to the app as that user.
2. Open `/admin` — it should load.
3. Open `/api/admin/data-collection/offers` in the browser
   (after fetching a CSRF token) — it should return a list, not 401/403.

## Promoting a second admin

The recommended path is the `service_role` client (server only). Do
**not** build a "promote user" admin page until you have at least one
super admin. A safe pattern:

```ts
// src/lib/admin/promote.ts (server-only, NEVER import from client)
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/api-auth";

export async function promoteToAdmin(targetUserId: string, role: "admin" | "super_admin") {
  // Caller must be a super_admin.
  const guard = await requireAdmin();
  // ... check role === "super_admin" ...
  const admin = createAdminClient();
  const { error } = await admin
    .from("admin_users")
    .upsert({ user_id: targetUserId, role, is_active: true });
  if (error) throw error;
}
```

## Demoting / revoking

```sql
update public.admin_users
set is_active = false
where user_id = '00000000-0000-0000-0000-000000000000';
```

Revoking flips the active flag instead of deleting the row, so audit
history is preserved.

## Migrating legacy `preferences.is_admin`

The legacy JSON flag is left in place (it is part of the existing
profile shape). It is **not** read for authorization. If you want
to clean it up after the new system is stable, do it in a separate
migration:

```sql
update public.user_profiles
set preferences = preferences - 'is_admin'
where preferences ? 'is_admin';
```

## Verifying

Run the following in the Supabase SQL editor to confirm RLS is in
place:

```sql
select * from pg_policies where tablename = 'admin_users';
```

You should see at least the four policies:

- `admin_users_select_self`
- `admin_users_no_insert`
- `admin_users_no_update`
- `admin_users_no_delete`
