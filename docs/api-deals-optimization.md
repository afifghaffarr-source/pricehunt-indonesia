# Deal Score Calculation API - Optimization

## Overview

Optimized `/api/deals` endpoint that calculates comprehensive deal scores based on real historical price data, seller reputation, and stock availability.

## Endpoint

```
GET /api/deals
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 24 | Number of products to return (max: 100) |
| `minScore` | number | 0 | Minimum deal score filter (0-100) |
| `category` | string | - | Filter by product category |

## Response Format

```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "slug": "product-slug",
      "image_url": "https://...",
      "category": "Electronics",
      "lowest_price": 150000,
      "marketplace_count": 3,
      "best_marketplace": "Tokopedia",
      "deal_score": 85,
      "deal_label": "Beli sekarang",
      "deal_color": "green",
      "deal_explanation": [
        "Harga 15% di bawah median 90 hari",
        "Penjual terpercaya dengan rating tinggi",
        "Stok tersedia"
      ],
      "deal_risks": [],
      "confidence": "high",
      "breakdown": {
        "priceDiscount": 25,
        "pricePercentile": 15,
        "sellerTrust": 12,
        "officialStore": 0,
        "stockConfidence": 10,
        "promotions": 5
      },
      "historical_stats": {
        "median30Day": 160000,
        "median90Day": 175000,
        "lowestPrice": 145000,
        "dataPoints": 45
      }
    }
  ],
  "summary": {
    "total": 24,
    "bestDeals": 8,
    "goodDeals": 12,
    "avgScore": 72
  },
  "cached_until": "2026-06-11T18:00:00.000Z"
}
```

## Deal Score Breakdown

The deal score (0-100) is calculated from:

| Component | Max Points | Description |
|-----------|------------|-------------|
| Price Discount | 35 | Discount vs 90-day median |
| Price Percentile | 20 | Position in historical price range |
| Seller Trust | 15 | Rating + review count |
| Official Store | 10 | Official store verification |
| Stock Confidence | 10 | Stock availability |
| Promotions | 10 | Vouchers + free shipping |

## Deal Labels

| Score Range | Label | Color | Meaning |
|-------------|-------|-------|---------|
| 80-100 | Beli sekarang | green | Excellent deal, buy now |
| 60-79 | Harga bagus | yellow | Good price, consider buying |
| 40-59 | Tunggu turun | orange | Wait for price drop |
| High risks | Diskon mencurigakan | red | Suspicious discount |
| Low confidence | Data belum cukup | gray | Insufficient data |

## Optimizations Implemented

### 1. Real Historical Data
- Uses actual `price_history` table data
- Calculates median prices for 30-day and 90-day periods
- Tracks lowest historical price

### 2. Efficient Queries
- Single query with joins to fetch all required data
- Leverages existing indexes on `lowest_price` and `product_id`
- Batch processing of historical statistics

### 3. Caching
- Response cached for 1 hour (3600 seconds)
- `revalidate: 3600` directive
- Returns `cached_until` timestamp

### 4. Smart Filtering
- Fetches 3x requested limit to ensure enough high-scoring products
- Filters by minimum score after calculation
- Returns only top N results

## Performance Considerations

### Database Indexes Used
- `idx_products_slug`
- `idx_products_category`
- `idx_prices_product`
- `idx_price_history_product`
- `idx_price_history_date`

### Recommended Indexes (if missing)
```sql
CREATE INDEX IF NOT EXISTS idx_prices_in_stock ON prices(in_stock);
CREATE INDEX IF NOT EXISTS idx_prices_product_marketplace ON prices(product_id, marketplace_id);
```

## Example Usage

### Get top 10 deals
```bash
curl 'http://localhost:3000/api/deals?limit=10'
```

### Get electronics deals with score >= 70
```bash
curl 'http://localhost:3000/api/deals?category=Electronics&minScore=70&limit=20'
```

### Get best deals only (score >= 85)
```bash
curl 'http://localhost:3000/api/deals?minScore=85&limit=50'
```

## Testing

Run the test suite:
```bash
npm test -- src/test/api-deals.test.ts
```

Tests verify:
- Historical statistics calculation
- Median calculation correctness
- Database query structure
- Data completeness for deal scoring

## Future Enhancements

- [ ] Add `seller_review_count` to schema
- [ ] Add `is_official_store` flag to schema
- [ ] Implement voucher detection from marketplace
- [ ] Add free shipping detection
- [ ] Redis caching layer for high-traffic periods
- [ ] Pre-calculate scores via cron job
- [ ] Add trending/velocity indicators

## Related Files

- `/src/app/api/deals/route.ts` - API endpoint implementation
- `/src/lib/deal-score.ts` - Core scoring algorithm
- `/src/test/api-deals.test.ts` - Test suite
- `/src/app/deals/page.tsx` - Frontend page (to be updated)

## Migration Path

To update the existing `/deals` page to use this API:

1. Replace inline `calculateDealScore` calls with API fetch
2. Remove mock median values (median30Day/median90Day * 1.15/1.2)
3. Use real historical stats from API response
4. Add loading states and error handling

## Performance Metrics (Expected)

- Query time: ~200-500ms for 24 products with history
- Cache hit response: <50ms
- Memory usage: ~10MB per request
- Can handle ~100 concurrent requests on standard Vercel plan
