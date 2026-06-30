/**
 * Pure transform helpers for Supabase row data.
 * No DB, no React, no I/O — fully unit-testable.
 */
import type { Product, MarketplacePrice, PriceHistoryPoint, Marketplace } from "@/lib/types";

/**
 * Escape special characters for PostgreSQL ILIKE pattern matching.
 * Prevents SQL injection and pattern injection attacks.
 */
export function escapeILIKEPattern(value: string): string {
  return value
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/%/g, "\\%")   // Escape % wildcard
    .replace(/_/g, "\\_");  // Escape _ wildcard
}

/**
 * Transform a product row from Supabase into the app's Product type.
 * Calculates lowest/highest/average price + deal score from joined prices
 * when stored values are 0/null.
 */
export function transformProduct(row: Record<string, unknown>): Product {
  // Calculate prices from joined data if available
  const pricesData = (row.prices as Record<string, unknown>[]) || [];
  const inStockPrices = pricesData
    .filter((p) => p.in_stock === true && typeof p.price === "number" && p.price > 0)
    .map((p) => p.price as number);

  // Use stored values or calculate from prices
  const lowestPrice = (row.lowest_price as number) || (inStockPrices.length > 0 ? Math.min(...inStockPrices) : 0);
  const highestPrice = (row.highest_price as number) || (inStockPrices.length > 0 ? Math.max(...inStockPrices) : 0);
  const averagePrice = (row.average_price as number) || (inStockPrices.length > 0 ? Math.round(inStockPrices.reduce((a, b) => a + b, 0) / inStockPrices.length) : 0);

  // Calculate deal score if not stored
  let dealScore = (row.deal_score as number) || 0;
  if (dealScore === 0 && inStockPrices.length > 0) {
    const priceRange = highestPrice - lowestPrice;
    const hasVariation = priceRange > 0;
    const marketplaceCount = inStockPrices.length;

    // Base score from marketplace availability (0-40)
    let score = Math.min(marketplaceCount * 8, 40);

    // Bonus for price variation (0-30) - more variation = better deals possible
    if (hasVariation && lowestPrice > 0) {
      const variationPercent = (priceRange / lowestPrice) * 100;
      score += Math.min(Math.round(variationPercent), 30);
    }

    // Bonus for competitive pricing (0-30)
    if (marketplaceCount >= 3) {
      score += 20;
    } else if (marketplaceCount >= 2) {
      score += 10;
    }

    dealScore = Math.min(score, 100);
  }

  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    category: row.category as string,
    description: (row.description as string) || "",
    imageUrl: (row.image_url as string) || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
    prices: [],
    priceHistory: [],
    lowestPrice,
    highestPrice,
    averagePrice,
    dealScore,
    aiVerdict: (row.ai_verdict as string) || "",
    specs: (row.specs as Record<string, string>) || {},
  };
}

/**
 * Transform a list of Supabase price rows into the app's MarketplacePrice[].
 */
export function transformPrices(rows: Record<string, unknown>[]): MarketplacePrice[] {
  return rows.map((row) => ({
    marketplace: ((row.marketplace_name as string) || "tokopedia") as Marketplace,
    price: row.current_price as number,
    url: (row.url as string) || "",
    seller: (row.seller_name as string) || "",
    sellerRating: Number(row.seller_rating) || 0,
    sellerReviewCount: Number(row.seller_review_count) || undefined,
    inStock: row.stock_status !== "out_of_stock",
    shippingCost: (row.shipping_estimate as number) || 0,
    lastUpdated: (row.last_checked_at as string) || new Date().toISOString(),
    isOfficialStore: Boolean(row.is_official_store),
    // Phase 3: variant_id exposed by product_prices_view (migration 139).
    // Null for legacy offers that have not yet been linked to a variant.
    variantId: (row.variant_id as string | null | undefined) ?? null,
  }));
}

/**
 * Transform a list of legacy `price_history` rows into the unified
 * `PriceHistoryPoint[]` shape.
 *
 * NOTE: P7 legacy transformer kept for backward compat. New code should
 * use `fetchPriceHistoryByProductId` (in prices.ts) which merges both
 * `price_history` and `price_snapshots` via offers.
 */
export function transformPriceHistory(rows: Record<string, unknown>[]): PriceHistoryPoint[] {
  const byDate: Record<string, PriceHistoryPoint> = {};

  for (const row of rows) {
    const date = (row.recorded_at as string).split("T")[0];
    const mp = row.marketplaces as Record<string, unknown> | null;
    const mpName = (mp?.name as Marketplace) || "tokopedia";

    if (!byDate[date]) {
      byDate[date] = {
        date,
        prices: {} as Record<Marketplace, number | null>,
      };
    }
    byDate[date].prices[mpName] = row.price as number;
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Extract marketplace name from a Supabase FK embed that can be either
 * a single object, an array of objects, or null.
 */
export function extractMarketplaceName(raw: unknown): string {
  if (!raw) return "unknown";
  if (Array.isArray(raw)) {
    const first = raw[0] as { name?: string } | undefined;
    return first?.name || "unknown";
  }
  if (typeof raw === "object" && "name" in raw) {
    return (raw as { name: string }).name || "unknown";
  }
  return "unknown";
}
