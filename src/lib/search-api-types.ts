/**
 * Shape of items in the `/api/search` response.
 *
 * The search endpoint returns both camelCase and snake_case variants
 * for fields because the API serves multiple internal consumers (some
 * generated from Supabase Row types, some from legacy mock data). The
 * client picks whichever is present. All fields are optional here
 * except `id`, `slug`, `name`, and `category` which are required
 * for any usable product row.
 *
 * Keep in sync with `src/app/api/search/route.ts` if the API surface
 * changes.
 */
export interface ApiProductSearchResult {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string | null;
  // Image: API may return either form
  imageUrl?: string | null;
  image_url?: string | null;
  // Price history: API may return either form
  priceHistory?: unknown[] | null;
  price_history?: unknown[] | null;
  // Aggregate stats
  lowestPrice?: number | null;
  lowest_price?: number | null;
  highestPrice?: number | null;
  highest_price?: number | null;
  averagePrice?: number | null;
  average_price?: number | null;
  dealScore?: number | null;
  deal_score?: number | null;
  aiVerdict?: string | null;
  ai_verdict?: string | null;
  specs?: Record<string, string> | null;
  // Nested price list
  prices?: ApiMarketplacePriceSearchResult[] | null;
}

export interface ApiMarketplacePriceSearchResult {
  // Marketplace can be a string ID or a nested marketplace object
  marketplace?: string | null;
  marketplaces?: { name: string } | null;
  price: number;
  url: string;
  seller?: string | null;
  sellerRating?: number | null;
  seller_rating?: number | null;
  inStock?: boolean | null;
  in_stock?: boolean | null;
  shippingCost?: number | null;
  shipping_cost?: number | null;
  lastUpdated?: string | null;
  last_updated?: string | null;
}
