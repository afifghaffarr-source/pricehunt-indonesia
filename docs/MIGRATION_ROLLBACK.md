# Migration Rollback Guide

**Last updated:** 2026-06-13 (Phase 3 hardening)

This document describes how to roll back the destructive migrations in
this repository. It also documents the additive alternatives that should
be used for fresh databases going forward.

---

## TL;DR

| Migration                      | Type        | Safe to skip? | Rollback path                                    |
| ------------------------------ | ----------- | ------------- | ------------------------------------------------ |
| 001 - 107                      | additive    | n/a           | manual (git revert each)                         |
| 108 - 113                      | additive    | n/a           | manual (git revert each)                         |
| 114, 114_v3                    | **destructive** | not advised | `offers_backup_20260612` table restore           |
| 115                            | **destructive** | not advised | none (table was empty)                           |
| 116 - 119                      | additive    | n/a           | manual (git revert each)                         |
| 120                            | additive (fixed) | safe       | `DROP INDEX` statements (see below)              |
| 121                            | additive    | safe          | `DROP TABLE admin_users`                          |
| 122                            | additive    | safe          | `DROP INDEX` statements (see below)              |
| 123                            | documentation | n/a        | nothing to roll back                             |
| 124                            | additive    | safe          | `ALTER TABLE ... DROP COLUMN` (no data loss)     |

---

## 1. Always take a Supabase snapshot first

Before running any migration that contains `DROP TABLE`, `DROP COLUMN`,
or `ALTER TABLE ... ALTER COLUMN ... TYPE`, take a manual snapshot of
the production database:

1. Open Supabase Dashboard → Database → Backups.
2. Click "Take a manual snapshot" and wait for completion.
3. Note the snapshot timestamp in your deploy log.

If anything goes wrong, you can restore from the snapshot in a few
minutes. The cost is a few hours of write downtime.

---

## 2. Roll back 114 / 114_v3 (offers)

Migration 114 drops and recreates the `offers` table. It first creates
a backup:

```sql
CREATE TABLE offers_backup_20260612 AS SELECT * FROM offers;
```

To restore the pre-114 schema, you must:

1. Stop the Next.js app (to freeze writes).
2. Drop the new `offers` table.
3. Rename the backup to `offers`.
4. Re-attach foreign keys and RLS policies that pointed to `offers`.

```sql
BEGIN;

ALTER TABLE offers RENAME TO offers_post_114;
ALTER TABLE offers_backup_20260612 RENAME TO offers;

-- Re-attach FKs that referenced the old offers
-- (consult migration 113 for the exact FK names)

-- Re-attach RLS policies
-- (consult migration 108 / 107 for the original policies)

COMMIT;
```

**Important:** any `price_history` rows inserted between 114 and now
will be orphaned. There is no automatic way to recover the new column
shape from the old backup. Plan a maintenance window.

---

## 3. Roll back 115 (price_snapshots)

Migration 115 dropped `price_snapshots` and recreated it. At the time
of the original migration, `price_snapshots` was empty.

If you need to roll back 115:

1. There is **no data to recover** (the table was empty).
2. The schema is gone. To restore the old schema, see git history of
   migration 107 (the `price_snapshots` definition there is the
   pre-115 shape) and apply it manually:

   ```sql
   CREATE TABLE price_snapshots_legacy (
     id BIGSERIAL PRIMARY KEY,
     product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
     marketplace_id BIGINT REFERENCES marketplaces(id) ON DELETE SET NULL,
     price INTEGER NOT NULL,
     url TEXT,
     recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```

3. Drop the new `price_snapshots` if you do not need it:
   `DROP TABLE price_snapshots CASCADE;` (be careful — this is itself
   destructive).

---

## 4. Roll back 120 (performance indexes)

