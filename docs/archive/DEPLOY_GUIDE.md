# 🚀 QUICK START: Deploy BijakBeli Demo ke Vercel

**Goal:** Tampilkan data di demo Vercel app dalam 30 menit  
**Date:** 11 Juni 2026

---

## ⚡ OPTION A: Deploy dengan Seed Data (TERCEPAT)

### Prerequisites
- Akun Vercel (free tier OK)
- Akun Supabase (free tier OK)
- Git repository terhubung

---

### Step 1: Setup Supabase (10 menit)

**1.1 Create Supabase Project**
```
1. Buka: https://supabase.com/dashboard
2. Klik "New Project"
3. Nama: bijakbeli-app
4. Database Password: [generate strong password]
5. Region: Southeast Asia (Singapore)
6. Klik "Create new project"
7. Tunggu ~2 menit (project provisioning)
```

**1.2 Run Database Migrations**
```
1. Supabase Dashboard → SQL Editor
2. Klik "New Query"
3. Copy isi file: supabase/migrations/001_initial_schema.sql
4. Paste ke editor
5. Klik "Run" (bottom right)
6. Tunggu sukses ✅
7. Ulangi untuk semua file di supabase/migrations/ (ada 10+ files)
```

**1.3 Load Seed Data**
```
1. SQL Editor → New Query
2. Copy isi file: supabase/seed.sql
3. Paste → Run
4. Verify: Query "SELECT * FROM products" → harus ada 3 products
```

**1.4 Get API Keys**
```
1. Settings → API
2. Copy:
   - Project URL (https://xxx.supabase.co)
   - anon public key (eyJ...)
   - service_role key (eyJ...)
3. Simpan di notepad
```

---

### Step 2: Deploy to Vercel (10 menit)

**2.1 Connect GitHub**
```
1. Push project ke GitHub jika belum:
   git add -A
   git commit -m "Ready for Vercel deployment"
   git push origin master

2. Buka: https://vercel.com/new
3. Import Git Repository
4. Pilih: bijakbeli-app
5. Framework Preset: Next.js (auto-detected)
6. Root Directory: ./ (default)
7. Klik "Deploy" (JANGAN dulu!)
```

**2.2 Configure Environment Variables**

Sebelum deploy, add environment variables:

```env
# Supabase (dari Step 1.4)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cron Protection
CRON_SECRET=demo-secret-change-in-production-12345

# Price Simulation (ENABLE for demo!)
ENABLE_PRICE_SIMULATION=true

# App URL (akan dapat setelah deploy, update nanti)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Ingestion API Protection
INGESTION_SECRET=demo-ingestion-secret-67890

# Optional (skip untuk demo awal)
# OPENAI_API_KEY=sk-...
# RESEND_API_KEY=re_...
```

**Copy semua itu ke Vercel environment variables form.**

**2.3 Deploy**
```
1. Klik "Deploy"
2. Tunggu ~2-3 menit
3. Note deployment URL: https://bijakbeli-app-xxx.vercel.app
```

**2.4 Update NEXT_PUBLIC_APP_URL**
```
1. Vercel Dashboard → Settings → Environment Variables
2. Edit NEXT_PUBLIC_APP_URL
3. Value: https://bijakbeli-app-xxx.vercel.app
4. Save
5. Redeploy: Deployments → Latest → ... menu → Redeploy
```

---

### Step 3: Aktivasi Price Simulation (5 menit)

Karena belum ada real marketplace data, kita simulate price updates:

**3.1 Manual Trigger Cron**
```bash
# Replace dengan URL Anda dan CRON_SECRET dari env vars
curl "https://bijakbeli-app-xxx.vercel.app/api/cron/prices?secret=demo-secret-change-in-production-12345"
```

**Expected Response:**
```json
{
  "message": "Price update simulation completed",
  "simulation_enabled": true,
  "updated": 18,
  "products_updated": 3
}
```

**3.2 Verify Data**

Buka app Anda:
```
https://bijakbeli-app-xxx.vercel.app
```

**Harus terlihat:**
- 3 products di homepage
- Harga dari 6 marketplaces
- Deal scores
- Price history chart (akan populated setelah beberapa cron runs)

---

### Step 4: Test Features (5 menit)

**4.1 Search**
```
1. Homepage → Search bar
2. Ketik: "Samsung"
3. Harus muncul: Samsung Galaxy S24 Ultra
```

**4.2 Product Detail**
```
1. Klik product card
2. Verify:
   - Price comparison table
   - 6 marketplaces
   - Deal score badge
   - Buy/Wait recommendation
   - Price history chart (mungkin kosong dulu)
```

**4.3 Compare**
```
1. Homepage → pilih 2 products
2. Klik "Compare"
3. Verify: Side-by-side comparison
```

**4.4 AI Advisor** (jika OPENAI_API_KEY configured)
```
1. Product detail → AI Advisor section
2. Test chat
```

---

## ✅ SUCCESS CRITERIA

Demo berhasil jika:

- [x] App deployed ke Vercel
- [x] 3 products tampil di homepage
- [x] Price comparison table ada data
- [x] Search works
- [x] Product detail page loads
- [x] No console errors

---

## 🔄 Automated Price Updates

Vercel Cron akan auto-run setiap 6 jam:
```
/api/cron/prices → every 6 hours
/api/cron/alerts → every 2 hours
/api/cron/digest → every Monday 9 AM
```

Price simulation akan:
- Generate random ±3% fluctuations
- Update last_updated timestamp
- Record to price_history table
- Trigger price alerts jika ada

**Note:** Ini hanya untuk DEMO. Production needs real scrapers.

---

## 📊 Monitoring

**Check Cron Logs:**
```
Vercel Dashboard → Your Project → Logs → Filter by /api/cron
```

**Check Database:**
```sql
-- Supabase SQL Editor

-- Latest prices
SELECT p.name, m.display_name, pr.price, pr.last_updated
FROM prices pr
JOIN products p ON pr.product_id = p.id
JOIN marketplaces m ON pr.marketplace_id = m.id
ORDER BY pr.last_updated DESC;

-- Price history
SELECT * FROM price_history 
ORDER BY recorded_at DESC 
LIMIT 20;
```

---

## 🐛 Troubleshooting

### "No products found"
- Check seed.sql ran successfully
- Query database: `SELECT COUNT(*) FROM products;` → should be 3

### "Failed to fetch"
- Check environment variables configured correctly
- Check Supabase URL is correct
- Check RLS policies enabled

### "Cron returned 401"
- Check CRON_SECRET matches between env vars and request

### Build failed
- Check `bun install` works locally
- Check no TypeScript errors: `npx tsc --noEmit`

---

## 🎯 Next Steps After Demo

1. **Get Feedback** - Share URL dengan stakeholders
2. **Implement Real Collector** - See COLLECTOR_QUICKSTART.md
3. **Add More Products** - Expand seed data or implement scrapers
4. **Enable AI Features** - Add OPENAI_API_KEY
5. **Setup Monitoring** - Add Sentry, Uptime checks

---

## 📞 Support

**Issues?**
1. Check deployment logs di Vercel
2. Check Supabase logs
3. Check browser console for errors
4. Review AUDIT_REPORT_2026-06-11.md

**Questions:**
- Email: [your-email]
- Slack: #bijakbeli-tech

---

**Estimated Time:** 30 minutes  
**Result:** Fully functional demo with simulated data  
**Ready for:** User testing, stakeholder presentation

---

*Created: 11 Juni 2026, 08:00 WIB*
