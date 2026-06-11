# 🚨 VERCEL ENVIRONMENT VARIABLE UPDATE REQUIRED

## Issue
The live site still shows old URL in metadata (`og:url: https://pricehunt-indonesia.vercel.app`) because Vercel environment variable belum diupdate.

## Fix Required (5 menit)

### 1. Login ke Vercel Dashboard
https://vercel.com/afifghaffarr-source/pricehunt-indonesia

### 2. Go to Settings → Environment Variables

### 3. Update Variable
**Variable Name:** `NEXT_PUBLIC_APP_URL`

**Old Value:** `https://pricehunt-indonesia.vercel.app`  
**New Value:** `https://www.bijakbeli.app`

### 4. Redeploy
Click "Redeploy" or push any commit to trigger new deployment.

---

## Status After Fix
✅ Login page: BijakBeli branding  
✅ All source code: BijakBeli naming  
✅ Metadata: BijakBeli URLs  
✅ API URLs: www.bijakbeli.app  
✅ 215 tests passing  

---

## Fallback Fix Applied
Updated layout.tsx fallback from `bijakbeli.id` → `www.bijakbeli.app` so future deploys work even without env var.

**Commit:** Will be included in next push.
