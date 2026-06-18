# Data Ingestion System - Phase 1-3 Complete

**Status:** ✅ Foundation Ready for Testing  
**Date:** 2026-06-10  
**Approach:** Option C - Iterative (Phase 1-3 first)

---

## 📦 What Was Built

### Phase 1: Database Schema Enhancement

**Migration:** `supabase/migrations/108_data_ingestion_system.sql`

**3 New Tables:**
1. **`data_sources`** - Track source reliability and config
2. **`ingestion_logs`** - Audit trail for all ingestion jobs
3. **`price_conflicts`** - Auto-detect price discrepancies between sources

**Enhanced Tables:**
- **`offers`** - Added 10 fields: `seller_id`, `seller_location`, `rating`, `review_count`, `sold_count`, `voucher_text`, `source`, `confidence_score`, `is_active`, `currency`
- **`price_snapshots`** - Added 4 fields: `raw_hash`, `stock_status`, `voucher_text`, `shipping_estimate`

**Features:**
- RLS policies (public read, service role write)
- Indexes for performance
- Seed data for 3 initial sources (System, Extension, Community)
- SQL helper function `calculate_offer_confidence()`

---

### Phase 2: Data Normalizer

**File:** `src/lib/ingestion/normalizer.ts`

**Functions:**
- `normalizePrice()` - Handle Indonesian formats: "Rp 1.299.000" → 1299000
- `normalizeMarketplace()` - Standardize marketplace names
- `normalizeStockStatus()` - Indonesian stock status → enum
- `normalizeCondition()` - Product condition → enum
- `normalizeProductTitle()` - Clean title for matching
- `calculateDiscountPercent()` - Compute discount %
- **`normalizeOffer()`** - Master normalizer (entry point)
- `generateOfferHash()` - Deduplication hash

**Handles:**
- Various price formats (Rp, IDR, dots, commas)
- Indonesian text ("tersedia", "habis", "bekas", etc.)
- Defensive programming (safe defaults on errors)

---

### Phase 3: Confidence Score Engine

**File:** `src/lib/ingestion/confidence.ts`

**Core Function:** `calculateConfidenceScore(input): ConfidenceResult`

**Scoring Algorithm:**

**Base Scores by Source:**
- `official_api`: 95
- `manual_admin`: 90
- `affiliate_feed`: 85
- `extension_snapshot`: 80
- `community_proof`: 75
- `targeted_scraper`: 70

**Modifiers:**
- **Freshness:** +5 if < 24h, -5 per day stale (max -30)
- **Completeness:** +5 seller, +5 stock, +3 variant
- **Trust:** +10 official store, +15 cross-validated
- **Issues:** -20 parser error, -15 conflict, -10 missing price

**Confidence Labels (Indonesian):**
- 85-100: "Sangat Dipercaya"
- 70-84: "Dipercaya"
- 55-69: "Cukup Dipercaya"
- 40-54: "Perlu Dicek Ulang"
- 0-39: "Data Belum Pasti"

**Helper Functions:**
- `calculateOfferConfidence()` - Convenience for DB offers
- `calculateBatchConfidence()` - Bulk processing
- `shouldRecalculateConfidence()` - Check if recompute needed
- `getRecommendedRefreshInterval()` - Freshness strategy

---

## 🔧 How to Test

### 1. Run Migration

```bash
# Assuming you have Supabase CLI set up
supabase db reset  # or push migration
# OR manually run the SQL file in Supabase dashboard
```

**Verify:**
- Check tables: `data_sources`, `ingestion_logs`, `price_conflicts` exist
- Check `offers` has new columns: `source`, `confidence_score`, etc.
- Check `price_snapshots` has `raw_hash`, `stock_status`, etc.
- Verify seed data: `SELECT * FROM data_sources;`

### 2. Test Normalizer

