# Chrome Web Store Upload Checklist — BijakBeli v3.1.0

**Generated:** 2026-06-30 (post-alias-swap `h9jw7xbjx`)
**Target:** https://chrome.google.com/webstore/devconsole/

> Source files untuk di-paste ke form dashboard: lihat `STORE_LISTING.md` (text),
> `LAUNCH_DASHBOARD_FIELDS.md` (form fields detail). Dokumen ini = **step-by-step
> procedure + pre-flight verification untuk v3.1.0**.

---

## ✅ Pre-flight Verification (sudah lewat)

Jalankan sebelum mulai upload form:

```bash
bash extension/preflight-check.sh
```

Expected output pada v3.1.0:
```
== 1. Manifest is valid JSON ==        → OK
== 2. Required manifest fields ==      → OK (name, version=3.1.0, key, dll)
== 3. Manifest version is 3 ==         → OK (MV3)
== 4. ZIP package exists ==            → OK (14 files, 34.5 KB)
== 5. Privacy policy URL reachable ==  → OK (200)
== 6. Storefront landing reachable ==  → OK (200)
== 7. Privacy policy content size ==   → OK (82212 bytes)
== 8. FAQ page reachable ==            → OK (200)
== 9. FAQ JSON endpoint ==             → OK (22 questions, schema.org/FAQPage)

ALL PRE-FLIGHT CHECKS PASSED ✓
```

**Verified at preparation time** (2026-06-30 21:30 WIB):
- `extension/manifest.json` → `version: "3.1.0"`, `manifest_version: 3`
- `bijakbeli-extension-v3.1.0.zip` → 34,508 bytes, 14 files, valid ZIP store-compression
- `public/downloads/bijakbeli-extension-v3.1.0.tar.gz` → 28,200 bytes, served at
  `https://www.bijakbeli.web.id/downloads/bijakbeli-extension-v3.1.0.tar.gz`
  (HTTP 200, SHA1 `9c1311053bc59187f706a7cfb461e35795682f9f`)
- `https://www.bijakbeli.web.id/extension/privacy-policy` → 200 (82 KB)
- `https://www.bijakbeli.web.id/extension` → 200

---

## 📦 v3.1.0 vs v3.0.1 — Yang Berubah

| Diff area | v3.0.1 | v3.1.0 |
|---|---|---|
| Manifest version | 3.0.1 | **3.1.0** |
| Parser version (background.js) | 3.0.1 | **3.1.0** |
| `variant` field in offer payload | ❌ | ✅ (per-marketplace selectors) |
| Dedup hash includes variant | ❌ | ✅ (same product, different variants → both sent) |
| JSON-LD `additionalProperty` extraction | partial | **full** (sku, model, variant) |
| Test count (Vitest + E2E) | 665 + 23 = 681 | **820 + 3 = 823** |

**Permission justification tidak berubah** — manifest permissions sama persis dengan
v3.0.1 (activeTab, storage, tabs, scripting, alarms, notifications + 6 host_permissions).
Tidak perlu re-justify di form. Justification text dalam `LAUNCH_DASHBOARD_FIELDS.md`
tetap applicable.

**Tidak ada UI change** — seluruh perubahan v3.1.0 adalah internal scraper improvement.
Screenshot dan tile assets dari v3.0.1 launch masih berlaku (timestamp 2026-06-29,
1 hari sebelum release — acceptable, no UI shift).

---

## 📋 Step-by-Step Upload Procedure

### Step 1: Buka Chrome Web Store Developer Dashboard

URL: https://chrome.google.com/webstore/devconsole/

Login dengan akun developer yang sudah punya listing "BijakBeli — Price Compare Indonesia"
(yang sebelumnya dipakai untuk v3.0.1).

### Step 2: Edit existing item — **BUKAN** create new

Di dashboard:
- Klik listing **BijakBeli — Price Compare Indonesia** (existing)
- Klik **Package** tab → **Upload new package**
- Drag-drop file: `bijakbeli-extension-v3.1.0.zip` (34,508 bytes)

> Jangan create new listing — pakai yang existing untuk menjaga:
> - install count retention
> - review retention
> - stable extension ID (manifest `key` sama)

### Step 3: Update version-specific fields

Di tab **Package**, setelah upload:
| Field | Value |
|---|---|
| Package | `bijakbeli-extension-v3.1.0.zip` (auto-detected) |

### Step 4: Tab "Store listing" — tidak perlu ubah

Semua text sama dengan v3.0.1 (name, summary, description). Lihat
`LAUNCH_DASHBOARD_FIELDS.md` untuk paste-ready values.

**Yang perlu di-update**: Tab "Version" (auto-increment ke 3.1.0 saat package di-upload).

### Step 5: Tab "Privacy practices"

Tetap sama dengan v3.0.1. Lihat `LAUNCH_DASHBOARD_FIELDS.md` untuk jawaban 9 Chrome data
categories + justification text.

