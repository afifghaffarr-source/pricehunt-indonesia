# 🚀 MANUAL MIGRATION GUIDE - MIGRATION 110

## Status: ⚠️ Needs Manual Application via Supabase Dashboard

### Why Manual?
- Supabase API doesn't support direct SQL execution without pre-configured RPC
- PostgreSQL direct connection requires database password (not provided)
- **Browser-based SQL Editor is the easiest and safest method**

---

## 📋 Step-by-Step Instructions (5 minutes)

### 1. Login to Supabase Dashboard
- Open: https://supabase.com/dashboard
- Login with your credentials
- Select project: **BijakBeli.app** (oklaxwjoyttpwgxhphko)

### 2. Open SQL Editor
- Click **"SQL Editor"** in left sidebar (database icon)
- Click **"New Query"** button

### 3. Copy Migration SQL
- Open file: `supabase/migrations/110_enhanced_data_collection.sql`
- **OR** copy from the code block below
- Select ALL (Ctrl+A)
- Copy (Ctrl+C)

### 4. Paste & Execute
- Paste into SQL Editor (Ctrl+V)
- Click **"Run"** button or press `Ctrl+Enter`
- Wait 10-30 seconds for execution

### 5. Verify Success
You should see messages like:
```
ALTER TABLE
CREATE TABLE
CREATE INDEX
...
INSERT 0 3
```

If you see any **ERROR** messages:
- Check if tables already exist (safe to ignore "already exists" errors)
- Screenshot the error and send to me

---

## 📄 Migration 110 SQL Content

**File:** `~/projects/bijakbeli-app/supabase/migrations/110_enhanced_data_collection.sql`

**Size:** 215 lines, 10,219 bytes

**What it does:**
1. ✅ Add 5 new columns to `offers` table
2. ✅ Create `crawl_targets` table (URL refresh queue)
3. ✅ Create `recheck_requests` table (user requests)
4. ✅ Create `price_reports` table (error reports)
5. ✅ Create indexes for performance
6. ✅ Set up RLS policies for security
7. ✅ Create helper functions
8. ✅ Seed 3 data sources

---

## 🔍 After Migration Applied

**Immediate Next Steps:**

1. **Verify tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('crawl_targets', 'recheck_requests', 'price_reports');
   ```
   Should return 3 rows.

2. **Check offers table columns:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'offers' 
   AND column_name IN ('title', 'image_url', 'validation_status');
   ```
   Should return 3 rows.

3. **Tell me "Migration done!"** 
   → I will immediately activate all APIs and features

---

## ⏰ Estimated Time

- Login to dashboard: 1 min
- Copy-paste SQL: 2 min
- Execute & verify: 2 min
- **Total: ~5 minutes**

---

## 🆘 Troubleshooting

**Problem:** "Permission denied"
- **Solution:** Make sure you're logged in with admin/owner account

**Problem:** "Table already exists"
- **Solution:** Safe to ignore, means migration partially applied before

**Problem:** "Column already exists"
- **Solution:** Safe to ignore, means some columns already added

**Problem:** "Foreign key constraint violation"
- **Solution:** Check if `marketplaces` and `products` tables exist first

**Problem:** Can't access Supabase from work network
- **Solution:** Use mobile hotspot or VPN, or wait until home

---

## 📞 Need Help?

Just send me:
- Screenshot of error (if any)
- First few lines of error message
- Or just say "done!" when successful

I'm standing by to activate everything once migration is applied! 🚀
