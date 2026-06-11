# How to Populate Database with Seed Data

**Created:** 2026-06-12  
**Purpose:** Add 50 sample products to BijakBeli.app database for testing

---

## Option 1: Run Migration via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy content from `supabase/migrations/111_seed_products.sql`
4. Paste into SQL Editor
5. Click **Run** button
6. ✅ Done! 50 products inserted

---

## Option 2: Using Supabase CLI (if installed)

```bash
cd ~/projects/bijakbeli-app
supabase db push
```

This will automatically apply migration 111.

---

## Option 3: Direct SQL file (from VPS)

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Run the migration
\i supabase/migrations/111_seed_products.sql
```

---

## Verify Data Inserted

After running migration, verify via:

### Via Supabase Dashboard:
1. Go to **Table Editor**
2. Open `products` table
3. You should see 50 products

### Via SQL Editor:
```sql
SELECT COUNT(*) FROM products;
-- Should return 50

SELECT category, COUNT(*) 
FROM products 
GROUP BY category;
-- Should show distribution
```

### Via API:
```bash
curl https://www.bijakbeli.app/api/search?q=iphone&limit=5
```

---

## What's Included

- **10 Smartphones:** iPhone, Samsung, Xiaomi, OPPO, Vivo, etc.
- **10 Laptops:** ASUS ROG, Legion, MacBook, Gaming laptops
- **10 Audio & Wearables:** AirPods, Watches, Tablets, Headphones
- **10 Fashion:** Nike, Adidas, Bags, Watches
- **10 Home:** AC, Kulkas, TV from Samsung, LG, Sony

**Total:** 50 products  
**Marketplaces:** Tokopedia, Shopee, Bukalapak  
**Price range:** Rp 449k - Rp 99jt

---

## Next Steps After Seeding

1. Test search functionality
2. Verify price history works
3. Test recommendations
4. Check agents are monitoring data
5. Test extension with real products

---

## Troubleshooting

**Error: "relation products does not exist"**
- Run earlier migrations first (001-110)
- Check database schema is up to date

**Error: "duplicate key value"**
- Data already exists
- Run: `DELETE FROM products WHERE url LIKE '%sample%';` first

**Error: "permission denied"**
- Check database credentials
- Verify you're connected to correct project
