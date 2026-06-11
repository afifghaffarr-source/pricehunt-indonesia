# PHASE 1: FOUNDATION - COMPLETE ✅

**Tanggal:** 2026-06-11  
**Status:** SELESAI  
**Next:** PHASE 2 - Python Browser Collector

---

## 📋 CHECKLIST PHASE 1

- [x] **Audit project structure**
- [x] **Migration 110: Enhanced Data Collection**
- [x] **createAdminClient** (sudah ada)
- [x] **Ingestion normalizer** (sudah ada)
- [x] **Confidence score** (sudah ada)
- [x] **Ingestion API enhanced**
- [x] **Tests** (211 passing)
- [x] **Build verification**

---

## 🗄️ DATABASE SCHEMA BARU

### Migration 110: `enhanced_data_collection`

**Tables Ditambahkan:**

1. **`crawl_targets`** - URL queue untuk targeted refresh
   - `url`, `domain`, `marketplace_id`, `product_id`, `offer_id`
   - `priority_score`, `status`, `next_crawl_at`
   - Status: `queued`, `processing`, `success`, `failed`, `blocked`, `paused`, `disabled`

2. **`recheck_requests`** - User request untuk cek ulang harga
   - `offer_id`, `product_id`, `requested_by`
   - `reason`, `status`, `priority_score`
   - Status: `pending`, `processing`, `done`, `failed`, `ignored`

3. **`price_reports`** - Laporan harga salah dari user
   - `offer_id`, `user_id`, `report_type`, `message`
   - `reported_price`, `status`
   - Status: `open`, `resolved`, `ignored`, `false_positive`

**Fields Ditambahkan ke `offers`:**
- `title` - Product title dari marketplace
- `image_url` - Product image URL
- `category_hint` - Untuk template image fallback
- `validation_status` - pending, valid, conflict, parser_error, stale, rejected
- `confidence_label` - Human-readable: sangat dipercaya, dipercaya, cukup dipercaya, perlu dicek ulang, data belum pasti

**Fields Ditambahkan ke `price_snapshots`:**
- `confidence_label` - Human-readable confidence

**Indexes:**
- `offers.product_id`, `offers.marketplace_id`, `offers.product_url`
- `offers.last_checked_at`, `offers.confidence_score`
- `price_snapshots.offer_id`, `price_snapshots.captured_at`
- `crawl_targets.next_crawl_at`, `crawl_targets.priority_score`, `crawl_targets.status`
- `recheck_requests.status`
- `price_reports.status`

**RLS Policies:**
- Public read untuk `offers` dan `price_snapshots` (safe fields)
- User login boleh create `recheck_requests` dan `price_reports`
- Service role full access untuk ingestion
- Admin via server action dengan `is_admin` check

---

## 🔌 API ENDPOINTS

### **NEW: `/api/ingestion/offer-snapshot`**

Simplified endpoint untuk Python browser collector.

**Method:** `POST`

**Authentication:**
- `Authorization: Bearer INGESTION_SECRET` (untuk Python collector)
- User session (untuk logged-in users - future)

**Input Schema:**
```typescript
{
  // Required
  marketplace: string,        // "tokopedia", "shopee"
  product_url: string,        // Full URL
  title: string,              // Product title
  price: string | number,     // "Rp 1.299.000" or 1299000
  
  // Optional
  marketplace_product_id?: string,
  original_price?: string | number,
  seller_name?: string,
  seller_id?: string,
  seller_rating?: number,     // 0-5
  seller_location?: string,
  is_official_store?: boolean,
  condition?: string,
  variant?: string,
  stock_status?: string,
  rating?: number,            // 0-5
  review_count?: number,
  sold_count?: number,
  shipping_estimate?: string | number,
  voucher_text?: string,
  image_url?: string,
  category_hint?: string,
  
  // Metadata
  source?: string,            // default: "browser_collector"
  captured_at?: string,       // ISO datetime
  parser_version?: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  offer_id?: string,          // UUID
  snapshot_id?: string,       // UUID
  confidence_score?: number,  // 0-100
  confidence_label?: string,  // "sangat dipercaya", etc
  validation_status?: string, // "pending", "valid", etc
  warnings?: string[],
  message?: string,
  code?: string,
}
```

