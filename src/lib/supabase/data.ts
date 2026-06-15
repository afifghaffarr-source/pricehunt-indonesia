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
 * Fetch price history (chart data) for a product, merged from two sources.
 *
 * Sources:
 *  1. `price_history` (legacy) — dense data: 1 row per (product, marketplace, day)
 *     Covers 7/64 products (legacy scraper data, ~30 days × 6 marketplaces)
 *  2. `price_snapshots` (new) — sparse data: 1 row per offer per capture
 *     Covers 44/64 products (new ingestion pipeline)
 *
 * Both are merged into a single `PriceHistoryPoint[]` shape:
 *   { date, prices: { marketplaceName: price } }
 *
 * P7: replaces the old `price_history` PostgREST embed which only saw
 * legacy data — products with new scraper data had NO chart.
 *
 * Performance: 2 queries. With 33 dates × 6 marketplaces = 200 rows per
 * source. Sub-200ms in practice.
 */
export async function fetchPriceHistoryByProductId(
  productId: string
): Promise<PriceHistoryPoint[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();

  // Query 1: legacy price_history (1 row per product+marketplace+date)
  const phPromise = supabase
    .from("price_history")
    .select(`
      product_id, marketplace_id, price, recorded_at,
      marketplaces(name)
    `)
    .eq("product_id", productId);

  // Query 2: new price_snapshots joined to offers for product_id
  // (PostgREST FK chain: price_snapshots -> offers -> product_id)
  const psPromise = supabase
    .from("price_snapshots")
    .select(`
      current_price, captured_at,
      offers!inner(product_id, marketplace_id, marketplaces(name))
    `)
    .eq("offers.product_id", productId);

  const [phResult, psResult] = await Promise.all([phPromise, psPromise]);

  if (phResult.error) console.error("price_history query failed:", phResult.error);
  if (psResult.error) console.error("price_snapshots query failed:", psResult.error);

  // Merge by date
  const byDate: Record<string, PriceHistoryPoint> = {};

  // Process legacy price_history
  for (const row of phResult.data || []) {
    const date = (row.recorded_at as string).split("T")[0];
    const mpRaw = row.marketplaces;
    const mpName = extractMarketplaceName(mpRaw);
    const price = row.price as number;

    if (!byDate[date]) {
      byDate[date] = { date, prices: {} as Record<Marketplace, number | null> };
    }
    byDate[date].prices[mpName as Marketplace] = price;
  }

  // Process new price_snapshots
  for (const row of psResult.data || []) {
    const date = ((row.captured_at as string) || "").split("T")[0];
    const offerRaw = row.offers;
    const o = Array.isArray(offerRaw) ? offerRaw[0] : offerRaw;
    if (!date || !o) continue;

    const mpName = extractMarketplaceName((o as { marketplaces: unknown }).marketplaces);
    const price = row.current_price as number;

    if (!byDate[date]) {
      byDate[date] = { date, prices: {} as Record<Marketplace, number | null> };
    }
    // Don't overwrite legacy data — it's denser
    if (byDate[date].prices[mpName as Marketplace] == null) {
      byDate[date].prices[mpName as Marketplace] = price;
    }
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
