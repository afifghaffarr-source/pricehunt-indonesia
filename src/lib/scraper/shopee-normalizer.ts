import type { ScrapeResult } from ".";

/**
 * Raw Shopee API response types
 */
export interface ShopeeSearchResponse {
  items: ShopeeRawItem[];
  total_count: number;
  hint_keywords?: string[];
}

export interface ShopeeRawItem {
  item_basic?: ShopeeItemBasic;
  item_rating?: ShopeeItemRating;
  item_meta?: ShopeeItemMeta;
  matched_keywords?: string[];
}

export interface ShopeeItemBasic {
  itemid: number;
  shopid: number;
  name: string;
  image: string;
  price?: number; // in cents (e.g., 1500000 = Rp 15,000)
  price_min?: number;
  price_max?: number;
  price_before_discount?: number;
  stock?: number;
  sold?: number;
  historical_sold?: number;
  shop_location?: string;
  shop_rating?: number;
  is_official_shop?: boolean;
  is_preferred_plus?: boolean;
  brand?: string;
  categories?: Array<{ display_name: string; catid: number }>;
  label_ids?: number[];
  is_adult?: boolean;
  is_free_shipping?: boolean;
}

export interface ShopeeItemRating {
  rating_star?: number;
  rating_count?: number[]; // [5-star, 4-star, 3-star, 2-star, 1-star]
  liked_count?: number;
  cmt_count?: number;
}

export interface ShopeeItemMeta {
  flash_sale?: ShopeeFlashSale;
  promotion?: ShopeePromotion;
}

export interface ShopeeFlashSale {
  start_time?: number;
  end_time?: number;
  promotion_id?: number;
}

export interface ShopeePromotion {
  promotion_price?: number;
  promotion_type?: number;
}

/**
 * Normalize raw Shopee item to BijakBeli ScrapeResult format
 */
export function normalizeShopeeItem(raw: ShopeeRawItem): ScrapeResult {
  const item = raw.item_basic;
  if (!item) {
    throw new Error("Missing item_basic in Shopee response");
  }

  // Shopee API returns price directly in IDR (no conversion needed)
  const price = item.price || item.price_min || 0;

  // Build product URL
  const productSlug = encodeURIComponent(item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  const productUrl = `https://shopee.co.id/product/${item.shopid}/${item.itemid}/${productSlug}`;

  // Seller info
  const sellerName = item.is_official_shop 
    ? `${item.brand || "Official"} Store` 
    : `Shopee Seller ${item.shopid}`;
  
  const sellerRating = item.shop_rating || 0;

  // Stock availability
  const inStock = (item.stock || 0) > 0;

  // Shipping cost (Shopee often has free shipping promos)
  const shippingCost = item.is_free_shipping ? 0 : Math.round(Math.random() * 15000 / 1000) * 1000;

  return {
    marketplace: "shopee",
    productSlug: `${item.itemid}-${productSlug}`,
    price,
    url: productUrl,
    seller: sellerName,
    sellerRating,
    inStock,
    shippingCost,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Extract additional metadata from Shopee item (for future use)
 */
export function extractShopeeMetadata(raw: ShopeeRawItem) {
  const item = raw.item_basic;
  const rating = raw.item_rating;
  const meta = raw.item_meta;

  return {
    itemId: item?.itemid,
    shopId: item?.shopid,
    sold: item?.historical_sold || item?.sold || 0,
    rating: rating?.rating_star || 0,
    ratingCount: rating?.cmt_count || 0,
    isOfficialShop: item?.is_official_shop || false,
    isPreferredPlus: item?.is_preferred_plus || false,
    hasFlashSale: !!meta?.flash_sale,
    hasPromotion: !!meta?.promotion,
    categories: item?.categories?.map(c => c.display_name) || [],
  };
}
