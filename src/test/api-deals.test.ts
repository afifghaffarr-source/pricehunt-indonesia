import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe('Deal Score Calculation Optimization', () => {
  let supabase: ReturnType<typeof createClient> | null = null;

  beforeAll(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      // Skip silently when env is not provided (e.g. CI unit test runs).
      return;
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  it('should have products with price history', async () => {
    if (!supabase) return; // env-missing skip
    // P7-Post: `price_history` was dropped in migration 129. The legacy
    // embed is replaced with a direct `price_snapshots` join (via
    // `offers!inner(product_id)`). We still sanity-check that products
    // have at least one snapshot in the last 30 days.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const { data, error } = await supabase
      .from('price_snapshots')
      .select('current_price, captured_at, offers!inner(product_id)')
      .gte('captured_at', thirtyDaysAgo)
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThan(0);
  });

  it('should calculate median correctly', () => {
    const calculateMedian = (values: number[]): number | null => {
      if (values.length === 0) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      }
      return sorted[mid];
    };

    expect(calculateMedian([1, 2, 3, 4, 5])).toBe(3);
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
    expect(calculateMedian([5])).toBe(5);
    expect(calculateMedian([])).toBeNull();
  });

  it('should calculate historical stats from price history', () => {
    const calculateHistoricalStats = (
      priceHistory: Array<{ price: number; recorded_at: string }>,
      currentDate: Date
    ) => {
      if (priceHistory.length === 0) {
        return {
          median30Day: null,
          median90Day: null,
          lowestHistoricalPrice: null,
        };
      }

      const calculateMedian = (values: number[]): number | null => {
        if (values.length === 0) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
          return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        return sorted[mid];
      };

      const thirtyDaysAgo = new Date(currentDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const ninetyDaysAgo = new Date(currentDate);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const last30DayPrices = priceHistory
        .filter(h => new Date(h.recorded_at) >= thirtyDaysAgo)
        .map(h => h.price);

      const last90DayPrices = priceHistory
        .filter(h => new Date(h.recorded_at) >= ninetyDaysAgo)
        .map(h => h.price);

      const allPrices = priceHistory.map(h => h.price);

      return {
        median30Day: calculateMedian(last30DayPrices),
        median90Day: calculateMedian(last90DayPrices),
        lowestHistoricalPrice: allPrices.length > 0 ? Math.min(...allPrices) : null,
      };
    };

    const mockHistory = [
      { price: 100000, recorded_at: '2026-05-01' },
      { price: 95000, recorded_at: '2026-05-15' },
      { price: 90000, recorded_at: '2026-06-01' },
      { price: 85000, recorded_at: '2026-06-10' },
    ];

    const stats = calculateHistoricalStats(mockHistory, new Date('2026-06-11'));

    expect(stats.lowestHistoricalPrice).toBe(85000);
    expect(stats.median30Day).toBeDefined();
    expect(stats.median90Day).toBeDefined();
  });

  it('should fetch products with all required data for deal scoring', async () => {
    if (!supabase) return; // env-missing skip
    // P7-Post: dropped the `price_history` PostgREST embed (legacy table
    // dropped in migration 129). Deal-score stats are now derived from
    // `price_snapshots` in the route handler. This integration test
    // only verifies that products + offers loads correctly.
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        lowest_price,
        offers (
          current_price,
          seller_rating,
          stock_status,
          marketplaces (name)
        )
      `)
      .not('lowest_price', 'is', null)
      .limit(3);

    // Type for the products+offers+marketplaces join. Supabase's typed client
    // doesn't infer nested embed shapes for complex selects; we declare the
    // shape explicitly here so the test still gets type checking on the
    // fields it actually reads (id, name, offers[].current_price, etc.).
    type DealTestProduct = {
      id: string;
      name: string;
      slug: string;
      lowest_price: number | null;
      offers: Array<{
        current_price: number;
        seller_rating: number | null;
        stock_status: string;
        marketplaces: { name: string } | null;
      }> | null;
    };
    const products = data as unknown as DealTestProduct[] | null;

    expect(error).toBeNull();
    expect(products).toBeTruthy();
    expect(Array.isArray(products) && products.length).toBeGreaterThan(0);

    if (Array.isArray(products) && products.length > 0) {
      const product = products[0];
      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.slug).toBeDefined();
      expect(product.lowest_price).toBeGreaterThan(0);
    }
  });
});
