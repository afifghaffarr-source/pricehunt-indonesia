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
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    category: row.category as string,
    description: (row.description as string) || "",
    imageUrl: (row.image_url as string) || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
    prices: [],
    priceHistory: [],
    lowestPrice: (row.lowest_price as number) || 0,
    highestPrice: (row.highest_price as number) || 0,
    averagePrice: (row.average_price as number) || 0,
    dealScore: (row.deal_score as number) || 0,
    aiVerdict: (row.ai_verdict as string) || "",
    specs: (row.specs as Record<string, string>) || {},
  };
}

function transformPrices(rows: Record<string, unknown>[]): MarketplacePrice[] {
  return rows.map((row) => {
    const mp = row.marketplaces as Record<string, unknown> | null;
    return {
      marketplace: (mp?.name as Marketplace) || "tokopedia",
      price: row.price as number,
      url: (row.url as string) || "",
      seller: (row.seller as string) || "",
      sellerRating: Number(row.seller_rating) || 0,
      inStock: row.in_stock as boolean,
      shippingCost: (row.shipping_cost as number) || 0,
      lastUpdated: (row.last_updated as string) || new Date().toISOString(),
    };
  });
}

function transformPriceHistory(rows: Record<string, unknown>[]): PriceHistoryPoint[] {
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
 * ✅ OPTIMIZED: Get products with prices in a single query using JOIN
 * Reduced from 2 queries to 1 query
 * 
 * @param limit - Optional limit for pagination (default: 50)
 * @param offset - Optional offset for pagination (default: 0)
 */
export async function getProductsFromDB(limit = 50, offset = 0): Promise<Product[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  
  // ✅ Use JOIN to get products with their prices in ONE query
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      prices(
        *,
        marketplaces(name, display_name, color)
      )
    `)
    .order("deal_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !products) return [];

  return products.map((p) => {
    const product = transformProduct(p);
    // Prices are already nested from the join
    product.prices = transformPrices((p.prices as Record<string, unknown>[]) || []);
    return product;
  });
}

/**
 * ✅ OPTIMIZED: Get single product with prices and history using JOINs
 * Reduced from 3 queries to 1 query with multiple joins
 */
export async function getProductBySlugFromDB(slug: string): Promise<Product | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();

  // ✅ Use JOIN to get product with prices and history in ONE query
  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      prices(
        *,
        marketplaces(name, display_name, color)
      ),
      price_history(
        *,
        marketplaces(name)
      )
    `)
    .eq("slug", slug)
    .single();

  if (error || !product) return null;

  const result = transformProduct(product);
  result.prices = transformPrices((product.prices as Record<string, unknown>[]) || []);
  result.priceHistory = transformPriceHistory((product.price_history as Record<string, unknown>[]) || []);

  return result;
}

/**
 * ✅ OPTIMIZED: Search products with prices in a single query using JOIN
 * Reduced from 2 queries to 1 query
 * 
 * @param limit - Optional limit for pagination (default: 50)
 * @param offset - Optional offset for pagination (default: 0)
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
    .select(`
      *,
      prices(
        *,
        marketplaces(name, display_name, color)
      )
    `);

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
  if (error || !products) return [];

  return products.map((p) => {
    const product = transformProduct(p);
    product.prices = transformPrices((p.prices as Record<string, unknown>[]) || []);
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
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("price_alerts")
    .select("id, target_price, is_active")
    .eq("user_id", userId)
    .eq("product_id", productId);

  return data || [];
}
