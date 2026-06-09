# Data Ingestion System - Phase 4: Product Matcher

**Status:** ✅ COMPLETE  
**Date:** 2026-06-10  
**Tests:** 58/58 passing (100%)

---

## Overview

Phase 4 implements intelligent product matching to prevent wrong product/variant merging during offer ingestion. The matcher uses multiple signals to determine if an offer belongs to a product.

## Deliverables

### 1. Core Implementation

**File:** `src/lib/ingestion/matcher.ts` (450 lines)

**Functions:**
- `detectNegativeKeywords()` - Detect replica, used, wrong items
- `calculateTitleSimilarity()` - Jaccard + containment algorithm
- `extractVariantInfo()` - Extract storage, RAM, colors, models
- `areVariantsCompatible()` - Check variant conflicts
- `checkPriceSanity()` - Price deviation check
- `matchOfferToProduct()` - Master matching function
- `findBestProductMatch()` - Batch matching

### 2. Test Coverage

**File:** `src/test/ingestion-matcher.test.ts` (600 lines, 58 tests)

**Coverage:**
- 12 tests: Negative keyword detection
- 7 tests: Title similarity
- 9 tests: Variant extraction
- 5 tests: Variant compatibility
- 5 tests: Price sanity checks
- 16 tests: Master matcher
- 4 tests: Batch matching

---

## Algorithm Details

### Negative Keywords (4 Categories, 30+ Keywords)

**Used Condition:**
- bekas, second, seken, preloved, used

**Replica/Fake:**
- replika, replica, KW, KW1, KW2, fake, palsu, tiruan, imitasi

**Wrong Item Type:**
- case, casing, cover, skin, sticker, dummy, mainan, boneka, poster

**Suspicious Quality:**
- cacat, rusak, minus, lecet, penyok, retak, mati, bootloop, icloud

**Detection:** Uses word boundaries to avoid false positives

### Title Similarity Algorithm

**Method:** Jaccard Similarity + Substring Containment

**Steps:**
1. Normalize titles (lowercase, remove noise words)
2. Tokenize (split by space, filter length > 2)
3. Calculate Jaccard: `intersection / union`
4. Check containment: +30% if one contains other
5. Combined score: `jaccard * 70 + containment * 100`

**Score Range:** 0-100%

### Variant Extraction

**Storage:** 256GB, 1TB, etc.  
**RAM:** 16GB RAM, etc.  
**Colors:** black, white, purple, hitam, ungu, etc.  
**Models:** Pro, Max, Plus, Ultra, Lite, Mini

**Compatibility Check:**
- Storage conflicts are critical (256GB ≠ 128GB)
- Color differences are acceptable
- Model variants must match

### Price Sanity Check

**Threshold:** ±50% deviation from average

**Flags:**
- `too_low`: < -50% (suspicious)
- `too_high`: > +50% (suspicious)
- `ok`: within ±50%

---

## Scoring System

### Starting Score: 100

**Penalties:**

| Issue | Points | Flag |
|-------|--------|------|
| Replica keyword | -60 (instant reject) | `negative_keyword_detected` |
| Title similarity < 30% | -55 | `title_mismatch` |
| Variant conflict | -40 | `variant_conflict` |
| Used condition | -30 | `condition_mismatch` |
| Title similarity 30-50% | -20 | - |
| Price anomaly (>50%) | -20 | `price_anomaly` |
| Inconsistent with existing | -15 | - |

### Match Decision

**Threshold:** score > 50 (not >=, to reject edge cases)

**Confidence Levels:**
- **High:** score >= 75
- **Medium:** score 50-74
- **Low:** score 30-49
- **Reject:** score < 30

**Result:**
- `isMatch = true` if score > 50 AND confidence != "reject"
- `isMatch = false` otherwise

---

## Usage Examples

### Example 1: Perfect Match

```typescript
matchOfferToProduct({
  offerTitle: "iPhone 14 Pro Max 256GB Purple",
  offerPrice: 18000000,
  offerMarketplace: "tokopedia",
  productTitle: "iPhone 14 Pro Max 256GB",
})

// Result:
// isMatch: true
// score: 85
// confidence: "high"
// reasons: ["Title match: 87%", "Variant kompatibel"]
// warnings: []
// flags: []
```

### Example 2: Replica Rejection

```typescript
matchOfferToProduct({
  offerTitle: "iPhone 14 Pro Max Replika KW Super",
  offerPrice: 2000000,
  productTitle: "iPhone 14 Pro Max 256GB",
})

// Result:
// isMatch: false
// score: 0
// confidence: "reject"
// reasons: ["Terdeteksi replika/fake"]
// flags: ["negative_keyword_detected"]
```

