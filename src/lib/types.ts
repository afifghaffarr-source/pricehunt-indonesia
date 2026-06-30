export type Marketplace =
  | "tokopedia"
  | "shopee"
  | "bukalapak"
  | "lazada"
  | "blibli"
  | "tiktok";

export interface MarketplacePrice {
  marketplace: Marketplace;
  price: number;
  url: string;
  seller: string;
  sellerRating: number;
  sellerReviewCount?: number;
  inStock: boolean;
  shippingCost: number;
  lastUpdated: string;
  isOfficialStore?: boolean;
  /**
   * Phase 3: FK to product_variants.id. Null for legacy offers (pre-Phase 1
   * backfill) that have not yet been linked. When the user filters the
   * product page by a specific variant, this field is what we match on.
   */
  variantId?: string | null;
}

export interface PriceHistoryPoint {
  date: string;
  prices: Record<Marketplace, number | null>;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  prices: MarketplacePrice[];
  priceHistory: PriceHistoryPoint[];
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  dealScore: number;
  aiVerdict: string;
  specs: Record<string, string>;
}

export interface SearchResult {
  products: Product[];
  totalResults: number;
  query: string;
}

export interface DealScoreInfo {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export interface FilterOptions {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  marketplace?: Marketplace;
  sortBy?: "price-asc" | "price-desc" | "deal-score" | "name";
}
