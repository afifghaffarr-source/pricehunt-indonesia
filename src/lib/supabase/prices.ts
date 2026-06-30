/**
 * Price data layer — reads price snapshots, history, and stats from Supabase.
 * Extracted from src/lib/supabase/data.ts during Phase C refactor.
 */
import { createClient, hasSupabaseEnv } from "./client";
import type { PriceHistoryPoint, Marketplace } from "@/lib/types";
import { extractMarketplaceName } from "./transforms";

/**
 * Fetch prices from the union view for a list of product IDs.
 *
 * Uses `product_prices_view` (migration 125) which combines `offers` and
 * legacy `prices` so ALL products (new + old data sources) show prices.
 * Groups results by product_id for O(1) merge in callers.
 *
 * P7: replaces the old PostgREST FK embed of `prices(...)` which only
 * saw legacy data and missed products whose only data is in `offers`.
 */
export async function fetchPricesByProductIds(
  productIds: string[]
): Promise<Record<string, Record<string, unknown>[]>> {
  if (!hasSupabaseEnv() || productIds.length === 0) return {};

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_prices_view")
    .select(`
      id, product_id, variant_id, marketplace_id,
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
 * P7-Post: replaces the legacy `price_history` PostgREST embed.
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
 * in migration 129.
 *
 * Returns unified `PriceHistoryPoint[]` shape: { date, prices: { marketplaceName: price } }
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
 * Per-variant price summary (Phase 7 — variant-aware stats).
 *
 * One row per variant for a product. Aggregated from `offers.current_price`
 * (the live snapshot). If the offer has no current_price (zero/null/NaN) it
 * is excluded from the min/max math so a stale zero doesn't poison the stats.
 *
 * `lastPrice` is the most recent in-stock offer's current_price (any
 * marketplace), used for the "last seen" cell in the variant stats table.
 *
 * Returned in the order Supabase returns them (no explicit sort here — the
 * caller should sort by `minPrice` asc to put the cheapest variant first).
 */
export interface VariantPriceStats {
  variantId: string;
  offerCount: number;
  inStockCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  lastPrice: number | null;
  lastUpdated: string | null;
}

const EMPTY_VARIANT_STATS: VariantPriceStats = {
  variantId: "",
  offerCount: 0,
  inStockCount: 0,
  minPrice: null,
  maxPrice: null,
  lastPrice: null,
  lastUpdated: null,
};

/**
 * Fetch per-variant price stats for a product.
 *
 * Single round-trip: pulls all active offers for the product, groups them
 * by `variant_id`, and computes per-variant aggregates in JS. Cheap because
 * products have at most ~100 offers in practice and the row count is well
 * within Supabase's row cap.
 *
 * Variants with zero offers are NOT returned (caller decides whether to
 * surface them as "no data" cards — for now the page only renders variants
 * that appear here).
 */
export async function fetchVariantPriceStats(
  productId: string,
): Promise<VariantPriceStats[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("offers")
    .select("id, variant_id, current_price, last_checked_at, stock_status")
    .eq("product_id", productId)
    .eq("is_active", true)
    .not("variant_id", "is", null);

  if (error || !data) return [];

  // Group by variant_id. The schema has FK CASCADE so deleted variants
  // can't appear here, but we still tolerate null (skipped above).
  const byVariant = new Map<string, {
    prices: number[];
    inStockPrices: number[];
    lastChecked: string | null;
  }>();

  for (const row of data) {
    const vid = row.variant_id as string | null;
    if (!vid) continue;
    const price = row.current_price as number | null;
    const checked = row.last_checked_at as string | null;
    const stock = row.stock_status as string | null;

    if (!byVariant.has(vid)) {
      byVariant.set(vid, { prices: [], inStockPrices: [], lastChecked: null });
    }
    const bucket = byVariant.get(vid)!;

    if (typeof price === "number" && Number.isFinite(price) && price > 0) {
      bucket.prices.push(price);
      if (stock === "in_stock") bucket.inStockPrices.push(price);
    }
    if (checked && (!bucket.lastChecked || checked > bucket.lastChecked)) {
      bucket.lastChecked = checked;
    }
  }

  const stats: VariantPriceStats[] = [];
  for (const [variantId, bucket] of byVariant) {
    stats.push({
      variantId,
      offerCount: bucket.prices.length,
      inStockCount: bucket.inStockPrices.length,
      minPrice: bucket.prices.length > 0 ? Math.min(...bucket.prices) : null,
      maxPrice: bucket.prices.length > 0 ? Math.max(...bucket.prices) : null,
      // "last price" = highest in-stock price (the most recent offer we have)
      // when no in-stock rows exist, fall back to the latest overall price.
      lastPrice:
        bucket.inStockPrices.length > 0
          ? Math.max(...bucket.inStockPrices)
          : bucket.prices.length > 0
            ? Math.max(...bucket.prices)
            : null,
      lastUpdated: bucket.lastChecked,
    });
  }
  return stats;
}

/**
 * Per-variant history point. Lighter than `PriceHistoryPoint` — the
 * variant-level line shows a single aggregated price (the cheapest in-stock
 * offer on that date) rather than a marketplace-keyed map.
 */
export interface VariantPricePoint {
  date: string;
  price: number;
}

/**
 * Fetch per-variant price history for a product.
 *
 * Returns `Record<variantId, VariantPricePoint[]>` where each array is
 * sorted oldest → newest. The shape is intentionally flat (no marketplace
 * axis) so the chart can render one line per variant. Empty variants are
 * omitted from the map.
 *
 * Algorithm: for each (date, variant) bucket we take the min
 * `current_price` across the active offers in stock. This is the same
 * metric shown in the stats table — keeps chart + stats in lockstep.
 *
 * `days` defaults to 30 to match the existing marketplace chart's lookback.
 */
export async function fetchVariantPriceHistory(
  productId: string,
  days: number = 30,
): Promise<Record<string, VariantPricePoint[]>> {
  if (!hasSupabaseEnv()) return {};
  const supabase = await createClient();

  // Compute cutoff once so the WHERE clause narrows the row scan.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data, error } = await supabase
    .from("price_snapshots")
    .select(`
      current_price,
      captured_at,
      offers!inner(
        product_id,
        variant_id,
        stock_status
      )
    `)
    .eq("offers.product_id", productId)
    .not("offers.variant_id", "is", null)
    .gte("captured_at", cutoff.toISOString());

  if (error) {
    console.error("price_snapshots variant history query failed:", error);
    return {};
  }

  // Group by (date, variantId) — keep the min in-stock price per bucket.
  const byKey = new Map<string, { date: string; variantId: string; price: number }>();
  for (const row of data || []) {
    const offerRaw = row.offers;
    const o = Array.isArray(offerRaw) ? offerRaw[0] : offerRaw;
    if (!o) continue;
    const variantId = (o as { variant_id: string | null }).variant_id;
    if (!variantId) continue;
    const stock = (o as { stock_status: string | null }).stock_status;
    // Only in-stock rows contribute to the line — out-of-stock offers
    // would distort the "what would I pay" story.
    if (stock !== "in_stock") continue;
    const price = row.current_price as number;
    if (!Number.isFinite(price) || price <= 0) continue;
    const capturedAt = row.captured_at as string;
    const date = capturedAt.split("T")[0];
    if (!date) continue;
    const key = `${date}::${variantId}`;
    const existing = byKey.get(key);
    if (!existing || price < existing.price) {
      byKey.set(key, { date, variantId, price });
    }
  }

  // Fold into per-variant arrays sorted oldest → newest.
  const byVariant: Record<string, VariantPricePoint[]> = {};
  for (const { date, variantId, price } of byKey.values()) {
    if (!byVariant[variantId]) byVariant[variantId] = [];
    byVariant[variantId].push({ date, price });
  }
  for (const arr of Object.values(byVariant)) {
    arr.sort((a, b) => a.date.localeCompare(b.date));
  }
  return byVariant;
}

// Re-export the empty stat helper so callers can use it as a default.
export { EMPTY_VARIANT_STATS };
