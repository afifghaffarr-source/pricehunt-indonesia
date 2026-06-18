# Database

Supabase Postgres schema. Migrations live in `supabase/migrations/`. The source of truth is the migration files; live prod may have additional columns added via Dashboard (see [migration 135](../supabase/migrations/135_reconcile_prod_schema.sql) for the 2026-06-17 reconciliation).

## Core tables

| Table | Purpose | Row count (prod) |
|---|---|---|
| `products` | Catalog of products | 64 |
| `offers` | Per-marketplace price offers | 173 |
| `price_history` | Time-series of historical prices | (legacy, see archive) |
| `price_snapshots` | Point-in-time price captures | (active) |
| `marketplaces` | 6 supported marketplaces | 6 |
| `price_alerts` | User-set price targets | (user-scoped) |
| `wishlists` | User wishlists | (user-scoped) |
| `price_conflicts` | Auto-detected price discrepancies | 0 (empty) |
| `price_reports` | User-submitted price reports | 0 (empty) |
| `recheck_requests` | Re-crawl requests | 0 (empty) |
| `crawl_targets` | Crawl queue (priority scored) | 212 |
| `user_profiles` | User preferences + display | (user-scoped) |
| `admin_users` | Admin role (RLS-protected) | 1 (super_admin) |

## Authorization
- `user_profiles.preferences.is_admin` is **display only** — never trusted for authz
- `admin_users` table + `is_admin(uid)` RPC function is the single source of truth for admin role
- See [SECURITY.md](../SECURITY.md) and migration [121_admin_users.sql](../supabase/migrations/121_admin_users.sql)

## Migrations
- Apply: `npm run db:migrate` (uses `scripts/db-migrate.mjs`)
- Check versions: `npm run check:migrations`
- Order matters — each migration is timestamped
- Destructive migrations (DROPs) live in [123_destructive_migration_notes.sql](../supabase/migrations/123_destructive_migration_notes.sql) and require manual review

## Reconciliation
- 2026-06-17: prod schema drifted from migrations. Audit found missing columns in 4 tables. Fixed by [migration 134](../supabase/migrations/134_repair_price_conflicts_schema.sql) + [migration 135](../supabase/migrations/135_reconcile_prod_schema.sql).
- Pattern: use `scripts/verify-schema.sh` (TODO) or `?select=col&limit=0` REST probe to detect drift.

## See also
- [Architecture](architecture.md)
- [API surface](api.md)
- [Admin bootstrap runbook](ADMIN_SEED.md)
- [Migration rollback playbook](MIGRATION_ROLLBACK.md)
