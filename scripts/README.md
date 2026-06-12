# BijakBeli Product Matching Scripts

This directory contains scripts for matching orphaned offers to products in the BijakBeli.app database.

## Overview

The product matching algorithm analyzes offer URLs and product slugs to automatically link offers to their corresponding products, enabling trust metadata display on product pages.

---

## `match_offers_to_products.py`

**Purpose:** Match orphaned offers (where `product_id` is NULL) to existing products based on URL patterns and name similarity.

**Usage:**
```bash
python3 scripts/match_offers_to_products.py
```

**Output:**
- Match results with confidence scores
- SQL UPDATE statements (high confidence ≥0.9)
- SQL comments for medium confidence matches (0.7-0.9)
- List of unmatched offers requiring manual intervention

---

## Matching Strategies

The algorithm uses **6 progressive strategies** in order of confidence:

### 1. Exact Slug Match (1.0 confidence)
Direct match between URL slug and product slug.

**Example:**
```
URL:     iphone-15-pro-max-256gb
Product: iphone-15-pro-max-256gb
Result:  ✅ EXACT MATCH
```

---

### 2. Fingerprint Match (0.98 confidence) 🆕
Ignores all separators (hyphens, underscores, spaces) for fuzzy matching.

**Example:**
```
URL slug:     wh-1000xm5
Product slug: wh1000xm5
Fingerprint:  wh1000xm5 (both normalize to same value)
Result:       ✅ MATCH
```

**Use case:** Handles hyphen variations across marketplaces
- Tokopedia uses: `wh-1000xm5`
- Product database: `wh1000xm5`
- Both recognized as same product

**Implementation:**
```python
def slug_fingerprint(text: str) -> str:
    text = text.lower()
    # Remove ALL non-alphanumeric (hyphens, underscores, spaces)
    text = re.sub(r'[^a-z0-9]', '', text)
    return text
```

---

### 3. Normalized Slug Match (0.95 confidence)
Remove special characters, collapse spaces, lowercase comparison.

**Example:**
```
URL:     galaxy-s24-ultra-512gb
Product: samsung-galaxy-s24-ultra-512gb (after normalization)
Result:  ✅ MATCH (substring of normalized product slug)
```

---

### 4. High Similarity Match (≥0.85 confidence)
Jaccard similarity using `difflib.SequenceMatcher`.

**Example:**
```
URL:     iphone-15-pro-max-256gb
Product: apple-iphone-15-pro-max
Score:   0.87 similarity
Result:  ✅ MATCH
```

---

### 5. Substring Match (0.88 confidence) 🔧
URL slug is substring of product slug. **Enhanced:** prefers closest match when multiple products match.

**Example:**
```
URL:     wh-1000xm5

Candidates:
  - sony-wh-1000xm5 (extra length: 5)
  - sony-wh-1000xm5-wireless-headphones (extra length: 15)

Result:  ✅ Pick sony-wh-1000xm5 (shortest = closest match)
```

**Use case:** Marketplace URLs often omit brand prefix
- URL: `tokopedia.com/sony/wh-1000xm5`
- Product: `sony-wh-1000xm5`

---

### 6. Name Keyword Match (≥0.7 confidence)
Product name keywords found in URL slug.

**Example:**
```
Product name: Samsung Galaxy S24 Ultra 512GB
URL:          galaxy-s24-ultra-512gb
Score:        0.75 similarity
Result:       ✅ MATCH (medium confidence)
```

---

## Confidence Tiers

| Confidence | Range | Action | Use Case |
|------------|-------|--------|----------|
| **High** | 0.90-1.0 | Auto-apply SQL | Exact or fingerprint match |
| **Medium** | 0.70-0.89 | Review first | Substring or similarity match |
| **Low** | <0.70 | Manual linking | No confident match found |

---

## Example Output