Create test file `src/test/ingestion-normalizer.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { normalizePrice, normalizeOffer } from "@/lib/ingestion/normalizer";

describe("Price Normalizer", () => {
  it("handles Indonesian formats", () => {
    expect(normalizePrice("Rp 1.299.000")).toBe(1299000);
    expect(normalizePrice("Rp1.299.000")).toBe(1299000);
    expect(normalizePrice("1,299,000")).toBe(1299000);
    expect(normalizePrice(1299000)).toBe(1299000);
  });
  
  it("handles invalid input", () => {
    expect(normalizePrice("")).toBe(0);
    expect(normalizePrice(null)).toBe(0);
    expect(normalizePrice("abc")).toBe(0);
  });
});

describe("Offer Normalizer", () => {
  it("normalizes complete offer", () => {
    const raw = {
      product_url: "https://tokopedia.com/product/123",
      marketplace: "tokopedia",
      price: "Rp 1.299.000",
      original_price: "Rp 1.499.000",
      seller_name: "Toko Official",
      is_official_store: "true",
      condition: "Baru",
      stock_status: "Tersedia",
      source: "extension",
    };
    
    const normalized = normalizeOffer(raw);
    
    expect(normalized.current_price).toBe(1299000);
    expect(normalized.original_price).toBe(1499000);
    expect(normalized.discount_percent).toBeCloseTo(13.34, 1);
    expect(normalized.is_official_store).toBe(true);
    expect(normalized.condition).toBe("new");
    expect(normalized.stock_status).toBe("in_stock");
  });
});
```

Run: `npm run test`

### 3. Test Confidence Score

Add to same test file:

```typescript
import { calculateConfidenceScore } from "@/lib/ingestion/confidence";

describe("Confidence Score", () => {
  it("calculates high confidence for official fresh data", () => {
    const result = calculateConfidenceScore({
      sourceType: "official_api",
      capturedAt: new Date(),
      hasPrice: true,
      hasSeller: true,
      hasStock: true,
      isOfficialStore: true,
      crossValidated: true,
    });
    
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.label).toBe("sangat_dipercaya");
  });
  
  it("penalizes stale data", () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: weekAgo,
      hasPrice: true,
    });
    
    expect(result.score).toBeLessThan(80);
  });
  
  it("penalizes conflicts", () => {
    const result = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      conflictDetected: true,
    });
    
    expect(result.reasons).toContain("⚠️ Perbedaan harga antar sumber terdeteksi");
  });
});
```

### 4. Manual Integration Test

Create a simple script `scripts/test-ingestion.ts`:

```typescript
import { normalizeOffer } from "@/lib/ingestion/normalizer";
import { calculateConfidenceScore } from "@/lib/ingestion/confidence";

const testOffer = {
  product_url: "https://tokopedia.com/test",
  marketplace: "tokopedia",
  price: "Rp 2.499.000",
  original_price: "Rp 2.999.000",
  seller_name: "Apple Store Official",
  is_official_store: true,
  condition: "Baru",
  stock_status: "Tersedia",
  source: "extension_snapshot",
};

console.log("=== NORMALIZER TEST ===");
const normalized = normalizeOffer(testOffer);
console.log(JSON.stringify(normalized, null, 2));

console.log("\n=== CONFIDENCE TEST ===");
const confidence = calculateConfidenceScore({
  sourceType: "extension_snapshot",
  capturedAt: new Date(),
  hasPrice: normalized.current_price > 0,
  hasSeller: !!normalized.seller_name,
  hasStock: normalized.stock_status !== "unknown",
  isOfficialStore: normalized.is_official_store,
});
console.log(JSON.stringify(confidence, null, 2));
```

Run: `npx tsx scripts/test-ingestion.ts`

---

## 📁 Files Created/Modified

### Created:
1. `supabase/migrations/108_data_ingestion_system.sql` (250 lines)
2. `src/lib/ingestion/normalizer.ts` (382 lines)
3. `src/lib/ingestion/confidence.ts` (345 lines)
4. `DATA_INGESTION_PHASE1-3.md` (this file)

### Modified:
- None (all new code, non-breaking changes)

---

## ✅ Verification Checklist