### Example 3: Variant Conflict

```typescript
matchOfferToProduct({
  offerTitle: "iPhone 14 Pro Max 128GB",
  productTitle: "iPhone 14 Pro Max 256GB",
})

// Result:
// isMatch: false
// score: 45
// confidence: "low"
// warnings: ["Variant tidak cocok"]
// flags: ["variant_conflict"]
```

### Example 4: Batch Matching

```typescript
findBestProductMatch(
  {
    title: "iPhone 14 Pro Max 256GB Purple",
    price: 18000000,
    marketplace: "tokopedia",
  },
  [
    { id: "1", title: "iPhone 14 Pro Max 256GB" },
    { id: "2", title: "iPhone 14 Pro 256GB" },
    { id: "3", title: "Samsung Galaxy S23" },
  ]
)

// Result:
// bestMatch: { productId: "1", result: { score: 85, ... } }
// allResults: sorted by score (descending)
```

---

## Integration Points

### 1. Offer Ingestion API

When receiving new offers from scraper/extension/admin:

```typescript
import { matchOfferToProduct, findBestProductMatch } from "@/lib/ingestion/matcher"

// Get candidate products (by title search, brand, category, etc.)
const candidates = await findCandidateProducts(offerTitle)

// Find best match
const { bestMatch } = findBestProductMatch(offer, candidates)

if (bestMatch && bestMatch.result.confidence === "high") {
  // Auto-merge: attach offer to product
  await createOffer({ ...offer, product_id: bestMatch.productId })
} else if (bestMatch && bestMatch.result.confidence === "medium") {
  // Manual review: flag for admin
  await createOfferPendingReview({ ...offer, suggested_product_id: bestMatch.productId })
} else {
  // Create new product
  await createProductWithOffer(offer)
}
```

### 2. Admin Review Tool

```typescript
// Show match details to admin
const result = matchOfferToProduct({
  offerTitle: pendingOffer.title,
  productTitle: suggestedProduct.title,
  // ... other fields
})

// Display:
// - Score: result.score
// - Confidence: result.confidence
// - Reasons: result.reasons
// - Warnings: result.warnings
// - Flags: result.flags
```

---

## Test Results

```
✓ src/test/ingestion-matcher.test.ts (58 tests) 38ms
  ✓ detectNegativeKeywords (12 tests)
  ✓ calculateTitleSimilarity (7 tests)
  ✓ extractVariantInfo (9 tests)
  ✓ areVariantsCompatible (5 tests)
  ✓ checkPriceSanity (5 tests)
  ✓ matchOfferToProduct (16 tests)
  ✓ findBestProductMatch (4 tests)

Test Files: 1 passed (1)
Tests: 58 passed (58)
Duration: 2.17s
```

---

## Key Features

### ✅ Prevents Wrong Merging
- Replica detection with instant rejection
- Storage variant conflict detection (256GB ≠ 128GB)
- Used condition detection (bekas, second, preloved)

### ✅ Intelligent Scoring
- Multi-signal algorithm (title, variant, price, condition)
- Configurable penalties and thresholds
- Confidence levels for automation decision

### ✅ Comprehensive Testing
- 58 test cases covering all scenarios
- Edge case handling (exact score = 50)
- Word boundary regex for accuracy

### ✅ Production Ready
- Clean TypeScript types
- Detailed reasoning and warnings
- Easy to integrate and extend

---

## Next Steps (Phase 5+)

1. **Dedupe Detection:**
   - Detect duplicate offers from same seller
   - Cross-marketplace duplicate detection
   - Price history-based deduplication

2. **Smart Product Creation:**
   - Auto-extract brand, category from title
   - Auto-generate clean product title
   - Auto-assign to correct category tree

3. **ML-Based Matching (Future):**
   - Train on historical match decisions
   - Embedding-based similarity
   - Learn from admin corrections

4. **Performance Optimization:**
   - Cache variant extractions
   - Batch title similarity calculations
   - Pre-filter candidates efficiently

---

## Summary

**Phase 4 Complete:** Product Matcher prevents wrong product/variant merging with 58/58 tests passing.

**Key Achievement:** Intelligent matching algorithm that balances precision (avoiding wrong merges) with recall (finding correct matches).

**Production Impact:** Ensures data quality during ingestion, reduces manual review workload, prevents user confusion from wrong product groupings.
