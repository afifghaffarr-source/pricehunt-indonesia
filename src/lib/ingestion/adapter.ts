/**
 * Adapter: `offers` (post-114 schema) → `prices` (legacy component shape).
 *
 * Why this exists — A-002 audit finding (2026-06-14): the codebase had
 * two parallel price tables. `prices` (72 rows, legacy) was read by the
 * deals/scrape/products/ai-advisor routes, while `offer-snapshot`
 * (ingestion) wrote to `offers` (165 rows, new schema). The two never
 * converged — UI deal scores & AI verdicts were computed from stale
 * `prices` rows, and newly-ingested offers were invisible to the
 * public surface.
 *
 * Phase 1 of the migration: read-side routes switch to `offers` but
 * expose the existing PriceView shape so components don't need to
 * change. Once every consumer is on the native `offers` shape, this
 * adapter can be deleted.
 *
 * Mapping:
 *   current_price    -> price
 *   stock_status     -> in_stock (boolean: in_stock|low_stock|limited|pre_order = true)
 *   seller_name      -> seller
 *   seller_rating    -> seller_rating
 *   shipping_estimate-> shipping_cost
 *   last_checked_at  -> last_updated
 *   url              -> url
 *   marketplace_id   -> marketplace_id
 *   marketplaces[]   -> marketplaces[] (relayed as-is)
 */

export interface OfferRow {
  id: string;
  current_price: number | null;
  stock_status: string | null;
  is_active?: boolean | null;
  seller_name: string | null;
  seller_rating: number | null;
  shipping_estimate: number | null;
  last_checked_at: string | null;
  url: string | null;
  marketplace_id: string;
  // PostgREST returns single-FK as object, multi-FK as array. Adapter
  // normalizes both to an array.
  marketplaces?: { name: string; display_name: string } | Array<{ name: string; display_name: string }> | null;
}

export interface PriceView {
  id: string;
  price: number;
  seller: string | null;
  seller_rating: number | null;
  in_stock: boolean;
  marketplace_id: string;
  marketplaces: Array<{ name: string; display_name: string }>;
  url: string | null;
  shipping_cost: number | null;
  last_updated: string | null;
}

const KNOWN_IN_STOCK = new Set([
  "in_stock",
  "low_stock",
  "limited",
  "pre_order",
]);

const KNOWN_OUT_OF_STOCK = new Set([
  "out_of_stock",
]);

/**
 * Treat an offer as in-stock when:
 *  - is_active is true (or unknown — most legacy data defaults true), AND
 *  - stock_status is one of the known "in stock" values, OR is unknown
 *    (collector often writes "unknown" when it can't detect; until
 *    collector stock detection improves, treat unknown as in-stock so
 *    ingestion data still shows up in deals).
 *
 * Out-of-stock: stock_status explicitly "out_of_stock" (regardless of
 * is_active), or is_active explicitly false.
 */
export function isOfferInStock(
  stockStatus: string | null | undefined,
  isActive: boolean | null | undefined = true,
): boolean {
  if (isActive === false) return false;
  if (!stockStatus) return true; // null/undefined treated as in-stock
  if (KNOWN_OUT_OF_STOCK.has(stockStatus)) return false;
  if (KNOWN_IN_STOCK.has(stockStatus)) return true;
  return true; // 'unknown' or any unrecognized value: treat as in-stock
}

export function toPriceView(offer: OfferRow): PriceView {
  // PostgREST returns single-FK relations as objects, multi-FK as arrays.
  // Normalize to array so downstream code (and component types) can use
  // a consistent `marketplaces[0]` access pattern.
  const mp = offer.marketplaces;
  const marketplaces: Array<{ name: string; display_name: string }> = Array.isArray(mp)
    ? mp
    : mp
      ? [mp as { name: string; display_name: string }]
      : [];

  return {
    id: offer.id,
    price: offer.current_price ?? 0,
    seller: offer.seller_name,
    seller_rating: offer.seller_rating,
    in_stock: isOfferInStock(offer.stock_status, offer.is_active),
    marketplace_id: offer.marketplace_id,
    marketplaces,
    url: offer.url,
    shipping_cost: offer.shipping_estimate,
    last_updated: offer.last_checked_at,
  };
}

export function toPriceViews(offers: OfferRow[]): PriceView[] {
  return offers.map(toPriceView);
}