**Features:**
- ✅ Normalize price (Rp 1.299.000 → 1299000)
- ✅ Normalize marketplace name
- ✅ Normalize stock status & condition
- ✅ Calculate discount percentage
- ✅ Find or create marketplace
- ✅ Try to match existing product
- ✅ Calculate confidence score
- ✅ Upsert offer by URL
- ✅ Insert price snapshot
- ✅ Log to ingestion_logs
- ✅ Return warnings for non-fatal issues

---

## 📊 EXISTING INFRASTRUCTURE (VERIFIED)

### Ingestion Normalizer
**Location:** `src/lib/ingestion/normalizer.ts` (11KB)

**Functions:**
- `normalizePrice(raw)` - Handles "Rp 1.299.000", "1,2 jt", etc
- `normalizeMarketplace(raw)` - Consistent marketplace names
- `normalizeStockStatus(raw)` - tersedia, stok habis, pre-order, tidak diketahui
- `normalizeCondition(raw)` - baru, bekas, refurbished, tidak diketahui
- `normalizeProductTitle(raw)` - Clean product titles
- `calculateDiscountPercent(current, original)` - Discount calculation

### Confidence Score Calculator
**Location:** `src/lib/ingestion/confidence.ts` (10KB)

**Base Scores:**
- `official_api`: 95
- `manual_admin`: 90
- `affiliate_feed`: 85
- `extension_snapshot`: 82
- `browser_collector`: 80
- `community_proof`: 75
- `targeted_crawler`: 70

**Penalties:**
- Missing price: -50
- Parser error: -40
- Conflict detected: -25
- Older than 7 days: -30
- Older than 24 hours: -10
- Product mismatch: -50
- Possible mismatch: -20
- Missing seller: -5
- Missing stock: -5

**Bonuses:**
- Official store: +5
- Cross validated: +10
- Captured within 1 hour: +5
- Seller exists: +3
- Stock known: +3

**Labels:**
- 90-100: `sangat_dipercaya`
- 75-89: `dipercaya`
- 60-74: `cukup_dipercaya`
- 40-59: `perlu_dicek_ulang`
- 0-39: `data_belum_pasti`

### Product Matcher
**Location:** `src/lib/ingestion/matcher.ts` (14KB)

**Scoring:**
- Brand match: +20
- Model match: +25
- Storage/RAM/spec match: +20
- Variant match: +10
- Condition match: +10
- Warranty/official match: +10
- Title similarity: +15

**Negative Keywords Detection:**
- Used: bekas, second, preloved, ex inter
- Replica: replika, kw, fake, clone
- Wrong item: case, dummy, box only, charger only, aksesoris

**Match Status:**
- `exact_match`: score >= 85
- `likely_match`: score 70-84
- `possible_match`: score 50-69
- `mismatch`: score < 50

### Admin Client (Server-Only)
**Location:** `src/lib/supabase/admin.ts` (1.5KB)

**Features:**
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- No auto-refresh, no persist session
- Server-side only (tidak expose ke client)
- Bypass RLS untuk ingestion

---

## ✅ TESTS PASSING

**Total:** 211 tests passing

**Test Files:**
- `business-logic.test.ts` (30 tests)
- `utils.test.ts` (15 tests)
- `ingestion-matcher.test.ts` (58 tests) ✨
- `ingestion-normalizer.test.ts` (55 tests) ✨
- `data.test.ts` (2 tests)
- `ingestion-confidence.test.ts` (39 tests) ✨
- `cn.test.ts` (4 tests)
- `security.test.ts` (8 tests)

