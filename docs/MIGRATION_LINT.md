# Migration Lint

> **Status:** Phase 11 (T11) — production hardening. Wired into CI.
> **Script:** `scripts/lint-migrations.mjs`
> **npm script:** `npm run lint:migrations`
> **CI step:** `.github/workflows/ci.yml` → `Lint migrations`

## Why

Our migration policy (see `docs/PRODUCTION_CHECKLIST.md` §2 and
`docs/MIGRATION_ROLLBACK.md` §10) is: **no new destructive
migrations**. A destructive migration is anything that can lose data
or downstream schema (RLS policies, triggers, FKs, views) without
explicit operator action:

- `DROP TABLE ... CASCADE`
- `ALTER TABLE ... DROP COLUMN ...`
- `TRUNCATE`
- etc.

Before this lint existed, the only defense was reviewer attention and
the destructive notes file (`123_destructive_migration_notes.sql`).
This script turns that policy into an automated CI gate so a
careless PR cannot merge a `DROP TABLE` into `main`.

## What it checks

For every file in `supabase/migrations/*.sql`, after stripping SQL
comments (`-- ...` line comments and `/* ... */` block comments), the
script greps for any of these patterns:

| Pattern                              | Example                                    |
| ------------------------------------ | ------------------------------------------ |
| `DROP TABLE`                         | `drop table offers cascade;`               |
| `DROP SCHEMA`                        | `drop schema legacy;`                      |
| `DROP FUNCTION`                      | `drop function compute_offer_flags();`     |
| `DROP DATABASE`                      | `drop database prod_staging;`              |
| `ALTER TABLE ... DROP COLUMN`        | `alter table offers drop column foo;`      |
| `TRUNCATE`                           | `truncate table offers;`                   |

The match is whitespace-normalized, so multi-line `ALTER TABLE`
statements like

```sql
ALTER TABLE offers
  DROP COLUMN foo;
```

are also caught.

If a match is found in a file **not** on the allowlist (see below),
the script exits with code `1` and the CI step fails.

## Allowlist

Three files are known-destructive and already applied to production.
They are on the allowlist so the lint does not block the existing
chain:

| File                                  | Reason                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `114_upgrade_offers_schema.sql`       | Drops + recreates `offers` (pre-2026-06-12 schema rework).             |
| `114_upgrade_offers_schema_v3.sql`    | Same as 114, but the v3 shape. Idempotent re-apply.                    |
| `115_upgrade_price_snapshots.sql`     | Drops + recreates `price_snapshots`.                                   |

For full context, see `supabase/migrations/123_destructive_migration_notes.sql`.

## How to add a new destructive migration

This is a last resort. Default path is the additive alternative
pattern (see `supabase/migrations/124_offers_additive_migration.sql`
— use `ADD COLUMN IF NOT EXISTS` etc., never drop+recreate).

If you truly need to add a new destructive migration:

1. **Take a Supabase database snapshot first.** Non-negotiable.
2. Add the file to the `ALLOWLIST` set in
   `scripts/lint-migrations.mjs` with a short comment explaining why.
3. Document the migration and the rollback procedure in
   `docs/MIGRATION_ROLLBACK.md` and add a new
   `NNN_destructive_migration_notes.sql` file in
   `supabase/migrations/`.
4. Run `npm run lint:migrations` locally to confirm CI will pass.
5. Open the PR. CI will run the lint step automatically.

## How to run locally

```bash
npm run lint:migrations
```

Output on a clean tree (today):

```
[lint-migrations] scanning supabase/migrations/*.sql
[lint-migrations] allowlisted: 114_upgrade_offers_schema.sql (DROP TABLE)
[lint-migrations] allowlisted: 114_upgrade_offers_schema_v3.sql (DROP TABLE)
[lint-migrations] allowlisted: 115_upgrade_price_snapshots.sql (DROP TABLE)
[lint-migrations] OK: scanned 33 migration(s); 3 allowlisted hit(s); 0 violations.
```

Exit code `0`.

Output when a new destructive pattern sneaks in (simulated):

```
[lint-migrations] scanning supabase/migrations/*.sql
[lint-migrations] FAIL: 1 destructive pattern(s) found in non-allowlisted migrations:
  - 126_bad_migration.sql: DROP TABLE  (matched: DROP TABLE)
```

Exit code `1`.

## Design notes / non-goals

- **Static-only.** This is a regex linter, not a SQL parser. False
  positives are possible (e.g. the word `TRUNCATE` in a string
  literal). For our migration chain, this has not been an issue. If
  it ever is, the answer is to refactor the SQL, not to silence the
  lint.
- **Comment-aware.** Both `--` and `/* */` comments are stripped
  before matching, so `123_destructive_migration_notes.sql` (which
  contains many references to `DROP TABLE` inside comments) does not
  trip the lint.
- **No DB connection.** The script is pure file I/O. It runs in
  milliseconds, has no env requirements, and is safe to run in CI
  cold.
- **Composable.** The script uses the same shape as
  `scripts/db-migrate.mjs` (single responsibility, no side effects,
  clear exit codes) so future migration tooling can share helpers.
