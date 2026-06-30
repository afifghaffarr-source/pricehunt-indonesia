/**
 * Product data layer — reads product + offer data from Supabase.
 * Extracted from src/lib/supabase/data.ts during Phase C refactor.
 */
import { createClient, hasSupabaseEnv } from "./client";
import type { Product } from "@/lib/types";
import type { ProductVariant } from "@/types/product-types";
import {
  transformProduct,
  transformPrices,
  escapeILIKEPattern,
} from "./transforms";
import { fetchPricesByProductIds, fetchPriceHistoryByProductId } from "./prices";
import {
  getDefaultVariantForProduct,
  listVariantsForProduct,
  fetchVariantsByIds,
} from "./product-variants";

/**
 * Phase 4 — Variant filter for the search results.
 *
 * Each axis is an array of acceptable values. Multiple values within
 * an axis are OR-ed (storage: ["256GB", "512GB"] matches EITHER); the
 * axes themselves are AND-ed (storage: ["256GB"] + color: ["Midnight"]
 * matches BOTH). A missing axis key is treated as "no filter on this
 * axis". An empty array is treated as "no match allowed on this axis"
 * (the filter would drop every offer) — callers should pass `undefined`
 * instead of `[]` when no filter is needed.
 */
export interface VariantFilter {
  storage?: string[];
  color?: string[];
  connectivity?: string[];
}

/**
 * Phase 4 — Distinct variant values that exist in the result set.
 *
 * Powers the chip-group UI: only chip values that appear in at least
 * one offer's variant are rendered. No counts (out of scope; see brief).
 */
export interface VariantValues {
  storage: string[];
  color: string[];
  connectivity: string[];
}

const EMPTY_VARIANT_VALUES: VariantValues = {
  storage: [],
  color: [],
  connectivity: [],
};

/**
 * Phase 3: list all variants for a product (ordered default-first).
 *
 * Thin wrapper around `listVariantsForProduct` so the call site in the
 * product page can go through the same `data` barrel as the rest of its
 * product reads. Returns [] if the product has no variants (which should
 * not happen post-Phase 1 backfill but is defended against).
 */
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  return listVariantsForProduct(productId);
}

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

  // Query 2 + 3 in parallel: prices + history. T7 adds the default variant
  // (Phase 1 plumbing: surfaces `defaultVariant` on the returned product so
  // the /product/[slug] page can read it, but the picker UI is Phase 3).
  const [pricesByProduct, priceHistory, defaultVariant] = await Promise.all([
    fetchPricesByProductIds([product.id as string]),
    fetchPriceHistoryByProductId(product.id as string),
    getDefaultVariantForProduct(product.id as string),
  ]);

  const result = transformProduct(product);
  result.prices = transformPrices(pricesByProduct[product.id as string] || []);
  result.priceHistory = priceHistory;
  // Cast: `defaultVariant` is intentionally not on the global `Product`
  // type (kept out of `src/lib/types.ts` until Phase 3's picker UI lands
  // and the variant prop is scaled to the full Product surface).
  (result as unknown as { defaultVariant: ProductVariant | null }).defaultVariant = defaultVariant;

  return result;
}

/**
 * Search products with prices using the union view.
 * P7: same migration as `getProductsFromDB`.
 * P9 (audit 2026-06-17): returns `{ products, total }` so callers can
 * paginate with an accurate count. `total` is the count of products
 * matching the same DB-level filter (query + category) — independent
 * of the page slice. Uses a cheap head-only count query.
 *
 * Phase 4: optional `variantFilter` narrows the result set so each
 * product only surfaces offers matching the variant criteria. Products
 * with zero matching offers are dropped from the page. `total` reflects
 * the post-filter page count (cheap, no extra count query — the brief
 * accepts the simplification since the search page only paginates one
 * large page of 100 results). `variantValues` returns the distinct axis
 * values seen across the un-filtered offer set so the chip UI can
 * render only values that actually exist.
 */