Migration 120 is purely additive (it only creates indexes). To roll
back, drop the indexes:

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_offers_product_price;
DROP INDEX CONCURRENTLY IF EXISTS idx_offers_marketplace;
DROP INDEX CONCURRENTLY IF EXISTS idx_offers_validation_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_offers_confidence;
DROP INDEX CONCURRENTLY IF EXISTS idx_offers_product_marketplace_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_prices_product;
DROP INDEX CONCURRENTLY IF EXISTS idx_prices_last_updated;
DROP INDEX CONCURRENTLY IF EXISTS idx_prices_product_marketplace;
DROP INDEX CONCURRENTLY IF EXISTS idx_price_history_product_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_price_history_recorded_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_crawl_targets_priority;
DROP INDEX CONCURRENTLY IF EXISTS idx_crawl_targets_product;
DROP INDEX CONCURRENTLY IF EXISTS idx_products_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_products_name_search;
DROP INDEX CONCURRENTLY IF EXISTS idx_products_category;
DROP INDEX CONCURRENTLY IF EXISTS idx_products_deal_score;
DROP INDEX CONCURRENTLY IF EXISTS idx_ai_cache_product_expiry;
DROP INDEX CONCURRENTLY IF EXISTS idx_rate_limits_lookup;
DROP INDEX CONCURRENTLY IF EXISTS idx_rate_limits_cleanup;
DROP INDEX CONCURRENTLY IF EXISTS idx_reviews_product;
DROP INDEX CONCURRENTLY IF EXISTS idx_reviews_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_wishlists_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_price_alerts_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_price_alerts_user;
```

---

## 5. Roll back 121 (admin_users)

To remove the admin users table:

```sql
DROP TABLE IF EXISTS admin_users CASCADE;
```

This will also drop all RLS policies on `admin_users`. Make sure no
admins are currently logged in, because the next request they make
will return 403.

---

## 6. Roll back 122 (performance indexes safe)

Identical to section 4 — drop the indexes that 122 recreates.

---

## 7. Roll back 124 (additive offers / price_snapshots)

Migration 124 adds columns and constraints. To roll back:

```sql
ALTER TABLE price_snapshots
  DROP COLUMN IF EXISTS current_price,
  DROP COLUMN IF EXISTS discount_percent,
  DROP COLUMN IF EXISTS stock_status,
  DROP COLUMN IF EXISTS voucher_text,
  DROP COLUMN IF EXISTS shipping_estimate,
  DROP COLUMN IF EXISTS raw_hash,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS confidence_score;

ALTER TABLE offers
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS image_url,
  DROP COLUMN IF EXISTS category_hint,
  DROP COLUMN IF EXISTS validation_status,
  DROP COLUMN IF EXISTS confidence_label,
  DROP COLUMN IF EXISTS condition,
  DROP COLUMN IF EXISTS variant,
  DROP COLUMN IF EXISTS current_price,
  DROP COLUMN IF EXISTS original_price,
  DROP COLUMN IF EXISTS discount_percentage,
  DROP COLUMN IF EXISTS stock_status,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS shipping_estimate,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS confidence_score,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS last_checked_at,
  DROP COLUMN IF EXISTS marketplace_product_id,
  DROP COLUMN IF EXISTS seller_id,
  DROP COLUMN IF EXISTS seller_location,
  DROP COLUMN IF EXISTS is_official_store,
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS review_count,
  DROP COLUMN IF EXISTS sold_count,
  DROP COLUMN IF EXISTS voucher_text;
```

This is non-destructive in the data sense — it only removes the
columns that 124 added. Any pre-existing data in legacy columns
(`price`, `in_stock`, etc.) is preserved.

---

## 8. Fresh database strategy (recommended going forward)

For a new Supabase project, the recommended apply order is:

```text
001, 002, 003, ..., 107, 108, 109, 110, 111, 112, 113,
  116, 117, 118, 119, 120, 121, 122, 124
```

**Skip:** 114, 114_v3, 115. These are replaced by 124.

**Notes:**

- Migration 111 is required by 112 (it adds the `raw_payload` and
  `metadata` columns that 112 indexes).
- If 111 is missing, apply it before 112.
- Migration 124 is idempotent and safe to apply on a database that has
  already had 114/115 applied (no-op).

---

## 9. Disaster recovery checklist

If a migration goes wrong in production:

1. **Stop writes:** scale the Next.js deployment to zero instances on
   Vercel (or use the deployment "Disable" button).
2. **Take a fresh snapshot** of the database before doing anything.
3. **Identify the migration** that caused the problem.
4. **Consult this document** for the rollback procedure.
5. **Test the rollback** on a staging copy if at all possible.
6. **Apply the rollback** during a maintenance window.
7. **Restart the Next.js app** and verify with smoke tests.
8. **Post-mortem:** add a note to this document with the root cause
   and the corrective action.

---

## 10. CI / pre-deploy migration lint

There is currently no CI step that lints the migrations for
destructive patterns. A future improvement (Phase 5+) is to add a
script that greps for `DROP TABLE` and `DROP COLUMN` in any new
migration and warns the reviewer. Track this in
`docs/ROADMAP_NEXT.md`.
