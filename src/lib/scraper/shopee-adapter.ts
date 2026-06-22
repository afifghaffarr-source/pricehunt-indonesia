import { normalizeShopeeItem, type ShopeeSearchResponse, type ShopeeRawItem } from "./shopee-normalizer";
import type { ScrapeResult } from ".";

const SHOPEE_API_BASE = "https://shopee.co.id/api/v4/search/search_items";

interface ShopeeAdapterConfig {
  maxItems?: number;
  timeout?: number;
  retryAttempts?: number;
}

const DEFAULT_CONFIG: ShopeeAdapterConfig = {
  maxItems: 20,
  timeout: 10000,
  retryAttempts: 2,
};

/**
 * Shopee Internal API Adapter (v4)
 * 
 * Uses Shopee's internal search API to fetch product data.
 * Note: This is an unofficial API and may require updates if Shopee changes their endpoints.
 */
export class ShopeeAdapter {
  private config: ShopeeAdapterConfig;

  constructor(config: ShopeeAdapterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Search products on Shopee by keyword
   */
  async search(keyword: string, limit?: number): Promise<ScrapeResult[]> {
    const maxItems = limit || this.config.maxItems || 20;
    const encodedKeyword = encodeURIComponent(keyword);
    
    const url = new URL(SHOPEE_API_BASE);
    url.searchParams.set("keyword", encodedKeyword);
    url.searchParams.set("limit", maxItems.toString());
    url.searchParams.set("by", "relevancy"); // or "popularity", "price", "ctime"
    url.searchParams.set("newest", "0");
    url.searchParams.set("order", "desc");
    url.searchParams.set("page_type", "search");
    url.searchParams.set("scenario", "PAGE_GLOBAL_SEARCH");
    url.searchParams.set("version", "2");

    const headers = this.buildHeaders();

    for (let attempt = 0; attempt < (this.config.retryAttempts || 2); attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(this.config.timeout || 10000),
        });

        if (!response.ok) {
          console.error(`[ShopeeAdapter] HTTP ${response.status} on attempt ${attempt + 1}`);
          if (attempt === (this.config.retryAttempts || 2) - 1) {
            throw new Error(`Shopee API returned HTTP ${response.status}`);
          }
          await this.delay(1000 * (attempt + 1)); // exponential backoff
          continue;
        }

        const data: ShopeeSearchResponse = await response.json();
        
        if (!data.items || data.items.length === 0) {
          console.warn(`[ShopeeAdapter] No items found for keyword: ${keyword}`);
          return [];
        }

        return this.transformResults(data.items);
      } catch (error) {
        console.error(`[ShopeeAdapter] Attempt ${attempt + 1} failed:`, error);
        if (attempt === (this.config.retryAttempts || 2) - 1) {
          throw error;
        }
        await this.delay(1000 * (attempt + 1));
      }
    }

    return [];
  }

  /**
   * Build headers for Shopee API request
   */
  private buildHeaders(): HeadersInit {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "Referer": "https://shopee.co.id/",
      "Origin": "https://shopee.co.id",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-api-source": "pc",
      "x-shopee-language": "id",
      "x-requested-with": "XMLHttpRequest",
      "af-ac-enc-dat": "", // Sometimes required, can be empty for basic requests
    };
  }

  /**
   * Transform raw Shopee API results to BijakBeli format
   */
  private transformResults(rawItems: ShopeeRawItem[]): ScrapeResult[] {
    return rawItems
      .map((item) => {
        try {
          return normalizeShopeeItem(item);
        } catch (error) {
          console.error(`[ShopeeAdapter] Failed to normalize item ${item.item_basic?.itemid}:`, error);
          return null;
        }
      })
      .filter((item): item is ScrapeResult => item !== null);
  }

  /**
   * Utility: delay for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for convenience
 */
let adapterInstance: ShopeeAdapter | null = null;

export function getShopeeAdapter(): ShopeeAdapter {
  if (!adapterInstance) {
    adapterInstance = new ShopeeAdapter();
  }
  return adapterInstance;
}