**Coverage Areas:**
- ✅ Price normalization (berbagai format)
- ✅ Confidence scoring (semua skenario)
- ✅ Product matching (positive & negative keywords)
- ✅ Negative keyword detection
- ✅ Title similarity calculation
- ✅ Variant compatibility
- ✅ Price sanity checks

---

## 📦 BUILD STATUS

```bash
npm run build
```

**Result:** ✅ SUCCESS (dengan beberapa type assertions karena Supabase types belum regenerated)

**Note:** Setelah migration 110 dijalankan di Supabase, jalankan:
```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
```

---

## 🔐 ENVIRONMENT VARIABLES

**Updated `.env.local.example`:**
```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only (JANGAN EXPOSE KE CLIENT)
SUPABASE_SERVICE_ROLE_KEY=      # For admin client
INGESTION_SECRET=               # For Python collector auth
CRON_SECRET=                    # For cron endpoints

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Python Collector `.env`:**
```env
PRICEHUNT_API_URL=http://localhost:3000
INGESTION_SECRET=<same-as-nextjs>
DEFAULT_MARKETPLACE=tokopedia
COLLECTOR_DEFAULT_LIMIT=10
COLLECTOR_HEADLESS=false
```

---

## 📝 FILES CREATED/MODIFIED

### New Files:
1. `supabase/migrations/110_enhanced_data_collection.sql` (216 lines)
2. `src/app/api/ingestion/offer-snapshot/route.ts` (420 lines)
3. `docs/PHASE_1_COMPLETE.md` (this file)

### Modified Files:
1. `src/app/api/ingestion/route.ts` - Enhanced schema dengan fields baru

---

## 🎯 WHAT'S WORKING NOW

1. ✅ **Database schema ready** untuk realistic data collection
2. ✅ **Ingestion pipeline complete** dengan normalizer, confidence, matcher
3. ✅ **API endpoint ready** untuk Python collector
4. ✅ **Type-safe with 211 tests** covering core business logic
5. ✅ **Security model clear** - INGESTION_SECRET untuk internal tools
6. ✅ **Confidence scoring transparent** - user tahu data quality
7. ✅ **Product matching smart** - deteksi fake/bekas/aksesoris
8. ✅ **RLS policies proper** - public read safe fields, admin write only

---

## 🚧 KNOWN LIMITATIONS (EXPECTED)

1. ⚠️ **Supabase types outdated** - Perlu regenerate setelah migration 110
2. ⚠️ **Python collector belum dibuat** - PHASE 2 next
3. ⚠️ **Admin dashboard belum dibuat** - PHASE 3 next
4. ⚠️ **User-facing UI belum update** - PHASE 4 next
5. ⚠️ **Targeted refresh belum aktif** - PHASE 5 next

---

## ➡️ NEXT: PHASE 2 - PYTHON BROWSER COLLECTOR

**Goal:** Buat tool Python + Playwright untuk semi-automated data collection

**Deliverables:**
1. `tools/price-collector/` folder structure
2. Manual mode (user browse → confirm → send)
3. URL mode (direct product URL → extract → send)
4. Keyword mode (search → select → send)
5. Generic fallback parser
6. Preview + confirmation flow
7. Tokopedia collector enhanced
8. Shopee collector basic
9. API client integration
10. README complete

**Command Target:**
```bash
# Manual mode - user controls browser
python collector.py --manual

# URL mode - direct extract
python collector.py --url "https://tokopedia.com/..."

# Keyword mode - search & select
python collector.py --marketplace tokopedia --keyword "iphone 15 128gb"
```

---

## 📊 PROJECT STATUS AFTER PHASE 1

**Overall Completion:** ~25% (PHASE 1 of 6 complete)

**Foundation:** ✅ SOLID
- Database schema: READY
- API endpoints: READY
- Business logic: TESTED (211 tests)
- Security model: CLEAR
- Type safety: STRONG (with assertions for new fields)

**Confidence Level:** 🟢 HIGH

Siap lanjut ke PHASE 2! 🚀
