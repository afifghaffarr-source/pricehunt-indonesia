/* eslint-disable @typescript-eslint/no-explicit-any */
// Pre-existing `any` usages; tracked under Phase 5 type-safety backlog.
import { createClient, hasSupabaseEnv } from "./client";
import type { Product, MarketplacePrice, PriceHistoryPoint, Marketplace } from "@/lib/types";

/**
 * Escape special characters for PostgreSQL ILIKE pattern matching
 * Prevents SQL injection and pattern injection attacks
 */
function escapeILIKEPattern(value: string): string {
  return value
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/%/g, "\\%")   // Escape % wildcard
    .replace(/_/g, "\\_");  // Escape _ wildcard
}

function transformProduct(row: Record<string, unknown>): Product {
  // Calculate prices from joined data if available
  const pricesData = (row.prices as Record<string, unknown>[]) || [];
  const inStockPrices = pricesData
    .filter((p) => p.in_stock === true && typeof p.price === 'number' && p.price > 0)
    .map((p) => p.price as number);
  
  // Use stored values or calculate from prices
  const lowestPrice = (row.lowest_price as number) || (inStockPrices.length > 0 ? Math.min(...inStockPrices) : 0);
  const highestPrice = (row.highest_price as number) || (inStockPrices.length > 0 ? Math.max(...inStockPrices) : 0);
  const averagePrice = (row.average_price as number) || (inStockPrices.length > 0 ? Math.round(inStockPrices.reduce((a, b) => a + b, 0) / inStockPrices.length) : 0);
  
  // Calculate deal score if not stored
  let dealScore = (row.deal_score as number) || 0;
  if (dealScore === 0 && inStockPrices.length > 0) {
    // Simple deal score based on price variance and availability
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
      score += 20; // Multiple sellers = competitive
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

function transformPrices(rows: Record<string, unknown>[]): MarketplacePrice[] {
  return rows.map((row) => ({
    marketplace: ((row.marketplace_name as string) || "tokopedia") as Marketplace,
    price: row.current_price as number,
    url: (row.url as string) || "",
    seller: (row.seller_name as string) || "",
    sellerRating: Number(row.seller_rating) || 0,
    inStock: row.stock_status !== "out_of_stock",
    shippingCost: (row.shipping_estimate as number) || 0,
    lastUpdated: (row.last_checked_at as string) || new Date().toISOString(),
  }));
}

function transformPriceHistory(rows: Record<string, unknown>[]): PriceHistoryPoint[] {
  // P7: Legacy transformer kept for backward compat with other callers.
  // New code should use `fetchPriceHistoryByProductId` which merges
  // both `price_history` and `price_snapshots` via offers.
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _transformPriceHistoryKept = transformPriceHistory;

/**
 * Get offers with trust metadata for a product
 * Returns real confidence scores, validation status, and source info
 */
export async function getProductOffers(productId: string): Promise<Array<{
  id: string;
  marketplace: string;
  url: string;
  current_price: number;
  seller_name: string | null;
  stock_status: string;
  confidence_score: number;
  confidence_label: string;
  validation_status: string;
  last_checked_at: string;
  source: string;
  is_active: boolean;
}>> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();

  const { data: offers, error } = await supabase
    .from("offers")
    .select(`
      id,
      url,
      current_price,
      seller_name,
      stock_status,
      confidence_score,
      confidence_label,
      validation_status,
      last_checked_at,
      source,
      is_active,
      marketplaces(name)
    `)
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("current_price", { ascending: true });

  if (error || !offers) return [];

  return offers.map((offer) => {
    // Handle marketplace data (could be array or object depending on Supabase schema)
    const marketplaceData: any = offer.marketplaces;
    const marketplaceName = Array.isArray(marketplaceData)
      ? marketplaceData[0]?.name
      : marketplaceData?.name;

    return {
      id: offer.id,
      marketplace: (marketplaceName as string) || "unknown",
      url: offer.url,
      current_price: offer.current_price,
      seller_name: offer.seller_name,
      stock_status: offer.stock_status,
      confidence_score: offer.confidence_score,
      confidence_label: offer.confidence_label,
      validation_status: offer.validation_status,
      last_checked_at: offer.last_checked_at,
      source: offer.source,
      is_active: offer.is_active,
    };
  });
}

/**
 * Fetch prices from the union view for a list of product IDs.
 *
 * Uses `product_prices_view` (migration 125) which combines `offers` and
 * legacy `prices` so that ALL products — both new and old data sources —
 * show prices on public pages. Groups results by product_id for O(1)
 * merge in callers.
 *
 * P7: replaces the old PostgREST FK embed of `prices(...)` which only
 * saw legacy data and missed products whose only data is in `offers`.
 *
 * Performance: 1 query for N products. With 50 products/page and
 * 1-10 prices per product, returns 50-500 rows. Sub-100ms in practice.
 */
export async function fetchPricesByProductIds(
  productIds: string[]
): Promise<Record<string, Record<string, unknown>[]>> {
  if (!hasSupabaseEnv() || productIds.length === 0) return {};

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_prices_view")
    .select(`
      id, product_id, marketplace_id,
      current_price, seller_name, seller_rating,
      url, stock_status, shipping_estimate, last_checked_at,
      is_official_store, source, origin,
      marketplace_name, marketplace_display_name, marketplace_color
    `)
    .in("product_id", productIds)
    .eq("is_active", true);

  if (error || !data) return {};

  // Group by product_id
  const grouped: Record<string, Record<string, unknown>[]> = {};
  for (const row of data) {
    const pid = row.product_id as string;
    if (!grouped[pid]) grouped[pid] = [];
    grouped[pid].push(row as Record<string, unknown>);
  }
  return grouped;
}

/**
 * Fetch historical price stats (median30, median90, lowestHistorical) for
 * a batch of products, in a single query against `price_snapshots`.
 *
 * P7-Post: replaces the legacy `price_history` PostgREST embed that was
 * previously inlined in `/api/deals`. Used for deal score input stats.
 *
 * @param productIds - Array of product UUIDs to fetch stats for.
 * @param now - Reference "current date" for 30/90-day windows. Defaults to
 *   the current time. Pass an explicit date in tests for determinism.
 * @returns Map from productId -> { median30Day, median90Day, lowestHistoricalPrice }
 */
export async function fetchHistoricalStatsByProductIds(
  productIds: string[],
  now: Date = new Date()
): Promise<Record<string, { median30Day: number | null; median90Day: number | null; lowestHistoricalPrice: number | null }>> {
  const empty = (): { median30Day: number | null; median90Day: number | null; lowestHistoricalPrice: number | null } => ({
    median30Day: null,
    median90Day: null,
    lowestHistoricalPrice: null,
  });
  const out: Record<string, { median30Day: number | null; median90Day: number | null; lowestHistoricalPrice: number | null }> = {};
  for (const id of productIds) out[id] = empty();

  if (!hasSupabaseEnv() || productIds.length === 0) return out;

  const supabase = await createClient();

  // Fetch all snapshots for these products (no per-day filter — we
  // compute 30/90-day windows in JS since the row count is small
  // relative to a separate query per window).
  const { data, error } = await supabase
    .from("price_snapshots")
    .select(`
      current_price,
      captured_at,
      offers!inner(product_id)
    `)
    .in("offers.product_id", productIds);

  if (error) {
    console.error("fetchHistoricalStatsByProductIds query failed:", error);
    return out;
  }

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Accumulators per product
  const acc30: Record<string, number[]> = {};
  const acc90: Record<string, number[]> = {};
  const accAll: Record<string, number[]> = {};
  for (const id of productIds) {
    acc30[id] = [];
    acc90[id] = [];
    accAll[id] = [];
  }

  for (const row of data || []) {
    const offerRaw = row.offers;
    const o = Array.isArray(offerRaw) ? offerRaw[0] : offerRaw;
    if (!o) continue;
    const pid = (o as { product_id: string }).product_id;
    const capturedAt = new Date(row.captured_at as string);
    const price = row.current_price as number;
    if (!Number.isFinite(price)) continue;

    accAll[pid].push(price);
    if (capturedAt >= thirtyDaysAgo) acc30[pid].push(price);
    if (capturedAt >= ninetyDaysAgo) acc90[pid].push(price);
  }

  const median = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
  };

  for (const id of productIds) {
    out[id] = {
      median30Day: median(acc30[id]),
      median90Day: median(acc90[id]),
      lowestHistoricalPrice: accAll[id].length > 0 ? Math.min(...accAll[id]) : null,
    };
  }
  return out;
}

/**
 * Fetch price history (chart data) for a product from `price_snapshots`.
 *
 * P7-Post: replaced legacy `price_history` source with `price_snapshots`
 * (joined via offers for product_id filter). The legacy table was dropped
 * in migration 129. `price_snapshots` covers 48/64 products (~33 days
 * × 186 offers = 1,812 raw rows, 1,559 daily aggregates) — a strict
 * superset of the legacy 8-product data set.
 *
 * Returns unified `PriceHistoryPoint[]` shape:
 *   { date, prices: { marketplaceName: price } }
 *
 * Performance: 1 query. ~80ms for typical product (50-200 snapshots).
 */
export async function fetchPriceHistoryByProductId(
  productId: string
): Promise<PriceHistoryPoint[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();

  // Read from price_snapshots joined to offers (PostgREST FK chain:
  // price_snapshots -> offers -> product_id). marketplace name comes
  // from the nested `marketplaces` FK on offers.
  const { data, error } = await supabase
    .from("price_snapshots")
    .select(`
      current_price,
      captured_at,
      offers!inner(
        product_id,
        marketplace_id,
        marketplaces(name)
      )
    `)
    .eq("offers.product_id", productId);

  if (error) {
    console.error("price_snapshots query failed:", error);
    return [];
  }

  // Group by date + marketplace, taking the last (most recent) snapshot
  // per (date, marketplace) to deduplicate multiple captures per day.
  const byKey: Record<string, { date: string; mpName: string; capturedAt: string; price: number }> = {};

  for (const row of data || []) {
    const offerRaw = row.offers;
    const o = Array.isArray(offerRaw) ? offerRaw[0] : offerRaw;
    if (!o) continue;
    const date = ((row.captured_at as string) || "").split("T")[0];
    if (!date) continue;
    const mpName = extractMarketplaceName((o as { marketplaces: unknown }).marketplaces);
    const price = row.current_price as number;
    const capturedAt = row.captured_at as string;
    const key = `${date}::${mpName}`;
    const existing = byKey[key];
    // Keep the latest captured snapshot per (date, marketplace)
    if (!existing || capturedAt > existing.capturedAt) {
      byKey[key] = { date, mpName, capturedAt, price };
    }
  }

  // Fold into PriceHistoryPoint[] (one entry per date with prices keyed by marketplace)
  const byDate: Record<string, PriceHistoryPoint> = {};
  for (const { date, mpName, price } of Object.values(byKey)) {
    if (!byDate[date]) {
      byDate[date] = { date, prices: {} as Record<Marketplace, number | null> };
    }
    byDate[date].prices[mpName as Marketplace] = price;
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Helper: extract marketplace name from a Supabase FK embed that can be
 * either a single object, an array of objects, or null.
 */
function extractMarketplaceName(raw: unknown): string {
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

/**
 * ✅ OPTIMIZED: Get products with prices using the union view.
 * P7: switched from PostgREST FK embed of `prices(...)` to a single
 * `product_prices_view` query, so products with data only in `offers`
 * also surface prices.
 *
 * @param limit - Optional limit for pagination (default: 50)
 * @param offset - Optional offset for pagination (default: 0)
 */
export async function getProductsFromDB(limit = 50, offset = 0): Promise<Product[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();

  // Query 1: products (no embed — fetch prices separately from view)
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("deal_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !products || products.length === 0) return [];

  // Query 2: all prices for these products via union view
  const productIds = products.map((p) => p.id as string);
  const pricesByProduct = await fetchPricesByProductIds(productIds);

  return products.map((p) => {
    const product = transformProduct(p);
    const prices = pricesByProduct[p.id as string] || [];
    product.prices = transformPrices(prices);
    return product;
  });
}

/**
 * ✅ OPTIMIZED: Get single product with prices and history.
 * P7: prices now come from `product_prices_view` (union offers+prices).
 * History now comes from `fetchPriceHistoryByProductId` (union price_history
 * + price_snapshots via offers).
 */
export async function getProductBySlugFromDB(slug: string): Promise<Product | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();

  // Query 1: product (no embeds)
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !product) return null;

  // Query 2 + 3 in parallel: prices + history
  const [pricesByProduct, priceHistory] = await Promise.all([
    fetchPricesByProductIds([product.id as string]),
    fetchPriceHistoryByProductId(product.id as string),
  ]);

  const result = transformProduct(product);
  result.prices = transformPrices(pricesByProduct[product.id as string] || []);
  result.priceHistory = priceHistory;

  return result;
}

/**
 * ✅ OPTIMIZED: Search products with prices using the union view.
 * P7: same migration as `getProductsFromDB`.
 */
export async function searchProductsFromDB(
  query: string,
  category?: string,
  limit = 50,
  offset = 0
): Promise<Product[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();

  let queryBuilder = supabase
    .from("products")
    .select("*");

  if (query) {
    const escapedQuery = escapeILIKEPattern(query);
    queryBuilder = queryBuilder.or(
      `name.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`
    );
  }

  if (category) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  queryBuilder = queryBuilder
    .order("deal_score", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: products, error } = await queryBuilder;
  if (error || !products || products.length === 0) return [];

  const productIds = products.map((p) => p.id as string);
  const pricesByProduct = await fetchPricesByProductIds(productIds);

  return products.map((p) => {
    const product = transformProduct(p);
    const prices = pricesByProduct[p.id as string] || [];
    product.prices = transformPrices(prices);
    return product;
  });
}

/**
 * Get distinct categories
 * Note: This loads category column for all products, but it's cached and small
 */
export async function getCategoriesFromDB(): Promise<string[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("category")
    .order("category");

  if (!data) return [];
  return [...new Set(data.map((r) => r.category as string))];
}

export async function getUserWishlist(userId: string) {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select("id, product_id, created_at, products(id, slug, name, image_url, lowest_price, deal_score)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getUserAlerts(userId: string) {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .select("id, product_id, target_price, is_active, created_at, products(id, slug, name, image_url, lowest_price)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function isProductInWishlist(userId: string, productId: string): Promise<boolean> {
  if (!hasSupabaseEnv()) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  return !!data;
}

export async function getProductAlerts(userId: string, productId: string) {
// Pre-existing Supabase raw query typing (Phase 5). replace `any` usages with proper types.

  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("price_alerts")
    .select("id, target_price, is_active")
    .eq("user_id", userId)
    .eq("product_id", productId);

  return data || [];
}
