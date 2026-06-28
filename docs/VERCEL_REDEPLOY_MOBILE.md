# Cara Redeploy Vercel dari HP 📱

**Problem:** Code sudah push ke GitHub, env vars sudah ada, tapi Vercel belum update.

**Solution:** Manual redeploy dari HP (2 menit)

---

## Step-by-Step (dari HP)

### 1. Buka Deployments Tab
```
Vercel App → bijakbeli-app → Deployments
```

### 2. Cari Deployment Teratas
- Lihat deployment paling atas
- Cek commit message-nya
- **Kalau bukan `6cf813e` atau `c42060f`** → Perlu redeploy!

### 3. Redeploy
Tap deployment teratas → **"Redeploy"** button

ATAU

**Buat deployment baru:**
- Klik "..." (3 dots) di pojok kanan atas
- Pilih **"Redeploy"** atau **"Deploy from master"**

### 4. Tunggu Build (2-3 menit)
- Status: Building → Deploying → Ready
- Kalau **"Ready"** dengan centang hijau ✅ → Success!

### 5. Test (dari HP browser)
Buka:
```
https://www.bijakbeli.web.id/api/admin/data-collection/offers?limit=1
```

**Expected Response:**
```json
{
  "success": true,
  "data": [],
  "pagination": {...}
}
```

Kalau masih error `500` atau "Supabase client" → Refresh cache browser (hard reload)

---

## Troubleshooting

### Build Failed?
- Tap deployment → "View Function Logs"
- Screenshot error → kirim ke saya

### Masih 500 Error?
- Cek apakah commit `c42060f` yang ter-deploy
- Clear browser cache
- Tunggu 1-2 menit untuk propagation

---

**Date:** 2026-06-11  
**Latest Commit:** `6cf813e` (docs), `c42060f` (migration activation)
