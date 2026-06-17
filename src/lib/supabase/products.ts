/**
 * Product data layer — reads product + offer data from Supabase.
 * Extracted from src/lib/supabase/data.ts during Phase C refactor.
 */
import { createClient, hasSupabaseEnv } from "./client";
import type { Product } from "@/lib/types";
import {
  transformProduct,
  transformPrices,
  escapeILIKEPattern,
} from "./transforms";
import { fetchPricesByProductIds, fetchPriceHistoryByProductId } from "./prices";

/**
 * Get offers with trust metadata for a product.
 * Returns real confidence scores, validation status, source info.
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
    const marketplaceData = offer.marketplaces as
      | { name: string }
      | { name: string }[]
      | null;
    const marketplaceName = Array.isArray(marketplaceData)
      ? marketplaceData[0]?.name
      : marketplaceData?.name;

    return {
      id: offer.id,
      marketplace: marketplaceName || "unknown",
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
 * Get products with prices using the union view.
 *
 * P7: switched from PostgREST FK embed of `prices(...)` to a single
 * `product_prices_view` query, so products with data only in `offers`
 * also surface prices.
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
 * Get a single product with prices and history.
 * P7: prices from `product_prices_view` (union offers+prices).
 * History from `fetchPriceHistoryByProductId`.
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
 * Search products with prices using the union view.
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
 * Get distinct categories.
 * Loads category column for all products; result is cached and small.
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