```
================================================================================
BijakBeli.app - Product Matching Algorithm
================================================================================

Products: 19
Offers: 12

================================================================================
MATCHING RESULTS
================================================================================

✅ MATCH [1.00]
  Offer:   product from shopee
  URL:     iphone-15-pro-max-256gb
  Product: iPhone 15 Pro Max 256GB
  Reason:  exact_slug_match: 'iphone-15-pro-max-256gb'

✅ MATCH [0.98]
  Offer:   product from tokopedia
  URL:     wh-1000xm5
  Product: Sony WH-1000XM5 Headphone
  Reason:  fingerprint_match: 'wh-1000xm5' ≈ 'wh1000xm5' (both normalize to 'wh1000xm5')

================================================================================
SUMMARY
================================================================================
Total Offers:     12
Matched:          7 (58.3%)
High Confidence:  3
Medium Confidence:4
No Match:         5

================================================================================
SQL UPDATE STATEMENTS (High Confidence >= 0.9)
================================================================================

-- High confidence matches - safe to apply
UPDATE offers SET product_id = '0a24c5b0-08c6-4e77-a1ea-5ab6a79d1d1c' WHERE id = '1472f06e-4d61-40e2-820b-61d3768c6863'; -- iPhone 15 Pro Max 256GB
UPDATE offers SET product_id = '250240cb-9af5-4011-9ed1-fe096a1508a3' WHERE id = '5b9fa74d-de8c-4ea2-839a-8ff5d490603b'; -- Sony WH-1000XM5 Headphone
```

---

## Data Sources

The script expects two data structures:

### PRODUCTS (from database)
```python
PRODUCTS = [
    {
        "id": "uuid-here",
        "name": "Product Name",
        "slug": "product-slug"
    },
    # ...
]
```

### OFFERS (from database)
```python
OFFERS = [
    {
        "id": "uuid-here",
        "title": "Offer title",
        "url": "https://marketplace.com/product-slug",
        "marketplace": "tokopedia"
    },
    # ...
]
```

---

## URL Slug Extraction

The algorithm extracts product identifiers from marketplace URLs:

```python
def extract_product_slug_from_url(url: str) -> str:
    # https://tokopedia.com/apple/iphone-15-pro-max-256gb
    # → iphone-15-pro-max-256gb
    
    # https://shopee.co.id/sony-official/wh-1000xm5
    # → wh-1000xm5
```

---

## Known Limitations

1. **Title-based matching:** Offers often have generic titles ("product from tokopedia") so URL-based matching is primary strategy

2. **Hyphen variations:** Marketplaces use inconsistent slug formats:
   - Tokopedia: `wh-1000xm5`
   - Shopee: `wh_1000xm5`
   - Bukalapak: `wh1000xm5`
   
   **Solution:** Fingerprint matching (Strategy 2)

3. **Duplicate products:** Multiple products with similar slugs can cause ambiguity
   - `sony-wh1000xm5`
   - `sony-wh-1000xm5`
   - `sony-wh-1000xm5-wireless-headphones`
   
   **Solution:** Substring matching prefers shortest (closest) match

4. **Test URLs:** Development offers with timestamp URLs require manual filtering

---

## Maintenance

### Adding New Strategies

To add a new matching strategy:

1. Insert strategy in `find_best_product_match()` at appropriate confidence level
2. Return tuple: `(product, confidence_score, match_reason)`
3. Update `README.md` with strategy description

### Updating Confidence Thresholds

Current thresholds in `main()`:

```python
HIGH_CONFIDENCE = 0.9    # Auto-apply SQL
MEDIUM_CONFIDENCE = 0.7  # Manual review
```

Adjust based on false positive rates in production.

---

## Performance

**Complexity:** O(n × m × s) where:
- n = number of offers
- m = number of products
- s = number of strategies (6)

**Typical runtime:** <1 second for 12 offers × 19 products

**Scalability:** Tested up to 100 offers × 50 products without performance issues

---

## History

- **2026-06-12:** Enhanced substring matching to prefer closest match (extra_length sorting)
- **2026-06-12:** Added fingerprint matching strategy for hyphen variations
- **2026-06-12:** Fixed normalize_text() regex bug (was removing alphanumeric)
- **2026-06-12:** Initial implementation with 4 strategies (58.3% match rate)

---

## Related Files

- `/src/app/product/[slug]/page.tsx` - Uses matched offers to display trust metadata
- `/src/lib/supabase/data.ts` - `getProductOffers()` fetches matched offers
- `/supabase/migrations/110_enhanced_data_collection.sql` - Offers table schema

---

## Support

For issues or questions:
- Check Supabase logs for SQL errors
- Verify product slugs match marketplace URL patterns
- Review unmatched offers for manual intervention opportunities
