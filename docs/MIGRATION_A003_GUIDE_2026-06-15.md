# A-003 Migration Guide (2026-06-15)

## Problem

Production database is missing 3 columns from migration 124:
- `offers.rating` (NUMERIC 3,2)
- `offers.review_count` (INT)
- `offers.currency` (TEXT, DEFAULT 'IDR')

These should have been added by `124_offers_additive_migration.sql` Part 3 but the migration was partially applied (likely stopped early due to error, or run in pieces).

## Impact

- `deal_score` calculation may use hardcoded defaults for rating/currency
- Admin dashboard may show "undefined" for these fields
- Future Vexo AI features that need rating will fail

## Solution

### Step 1: Run self-heal SQL bundle (2 min)

Open Supabase SQL Editor:
- https://supabase.com/dashboard/project/oklaxwjoyttpwgxhphko/sql/new

Paste contents of `supabase/migrations/A-003_OFFERS_MISSING_COLUMNS.sql` and run.

```sql
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS review_count INT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'IDR';
```

Expected output: `Success. No rows returned` (3 statements ran).

### Step 2: Verify (30 sec)

Run this query to confirm:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'offers'
  AND column_name IN ('rating', 'review_count', 'currency')
ORDER BY column_name;
```

Expected output:
```
column_name   | data_type                | column_default
--------------+--------------------------+---------------
currency      | text                     | 'IDR'::text
rating        | numeric                  |
review_count  | integer                  |
```

### Step 3: Verify app

1. Open https://bijakbeli.app — homepage should load
2. Open product detail — should not show "undefined" for rating
3. Admin dashboard → Data Collection → Offers — new columns visible

## Rollback

Not needed. The 3 columns are additive, non-breaking. Existing rows get `currency='IDR'` (default), `rating=NULL`, `review_count=NULL` — all valid.

## Time

Total: ~3 minutes.
