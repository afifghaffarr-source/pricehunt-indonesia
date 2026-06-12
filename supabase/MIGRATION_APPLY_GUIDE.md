# 🔧 Migration 112 - Apply Guide

## ⚠️ PENTING: Backup Database Dulu

```bash
# Backup via Supabase CLI
supabase db dump -f backup-before-112.sql

# Atau via pg_dump jika punya akses langsung
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup-before-112.sql
```

## 📋 Migration 112 Overview

**File:** `supabase/migrations/112_fix_data_collection_schema.sql`

**Fixes:**
1. ✅ `offers.product_id` → NULLABLE (allow offers without product match)
2. ✅ `offers.url` → UNIQUE constraint (enable upsert by URL)
3. ✅ `crawl_targets` index → Fixed column name (status → crawl_status)
4. ✅ `data_sources.type` → Include browser_collector in enum
5. ✅ `offers.product_id` FK → ON DELETE SET NULL (prevent cascade)
6. ✅ `recheck_requests.offer_id` → NULLABLE (allow product-level requests)
7. ✅ `validation_status` → Idempotent check

**Safe:** Yes - All operations are backward-compatible
**Rollback:** Not needed - changes are additive/permissive

## 🚀 Apply Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Login to https://supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy-paste content dari `supabase/migrations/112_fix_data_collection_schema.sql`
6. Click **Run**
7. Verify no errors

### Option B: Via Supabase CLI

```bash
cd /home/ubuntu/projects/bijakbeli-app

# Link to your project (if not linked)
supabase link --project-ref your-project-ref

# Apply migration
supabase db push
```

### Option C: Via psql (Direct)

```bash
psql "postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres" \
  -f supabase/migrations/112_fix_data_collection_schema.sql
```

## ✅ Verification Steps

After applying, run these queries in SQL Editor:

```sql
-- 1. Check product_id is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'offers' AND column_name = 'product_id';
-- Expected: is_nullable = 'YES'

-- 2. Check URL unique constraint exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'offers' AND indexname = 'idx_offers_url_unique';
-- Expected: 1 row returned

-- 3. Check data_sources supports browser_collector
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'data_sources'::regclass 
  AND conname = 'data_sources_type_check';
-- Expected: definition includes 'browser_collector'

-- 4. Check crawl_targets index is correct
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'crawl_targets' 
  AND indexname = 'idx_crawl_targets_next_crawl_at';
-- Expected: WHERE crawl_status = 'queued' (not status)

-- 5. Test insert offer without product_id
INSERT INTO offers (
  product_id, 
  marketplace_id, 
  url, 
  current_price, 
  source,
  stock_status,
  condition
) VALUES (
  NULL,
  (SELECT id FROM marketplaces LIMIT 1),
  'https://test-migration-112-' || gen_random_uuid()::text,
  100000,
  'browser_collector',
  'unknown',
  'unknown'
) RETURNING id, product_id, url;
-- Expected: Success with NULL product_id

-- 6. Cleanup test data
DELETE FROM offers WHERE url LIKE 'https://test-migration-112-%';
```

## 🐛 Troubleshooting

### Error: "relation offers_product_id_fkey already exists"
Migration is idempotent, re-run is safe.

### Error: "duplicate key value violates unique constraint"
Existing offers table has duplicate URLs. Find and resolve:
```sql
SELECT url, COUNT(*) 
FROM offers 
GROUP BY url 
HAVING COUNT(*) > 1;
```

### Error: "invalid input value for enum"
Old data_sources entries have invalid type. Check:
```sql
SELECT name, type FROM data_sources WHERE type NOT IN (
  'official_api', 'affiliate_feed', 'browser_collector',
  'extension_snapshot', 'targeted_crawler', 'community_proof', 'manual_admin'
);
```

## 📊 Expected Impact

**Before Migration:**
- ❌ Ingestion API fails when product match fails
- ❌ Upsert by URL fails (no unique constraint)
- ❌ Admin dashboard errors (wrong column names)
- ❌ Migration 110 index creation fails

**After Migration:**
- ✅ Ingestion API can save orphan offers
- ✅ Upsert by URL works correctly
- ✅ Admin dashboard queries will work (after code fix)
- ✅ All indexes created successfully

## 🔄 Next Steps

After migration applied:
1. Deploy code fixes (Phase 3-8)
2. Test ingestion API with real data
3. Verify admin dashboard loads
4. Test Python collector
5. Monitor for errors in production

## 📞 Support

If migration fails:
1. Check error message
2. Verify backup exists
3. Contact @AGR on Telegram
4. Do NOT modify data manually