- [ ] Migration 108 runs successfully
- [ ] 3 new tables exist with correct schema
- [ ] `offers` and `price_snapshots` have new columns
- [ ] Seed data inserted (3 sources)
- [ ] `normalizePrice()` handles Indonesian formats
- [ ] `normalizeOffer()` returns complete normalized data
- [ ] `calculateConfidenceScore()` returns score 0-100
- [ ] Unit tests pass (`npm run test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] No ESLint errors

---

## 🚀 Next Steps (Phase 4+)

**If Phase 1-3 tests pass, choose next phase:**

### Option A: Continue to Phase 4 (Product Matcher)
- Prevent wrong product/variant merging
- Detect negative keywords (bekas, replika, etc.)
- Match score algorithm
- Auto-merge rules

### Option B: Skip to Phase 6 (Ingestion API)
- Create `/api/ingestion/offer-snapshot` endpoint
- Integrate normalizer + confidence calculator
- Security (auth, rate limit, input validation)
- Ready for extension/cron to send data

### Option C: Create Quick Tests First
- Write comprehensive unit tests
- Test migration rollback
- Performance test with bulk data
- Document API contracts

**Recommended:** Option B (Ingestion API) - this makes the system immediately usable.

---

## 🔒 Security Notes

1. **Migration 108** uses service role policies - safe for production
2. **Normalizer** has defensive programming - no SQL injection risk
3. **Confidence calculator** is pure function - no side effects
4. **No secrets exposed** - all server-side code
5. **RLS enabled** - public can only read, not write

---

## 📊 Database Impact

**New storage:**
- `data_sources`: ~3 rows (negligible)
- `ingestion_logs`: grows over time (monitor, archive old logs)
- `price_conflicts`: grows based on quality issues
- `offers`: new columns mostly NULL initially
- `price_snapshots`: new columns mostly NULL initially

**Migration is backward compatible** - existing data not broken.

---

## 💡 Usage Example

```typescript
// In a future ingestion endpoint or cron job:
import { normalizeOffer } from "@/lib/ingestion/normalizer";
import { calculateConfidenceScore } from "@/lib/ingestion/confidence";
import { upsertOffer, createPriceSnapshot } from "@/lib/supabase/offers";

async function ingestOffer(rawData: RawOfferInput) {
  // Step 1: Normalize
  const normalized = normalizeOffer(rawData);
  
  // Step 2: Calculate confidence
  const confidence = calculateConfidenceScore({
    sourceType: mapSourceToType(normalized.source),
    capturedAt: normalized.captured_at,
    hasPrice: normalized.current_price > 0,
    hasSeller: !!normalized.seller_name,
    hasStock: normalized.stock_status !== "unknown",
    isOfficialStore: normalized.is_official_store,
  });
  
  // Step 3: Upsert offer (using admin client)
  const offer = await upsertOffer({
    // ... map normalized data to offer schema
    confidence_score: confidence.score,
    source: normalized.source,
  });
  
  // Step 4: Create price snapshot
  if (offer) {
    await createPriceSnapshot({
      offer_id: offer.id,
      price: normalized.current_price,
      confidence_score: confidence.score,
      source: normalized.source,
    });
  }
  
  return { offer, confidence };
}
```

---

## 🐛 Known Limitations

1. **Product matching not yet implemented** - Phase 1-3 don't include matching logic
2. **No conflict detection yet** - price_conflicts table ready but no auto-detection
3. **No ingestion API yet** - normalizer/confidence ready but no HTTP endpoint
4. **Cross-validation detection basic** - needs improvement in Phase 6+
5. **Hash function simple** - consider crypto hash for production

---

## 📝 Developer Notes

- Normalizer is pure, side-effect free - safe to use anywhere
- Confidence calculator is deterministic - same input = same output
- Both are unit-testable without database
- Database functions can be used in triggers/policies if needed
- Migration is idempotent (IF NOT EXISTS, ON CONFLICT)

---

**Ready for testing and iteration!** 🎉
