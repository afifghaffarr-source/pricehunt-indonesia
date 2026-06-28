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

// ============================================================================
// Placeholder URL handling (v1.5.1)
// ============================================================================
// The 36 offers inserted by `backfill_orphan_offers.py` have URL set to
// `/product/<slug>` — an internal placeholder, not a real marketplace link.
// Serving that to the public leaks the internal slug mapping and the link
// 404s if a user clicks it. We rewrite it to a real marketplace search URL
// at the adapter boundary so the DB stays untouched (ingestion API, crawl
// target generation, and admin tooling all still depend on the raw value).

// v1.5.1: match BOTH `<any-domain>/product/<slug>` (real DB format
// `https://<marketplace>.co.id/product/<slug>` from backfill) AND relative
// `/product/<slug>` (some manual entries). The domain prefix is optional.
const PLACEHOLDER_URL_RE = /^(?:https?:\/\/[^/]+)?\/product\/([a-z0-9][a-z0-9-]*?)\/?$/i;

export function isPlaceholderOfferUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && PLACEHOLDER_URL_RE.test(url);
}

function extractSlugFromPlaceholder(url: string): string {
  const match = url.match(PLACEHOLDER_URL_RE);
  return match ? match[1] : "";
}

/**
 * Build a real marketplace search URL for the given slug. Each marketplace
 * has its own search URL convention; we deliberately use a search page (not
 * a deep link to a specific product) because the original backfill did not
 * record the actual product ID on the source marketplace.
 */
export function buildMarketplaceSearchUrl(
  marketplaceName: string | null | undefined,
  slug: string,
): string {
  const q = encodeURIComponent(slug.replace(/-/g, " "));
  switch (marketplaceName) {
    case "tokopedia":
      return `https://www.tokopedia.com/search?q=${q}`;
    case "shopee":
      return `https://shopee.co.id/search?keyword=${q}`;
    case "bukalapak":
      return `https://www.bukalapak.com/products?search%5Bkeywords%5D=${q}`;
    case "lazada":
      return `https://www.lazada.co.id/catalog/?q=${q}`;
    case "blibli":
      return `https://www.blibli.com/cari?q=${q}`;
    case "tiktok":
      return `https://shop.tiktok.com/search?q=${q}`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

/**
 * Resolve an offer URL for public consumption. If the URL is the internal
 * `/product/<slug>` placeholder, returns a real marketplace search URL;
 * otherwise returns the URL as-is (including null when missing).
 */
function resolvePublicOfferUrl(
  url: string | null | undefined,
  marketplaceName: string | null | undefined,
): string | null {
  if (!url) return null;
  if (!isPlaceholderOfferUrl(url)) return url;
  const slug = extractSlugFromPlaceholder(url);
  if (!slug) return null;
  return buildMarketplaceSearchUrl(marketplaceName, slug);
}

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

  // v1.5.1: rewrite internal placeholder URLs (`/product/<slug>`) to real
  // marketplace search URLs at the adapter boundary. The DB column still
  // holds the placeholder for ingestion/crawl/admin tooling.
  const marketplaceName = marketplaces[0]?.name ?? null;

  return {
    id: offer.id,
    price: offer.current_price ?? 0,
    seller: offer.seller_name,
    seller_rating: offer.seller_rating,
    in_stock: isOfferInStock(offer.stock_status, offer.is_active),
    marketplace_id: offer.marketplace_id,
    marketplaces,
    url: resolvePublicOfferUrl(offer.url, marketplaceName),
    shipping_cost: offer.shipping_estimate,
    last_updated: offer.last_checked_at,
  };
}

export function toPriceViews(offers: OfferRow[]): PriceView[] {
  return offers.map(toPriceView);
}