export async function searchProductsFromDB(
  query: string,
  category?: string,
  limit = 50,
  offset = 0,
  variantFilter?: VariantFilter
): Promise<{ products: Product[]; total: number; variantValues: VariantValues }> {
  if (!hasSupabaseEnv()) {
    return { products: [], total: 0, variantValues: EMPTY_VARIANT_VALUES };
  }

  const supabase = await createClient();

  // Build the search filter once so the count + data queries stay in sync.
  const orFilter = (() => {
    if (!query) return null;
    const escapedQuery = escapeILIKEPattern(query);
    return `name.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`;
  })();

  // Count query (head-only, no row payload) — runs the SAME filter as the
  // data query so `total` is the true search match count.
  let countBuilder = supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  if (orFilter) countBuilder = countBuilder.or(orFilter);
  if (category) countBuilder = countBuilder.eq("category", category);
  const { count: totalRaw } = await countBuilder;
  const total = totalRaw ?? 0;

  // Data query with proper DB-level range pagination.
  let dataBuilder = supabase.from("products").select("*");
  if (orFilter) dataBuilder = dataBuilder.or(orFilter);
  if (category) dataBuilder = dataBuilder.eq("category", category);
  dataBuilder = dataBuilder
    .order("deal_score", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: products, error } = await dataBuilder;
  if (error || !products || products.length === 0) {
    return { products: [], total, variantValues: EMPTY_VARIANT_VALUES };
  }

  const productIds = products.map((p) => p.id as string);
  const pricesByProduct = await fetchPricesByProductIds(productIds);

  // Phase 4: resolve variant_id FKs on each offer to storage/color/
  // connectivity strings so we can compute (a) the chip group's
  // available values and (b) the per-product filtered price list.
  // Collect the unique variant_ids from ALL offers for these products
  // (pre-filter) so the chip group shows every possible value.
  const variantIdSet: string[] = [];
  const seenVariants = new Set<string>();
  for (const prices of Object.values(pricesByProduct)) {
    for (const pr of prices) {
      const vid = (pr as { variant_id?: string | null }).variant_id;
      if (vid && !seenVariants.has(vid)) {
        seenVariants.add(vid);
        variantIdSet.push(vid);
      }
    }
  }
  const variants = await fetchVariantsByIds(variantIdSet);
  const variantById = new Map<string, ProductVariant>();
  for (const v of variants) variantById.set(v.id, v);

  const variantValues = computeVariantValues(pricesByProduct, variantById);

  // Phase 4: short-circuit when no filter is applied (the common case).
  const isFilterActive = isVariantFilterActive(variantFilter);
  if (!isFilterActive) {
    const result = products.map((p) => {
      const product = transformProduct(p);
      const prices = pricesByProduct[p.id as string] || [];
      product.prices = transformPrices(prices);
      return product;
    });
    return { products: result, total, variantValues };
  }

  // Phase 4: post-filter the per-product price lists and drop products
  // with zero matching offers.
  const filteredProducts: Product[] = [];
  for (const p of products) {
    const product = transformProduct(p);
    const prices = pricesByProduct[p.id as string] || [];
    const filteredPrices = prices.filter((pr) =>
      offerMatchesVariantFilter(pr, variantById, variantFilter!),
    );
    if (filteredPrices.length === 0) continue;
    product.prices = transformPrices(filteredPrices);
    filteredProducts.push(product);
  }
  return { products: filteredProducts, total: filteredProducts.length, variantValues };
}

/**
 * True when the filter object has at least one non-empty axis array.
 * Missing/empty axes are treated as "no constraint".
 */
function isVariantFilterActive(filter: VariantFilter | undefined): boolean {
  if (!filter) return false;
  if (filter.storage && filter.storage.length > 0) return true;
  if (filter.color && filter.color.length > 0) return true;
  if (filter.connectivity && filter.connectivity.length > 0) return true;
  return false;
}

/**
 * Compute the distinct axis values present across all offers for the
 * given product set. Returns sorted arrays (de-duplicated) so the chip
 * UI renders deterministically. Null-variant offers (legacy pre-Phase 1
 * data) are ignored — the chip group only shows values with explicit
 * axis metadata.
 */
function computeVariantValues(
  pricesByProduct: Record<string, Record<string, unknown>[]>,
  variantById: Map<string, ProductVariant>,
): VariantValues {
  const storage = new Set<string>();
  const color = new Set<string>();
  const connectivity = new Set<string>();
  for (const prices of Object.values(pricesByProduct)) {
    for (const pr of prices) {
      const vid = (pr as { variant_id?: string | null }).variant_id;
      if (!vid) continue;
      const v = variantById.get(vid);
      if (!v) continue;
      if (v.storage) storage.add(v.storage);
      if (v.color) color.add(v.color);
      if (v.connectivity) connectivity.add(v.connectivity);
    }
  }
  const sortStr = (a: string, b: string) => a.localeCompare(b);
  return {
    storage: Array.from(storage).sort(sortStr),
    color: Array.from(color).sort(sortStr),
    connectivity: Array.from(connectivity).sort(sortStr),
  };
}

/**
 * Decide whether a single offer's variant matches the active filter.
 * Null-variant offers and missing-variant offers are excluded as soon
 * as ANY filter axis is active (we don't have axis metadata to compare
 * against, so we treat them as non-matching by default).
 */
function offerMatchesVariantFilter(
  offer: Record<string, unknown>,
  variantById: Map<string, ProductVariant>,
  filter: VariantFilter,
): boolean {
  const vid = (offer as { variant_id?: string | null }).variant_id;
  if (!vid) return false;
  const v = variantById.get(vid);
  if (!v) return false;
  if (filter.storage && filter.storage.length > 0) {
    if (!v.storage || !filter.storage.includes(v.storage)) return false;
  }
  if (filter.color && filter.color.length > 0) {
    if (!v.color || !filter.color.includes(v.color)) return false;
  }
  if (filter.connectivity && filter.connectivity.length > 0) {
    if (!v.connectivity || !filter.connectivity.includes(v.connectivity)) return false;
  }
  return true;
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
