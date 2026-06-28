/**
 * Unit tests: src/lib/product-price-stats.ts
 *
 * Extracted from src/app/product/[slug]/page.tsx during Phase C refactor.
 * Pure function — easy to test deterministically with a fixed `now` parameter.
 */
import { describe, it, expect } from "vitest";
import { calculatePriceStats, type PriceHistoryPoint } from "@/lib/product-price-stats";

const NOW = new Date("2026-06-17T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

// Helper to build a history point
const point = (daysAgo: number, prices: Record<string, number | null>): PriceHistoryPoint => ({
  date: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
  prices,
});

describe("calculatePriceStats", () => {
  describe("empty input", () => {
    it("returns all undefined for empty priceHistory", () => {
      const result = calculatePriceStats({ priceHistory: [] }, NOW);
      expect(result).toEqual({
        median30Day: undefined,
        median90Day: undefined,
        lowestHistoricalPrice: undefined,
      });
    });
  });

  describe("median calculations", () => {
    it("computes median for odd number of prices in 30-day window", () => {
      const result = calculatePriceStats(
        {
          priceHistory: [
            point(5, { tokopedia: 1000 }),
            point(10, { tokopedia: 2000 }),
            point(15, { tokopedia: 3000 }),
          ],
        },
        NOW
      );
      // Sorted: [1000, 2000, 3000], mid=1, value=2000
      expect(result.median30Day).toBe(2000);
    });

    it("computes median for even number of prices in 30-day window", () => {
      const result = calculatePriceStats(
        {
          priceHistory: [
            point(5, { tokopedia: 1000 }),
            point(10, { tokopedia: 2000 }),
            point(15, { tokopedia: 3000 }),
            point(20, { tokopedia: 4000 }),
          ],
        },
        NOW
      );
      // Sorted: [1000, 2000, 3000, 4000], mid=2, (arr[1]+arr[2])/2 = (2000+3000)/2 = 2500
      expect(result.median30Day).toBe(2500);
    });

    it("ignores null values in prices object", () => {
      const result = calculatePriceStats(
        {
          priceHistory: [
            point(5, { tokopedia: 1000, shopee: null }),
            point(10, { tokopedia: 2000, shopee: 1500 }),
          ],
        },
        NOW
      );
      // Only counts: 1000, 2000, 1500 → sorted [1000, 1500, 2000] → median 1500
      expect(result.median30Day).toBe(1500);
    });

    it("returns undefined when no prices in 30-day window", () => {
      const result = calculatePriceStats(
        {
          priceHistory: [
            point(60, { tokopedia: 1000 }), // 60 days ago
            point(80, { tokopedia: 2000 }), // 80 days ago
          ],
        },
        NOW
      );
      expect(result.median30Day).toBeUndefined();
    });
  });

  describe("window boundaries", () => {
    it("30-day window includes exactly 30 days, excludes 31", () => {
      const result = calculatePriceStats(
        {
          priceHistory: [
            point(29, { tokopedia: 1000 }), // 29 days ago — IN 30-day window
            point(31, { tokopedia: 2000 }), // 31 days ago — OUTSIDE 30-day window
          ],
        },
        NOW
      );
      // 30-day window only includes 1000 → median = 1000
      expect(result.median30Day).toBe(1000);
      // 90-day window includes both
      // All values: [1000, 2000] → median = 1500
      expect(result.median90Day).toBe(1500);
    });
  });

  describe("lowestHistoricalPrice", () => {
    it("finds the minimum across ALL history (no time bound)", () => {
      const result = calculatePriceStats(
        {
          priceHistory: [
            point(5, { tokopedia: 5000 }),
            point(45, { tokopedia: 2000 }),
            point(100, { tokopedia: 1000 }), // oldest, lowest
          ],
        },
        NOW
      );
      expect(result.lowestHistoricalPrice).toBe(1000);
    });

    it("ignores null values when finding minimum", () => {
      const result = calculatePriceStats(
        {
          priceHistory: [
            point(5, { tokopedia: null }),
            point(10, { tokopedia: 5000 }),
            point(20, { tokopedia: null }),
          ],
        },
        NOW
      );
      expect(result.lowestHistoricalPrice).toBe(5000);
    });

    it("returns undefined when all prices are null", () => {
      const result = calculatePriceStats(
        {
          priceHistory: [
            point(5, { tokopedia: null }),
            point(10, { shopee: null }),
          ],
        },
        NOW
      );
      expect(result.lowestHistoricalPrice).toBeUndefined();
    });
  });

  describe("multi-marketplace aggregation", () => {
    it("aggregates prices across marketplaces in the same point", () => {
      const result = calculatePriceStats(
        {
          priceHistory: [
            point(5, { tokopedia: 1000, shopee: 2000, lazada: 3000 }),
          ],
        },
        NOW
      );
      // All 3 prices in 30-day window, sorted [1000, 2000, 3000] → median 2000
      expect(result.median30Day).toBe(2000);
      expect(result.lowestHistoricalPrice).toBe(1000);
    });
  });

  describe("uses now() when not provided", () => {
    it("defaults to current time", () => {
      const recent = point(-1, { tokopedia: 5000 }); // 1 day in future
      const result = calculatePriceStats({ priceHistory: [recent] });
      // Should pick up "recent" point regardless of when test runs
      expect(result.median30Day).toBe(5000);
    });
  });
});
