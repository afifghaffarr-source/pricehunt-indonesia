/* eslint-disable @typescript-eslint/no-explicit-any */
// Pre-existing `any` usages; tracked under Phase 5 type-safety backlog.
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
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price_history(price, recorded_at)')
      .not('lowest_price', 'is', null)
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    // @ts-expect-error - Supabase type inference issue with complex queries
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
        ),
        price_history (
          price,
          recorded_at
        )
      `)
      .not('lowest_price', 'is', null)
      .limit(3);

    // Supabase type inference issue with complex queries - cast to any
    const products = data as any;

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
