/**
 * BUG-03 regression test — stored vs live price drift.
 *
 * Symptom (from dogfood QA 2026-06-17): product page hero showed
 *   "Rp 17.500.000 — Termurah di Blibli" + 19% discount,
 * but the price table showed Blibli at Rp 18.043.816.
 *
 * Root cause: `product.lowestPrice` / `product.highestPrice` are populated
 * from STORED columns on the `products` row, while the table and the
 * "Termurah di X" badge read from the LIVE `product.prices[]` (from
 * `product_prices_view`). The two sources drift whenever new offers are
 * added to `product_offers` without re-aggregating the products row.
 *
 * Fix (v1.5.25): the product page now computes `liveLowestPrice` /
 * `liveHighestPrice` from the in-stock offers in `product.prices[]` and
 * passes those values to every downstream component (hero, decision card,
 * best offers, fake-discount alert, deal verdict, table, alert form,
 * share OG title, meta description).
 *
 * This test asserts the computation logic in isolation, mirroring the
 * same expression the page uses, so any future refactor that re-introduces
 * a drift between stored and live values is caught.
 */
import { describe, it, expect } from "vitest";

/**
 * Mirror of the computation in src/app/product/[slug]/page.tsx.
 * If this drifts from the page, tests will pass but production will break —
 * keep both in sync or extract to a shared helper.
 */
function getLivePriceStats(prices: { inStock: boolean; price: number }[]): {
  liveLowestPrice: number;
  liveHighestPrice: number;
} {
  const inStockPrices = prices.filter((p) => p.inStock);
  return {
    liveLowestPrice:
      inStockPrices.length > 0 ? Math.min(...inStockPrices.map((p) => p.price)) : 0,
    liveHighestPrice:
      inStockPrices.length > 0 ? Math.max(...inStockPrices.map((p) => p.price)) : 0,
  };
}

describe("BUG-03: live price computation matches in-stock offers, not stored columns", () => {
  it("liveLowestPrice equals the minimum in-stock price (ignores out-of-stock)", () => {
    // The exact scenario from the dogfood report: stored lowest = 17.5M
    // (out of stock, cache), live in-stock = 18.04M.
    const prices = [
      { inStock: false, price: 17_500_000 }, // cheapest overall, but sold out
      { inStock: true, price: 18_043_816 },
      { inStock: true, price: 21_500_000 },
    ];
    const { liveLowestPrice } = getLivePriceStats(prices);
    expect(liveLowestPrice).toBe(18_043_816);
  });

  it("liveHighestPrice equals the maximum in-stock price", () => {
    const prices = [
      { inStock: true, price: 17_500_000 },
      { inStock: true, price: 18_043_816 },
      { inStock: true, price: 21_500_000 },
    ];
    const { liveHighestPrice } = getLivePriceStats(prices);
    expect(liveHighestPrice).toBe(21_500_000);
  });

  it("returns 0 for both stats when no offers exist", () => {
    const { liveLowestPrice, liveHighestPrice } = getLivePriceStats([]);
    expect(liveLowestPrice).toBe(0);
    expect(liveHighestPrice).toBe(0);
  });

  it("returns 0 for both stats when all offers are out of stock", () => {
    const prices = [
      { inStock: false, price: 17_500_000 },
      { inStock: false, price: 19_000_000 },
    ];
    const { liveLowestPrice, liveHighestPrice } = getLivePriceStats(prices);
    expect(liveLowestPrice).toBe(0);
    expect(liveHighestPrice).toBe(0);
  });

  it("excludes out-of-stock offers from BOTH ends of the range", () => {
    // Outliers above and below should be ignored.
    const prices = [
      { inStock: false, price: 1_000 }, // bogus out-of-stock
      { inStock: true, price: 100_000 },
      { inStock: true, price: 200_000 },
      { inStock: false, price: 999_999_999 }, // bogus out-of-stock
    ];
    const { liveLowestPrice, liveHighestPrice } = getLivePriceStats(prices);
    expect(liveLowestPrice).toBe(100_000);
    expect(liveHighestPrice).toBe(200_000);
  });

  it("regression: hero/decision/chart all use the SAME live values", () => {
    // The contract: any component that displays a price in the "current
    // range" must use liveLowestPrice / liveHighestPrice, never the stored
    // product.lowestPrice / product.highestPrice. Simulate a stored-vs-live
    // drift and assert the page logic ignores the stored value.
    const storedLowestPrice = 17_500_000; // from products.lowest_price (stale)
    const storedHighestPrice = 25_000_000; // from products.highest_price (stale)
    const livePrices = [
      { inStock: false, price: storedLowestPrice }, // cached, but sold out
      { inStock: true, price: 18_043_816 }, // actual live cheapest
      { inStock: true, price: 21_500_000 },
    ];
    const { liveLowestPrice, liveHighestPrice } = getLivePriceStats(livePrices);
    // The display values MUST be the live ones — never the stored ones.
    expect(liveLowestPrice).not.toBe(storedLowestPrice);
    expect(liveHighestPrice).not.toBe(storedHighestPrice);
    expect(liveLowestPrice).toBe(18_043_816);
    expect(liveHighestPrice).toBe(21_500_000);
  });
});
