# 🚀 Vercel Deployment Setup - URGENT

## ⚠️ Problem: Vercel Belum Punya Environment Variables

**Code sudah di GitHub (commit 0c3b780)**, tapi Vercel **BELUM PUNYA** Supabase credentials!

Makanya production masih error: `"Your project's URL and Key are required"`

---

## ✅ SOLUTION: Add Environment Variables ke Vercel (5 Menit)

### Step 1: Buka Vercel Dashboard

1. Login ke https://vercel.com
2. Pilih project: **bijakbeli-app**
3. Klik tab **Settings**
4. Klik menu **Environment Variables** (di sidebar kiri)

### Step 2: Add 3 Variables Ini

**Variable 1:**
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** `https://oklaxwjoyttpwgxhphko.supabase.co`
- **Environment:** Pilih **ALL** (Production + Preview + Development)
- Klik **Save**

**Variable 2:**
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGF4d2pveXR0cHdneGhwaGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDAxNTMsImV4cCI6MjA5NjM3NjE1M30.OThrLaNKnvvxu6Y1BcMcvoaYl0__6oJUvwomNFezJW0`
- **Environment:** Pilih **ALL**
- Klik **Save**

**Variable 3:**
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGF4d2pveXR0cHdneGhwaGtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDgwMDE1MywiZXhwIjoyMDk2Mzc2MTUzfQ.r8WXjPpakSohNaNpwezvPWwU9HKoaCmJOAx-98yf4bE`
- **Environment:** Pilih **Production + Preview** (JANGAN Development untuk security)
- Klik **Save**

### Step 3: Redeploy

**PENTING:** Environment variables tidak otomatis apply ke deployment yang sudah ada!

1. Klik tab **Deployments**
2. Cari deployment paling atas (yang terbaru, commit 0c3b780)
3. Klik tombol **"..."** (3 dots) di kanan
4. Klik **"Redeploy"**
5. Tunggu ~2-3 menit build selesai

### Step 4: Verify

Setelah redeploy selesai, test:

```bash
# Test API (should return success: true)
curl https://www.bijakbeli.web.id/api/admin/data-collection/offers?limit=1
```

Kalau masih error, cek:
- Environment variables sudah benar? (typo?)
- Sudah redeploy? (bukan refresh doang)
- Build sukses? (cek Deployments tab)

---

## 🎯 Why This Happened?

1. ✅ **Code:** Sudah di GitHub (commit 0c3b780)
2. ✅ **Database:** Migration 110 sudah applied
3. ❌ **Vercel:** Belum punya environment variables

**`.env.local` tidak ke-push ke GitHub** (security) → **Vercel tidak tahu credentials** → **App error di production**

---

## 📸 Screenshot Guide (Jika Butuh)

**Vercel Settings → Environment Variables:**

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://oklaxwjoyttpwgxhphko.supabase.co
Environment: [✓] Production [✓] Preview [✓] Development
```

**Save → Redeploy → Done!** 🎉

---

## 🆘 Troubleshooting

### Error: "Your project's URL and Key are required"
→ Environment variables belum ditambahkan atau belum redeploy

### Error: "Database connection failed"
→ Cek SUPABASE_SERVICE_ROLE_KEY benar

### Homepage blank/error
→ Cek browser console, mungkin NEXT_PUBLIC_SUPABASE_ANON_KEY salah

### Build failed
→ Cek Deployments logs, mungkin TypeScript error (tapi harusnya tidak, lokal sudah build SUCCESS)

---

**Estimasi Waktu:** 5 menit  
**Status Sekarang:** Code ✅ | Database ✅ | Vercel Env ❌  
**After Fix:** Semua ✅ (Production LIVE!)