### Step 6: Tab "Permissions" — tidak perlu ubah

Manifest permissions sama persis. Justification text dalam `LAUNCH_DASHBOARD_FIELDS.md`
tetap applicable verbatim.

### Step 7: Submit for review

Setelah upload package baru, klik **Submit for review**.

Expected timeline:
- Typical MV3 review dengan scoped permissions: **1-3 business days** (fast)
- Worst case: 7 business days
- CWS akan email keputusan ke akun developer

---

## 🖼️ Assets Yang Di-upload (drag-drop locations)

### Required: Small promo tile
```
Location: scripts/marketing-assets/captured/tiles/promo-small-440x280.png
Verify:   440 × 280 pixels, PNG, RGB ✓ (verified 2026-06-30)
```

### Recommended (opsional): Marquee promo tile
```
Location: scripts/marketing-assets/captured/tiles/promo-marquee-1280x800.png
Verify:   1280 × 800 pixels, PNG, RGB ✓
Note:     Meningkatkan visibility kalau di-feature oleh CWS.
```

### Required: Minimal 1 screenshot (recommended 5)

Drag-drop 5 dalam urutan yang disarankan:
```
1. scripts/marketing-assets/captured/screenshots/05-compare.png          (1280×800)
2. scripts/marketing-assets/captured/screenshots/02-installed.png        (1280×800)
3. scripts/marketing-assets/captured/screenshots/03-setup.png            (1280×800)
4. scripts/marketing-assets/captured/screenshots/01-landing.png          (1280×800)
5. scripts/marketing-assets/captured/real/product-page-with-extension-1280x800.png (1280×800)
```

> Re-capture sebelum upload jika ada UI perubahan besar. Capture script:
> `BASE=https://www.bijakbeli.web.id npm run capture:extension-screenshots`
> (perlu `npm start` running lokal dulu, atau pakai BASE production URL).

---

## 🔍 Quick Sanity Checks Sebelum Submit

Pastikan:

- [x] Manifest version = `"3.1.0"` di file `extension/manifest.json`
- [x] File `bijakbeli-extension-v3.1.0.zip` exists di working tree (34,508 bytes)
- [x] SHA1 ZIP = `$(shasum -a 1 bijakbeli-extension-v3.1.0.zip)`
- [x] Privacy policy URL live: https://www.bijakbeli.web.id/extension/privacy-policy
- [x] Storefront landing live: https://www.bijakbeli.web.id/extension
- [x] FAQ JSON valid: https://www.bijakbeli.web.id/extension/faq.json
- [x] Vercel production deployment `h9jw7xbjx` aliases both domains
- [x] Sentry bundle dinonaktifkan (avoid Vercel Hobby limit)
- [x] Pre-flight script exit 0

---

## 📊 Post-submit Monitoring

### Hari 1-7 setelah submit

1. **Watch `master` branch** — CWS review kadang pull commits terkait
2. **Cek email CWS reviewer** untuk keputusan atau pertanyaan
3. **Jika rejection email datang**, lihat `extension/REJECTION_RESPONSE_KIT.md`
   untuk pre-drafted counter-arguments per rejection category

### Setelah approved

1. Set `NEXT_PUBLIC_CWS_PUBLISHED=true` di Vercel env vars
2. Set extension ID env vars di production environment
3. Landing page `/extension` auto-flips ke **"Live on Chrome Web Store"** banner
4. Monitor first-week install/uninstall rate via CWS Developer Analytics

### Optional monitoring yang lebih advanced

- **Telegram notification** untuk review status (bisa pakai webhook)
- **CSV export dari CWS analytics** mingguan → ingest ke dashboard internal
- **User feedback form** di popup extension (future v3.2.0 candidate)

---

## 🔗 Reference Docs (paste values dari sini)

| File | Berisi |
|---|---|
| `STORE_LISTING.md` | Finalized text untuk name, summary, description |
| `LAUNCH_DASHBOARD_FIELDS.md` | Form field paste-ready values per tab |
| `LAUNCH_CHECKLIST.md` | Original comprehensive checklist (basis untuk file ini) |
| `REJECTION_RESPONSE_KIT.md` | Counter-arguments per rejection reason |
| `CHANGELOG.md` | Apa yang berubah per version (untuk "what's new" notes) |
| `preflight-check.sh` | Automated verification script (9 checks exit 0) |

---

## ⏱️ Time Estimate

| Step | Approx time |
|---|---|
| Buka dashboard | 1 min |
| Upload ZIP | 1 min |
| Verify form fields auto-populated | 2 min |
| Click Submit | 30 sec |
| **Total active time** | **~5 min** |

CWS review waiting time: **1-3 business days** (typical MV3 with scoped permissions).

---

> Hygiene note: setelah approve, jangan lupa rotate `INGESTION_SECRET` di dashboard +
> sync ke `popup.js` jika ada data klasifikasi user key yang baru.
