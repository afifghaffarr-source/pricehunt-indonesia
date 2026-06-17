/**
 * Pure helper: calculate price statistics from product history.
 *
 * Extracted from src/app/product/[slug]/page.tsx (was a 44-line inline function).
 * Pure: no I/O, no React, easy to unit test.
 */

export interface PriceHistoryPoint {
  date: string;
  prices: Record<string, number | null>;
}

export interface PriceStatsInput {
  priceHistory: PriceHistoryPoint[];
}

export interface PriceStats {
  median30Day: number | undefined;
  median90Day: number | undefined;
  lowestHistoricalPrice: number | undefined;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function extractValidPrices(point: PriceHistoryPoint): number[] {
  return Object.values(point.prices).filter((p): p is number => p !== null);
}

function median(sortedArr: number[]): number | undefined {
  if (sortedArr.length === 0) return undefined;
  const mid = Math.floor(sortedArr.length / 2);
  return sortedArr.length % 2 === 0
    ? (sortedArr[mid - 1] + sortedArr[mid]) / 2
    : sortedArr[mid];
}

/**
 * Calculate price statistics from product history:
 * - median30Day: median of all in-stock prices from last 30 days
 * - median90Day: median of all in-stock prices from last 90 days
 * - lowestHistoricalPrice: minimum across all history
 *
 * Returns undefined for any stat that has no data.
 */
export function calculatePriceStats(
  input: PriceStatsInput,
  now: Date = new Date()
): PriceStats {
  if (input.priceHistory.length === 0) {
    return {
      median30Day: undefined,
      median90Day: undefined,
      lowestHistoricalPrice: undefined,
    };
  }

  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY_MS);

  const prices30Day = input.priceHistory
    .filter((h) => new Date(h.date) >= thirtyDaysAgo)
    .flatMap(extractValidPrices)
    .sort((a, b) => a - b);

  const prices90Day = input.priceHistory
    .filter((h) => new Date(h.date) >= ninetyDaysAgo)
    .flatMap(extractValidPrices)
    .sort((a, b) => a - b);

  const allPrices = input.priceHistory.flatMap(extractValidPrices);

  return {
    median30Day: median(prices30Day),
    median90Day: median(prices90Day),
    lowestHistoricalPrice: allPrices.length > 0 ? Math.min(...allPrices) : undefined,
  };
}
