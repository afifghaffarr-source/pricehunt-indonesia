import type { ScrapeResult } from ".";

export interface BraveSearchProduct {
  title: string;
  url: string;
  description: string;
  price?: string;
  source?: string;
}

export interface BraveSearchConfig {
  apiKey?: string;
  maxResults?: number;
  country?: string;
}

/**
 * Brave Search Adapter for Google Shopping
 * 
 * Uses Brave Search API (2,000 free queries/month) to search for products
 * across marketplaces without getting blocked.
 * 
 * Alternative: Can also use free HTML scraping if no API key provided.
 */
export class BraveSearchShoppingAdapter {
  private config: BraveSearchConfig;
  private apiKey: string | null;

  constructor(config: BraveSearchConfig = {}) {
    this.config = {
      maxResults: 10,
      country: "id",
      ...config,
    };
    this.apiKey = config.apiKey || process.env.BRAVE_SEARCH_API_KEY || null;
  }

  /**
   * Search for products using Brave Search API or fallback to HTML scraping
   */
  async search(query: string, limit?: number): Promise<ScrapeResult[]> {
    const maxResults = limit || this.config.maxResults || 10;
    
    // Construct search query for Indonesian marketplaces
    const searchQuery = `${query} site:shopee.co.id OR site:tokopedia.com`;
    
    if (this.apiKey) {
      console.log("[BraveSearch] Using Brave Search API");
      return this.searchWithAPI(searchQuery, maxResults);
    } else {
      console.log("[BraveSearch] No API key, using HTML scraping fallback");
      return this.searchWithHTML(searchQuery, maxResults);
    }
  }

  /**
   * Search using Brave Search API (requires API key)
   * Get free key at: https://brave.com/search/api/
   */
  private async searchWithAPI(query: string, maxResults: number): Promise<ScrapeResult[]> {
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}&country=${this.config.country}`;
      
      const response = await fetch(url, {
        headers: {
          "X-Subscription-Token": this.apiKey!,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.web?.results || [];
      
      console.log(`[BraveSearch] Found ${results.length} results from API`);
      
      return results.map((result: any) => this.parseSearchResult(result));
    } catch (error) {
      console.error("[BraveSearch] API search failed:", error);
      throw error;
    }
  }

  /**
   * Fallback: Scrape DuckDuckGo HTML results (no API key needed)
   * More reliable than Google for cloud servers
   */
  private async searchWithHTML(query: string, maxResults: number): Promise<ScrapeResult[]> {
    try {
      // DuckDuckGo HTML search - more scraping-friendly
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo error: ${response.status}`);
      }

      const html = await response.text();
      
      // Parse DuckDuckGo HTML results
      const results: ScrapeResult[] = [];
      
      // Extract result links
      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
      let match;
      let count = 0;
      
      while ((match = resultRegex.exec(html)) !== null && count < maxResults) {
        let rawUrl = match[1];
        const titleHtml = match[2];
        
        // Strip HTML tags from title
        const title = titleHtml.replace(/<[^>]*>/g, '').trim();
        
        // Decode DuckDuckGo redirect URL
        let cleanUrl = rawUrl;
        if (rawUrl.includes('uddg=')) {
          const urlMatch = rawUrl.match(/uddg=([^&]+)/);
          if (urlMatch) {
            cleanUrl = decodeURIComponent(urlMatch[1]);
          }
        }
        
        // Only include marketplace results
        if (cleanUrl.includes("shopee.co.id") || cleanUrl.includes("tokopedia.com")) {
          const marketplace = cleanUrl.includes("shopee.co.id") ? "shopee" : "tokopedia";
          const productSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 50);
          
          results.push({
            marketplace,
            productSlug: `${count}-${productSlug}`,
            price: 0, // Price needs to be extracted from product page
            url: cleanUrl,
            seller: marketplace === "shopee" ? "Shopee Seller" : "Tokopedia Seller",
            sellerRating: 0,
            inStock: true,
            shippingCost: 0,
            scrapedAt: new Date().toISOString(),
          });
          
          count++;
        }
      }
      
      console.log(`[BraveSearch] Found ${results.length} marketplace results from HTML`);
      return results;
    } catch (error) {
      console.error("[BraveSearch] HTML search failed:", error);
      throw error;
    }
  }

  /**
   * Parse Brave Search API result to ScrapeResult
   */
  private parseSearchResult(result: any): ScrapeResult {
    const url = result.url || "";
    const marketplace = url.includes("shopee.co.id") ? "shopee" : "tokopedia";
    const title = result.title || "";
    const productSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 50);
    
    return {
      marketplace,
      productSlug: `${Date.now()}-${productSlug}`,
      price: 0, // Price needs to be extracted from product page
      url,
      seller: result.description ? this.extractSeller(result.description) : "Unknown",
      sellerRating: 0,
      inStock: true,
      shippingCost: 0,
      scrapedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract seller name from description
   */
  private extractSeller(description: string): string {
    // Try to find store/seller name in description
    const storeMatch = description.match(/(?:Toko|Store|Shop)[\s:]+([^\s,]+)/i);
    return storeMatch ? storeMatch[1] : "Unknown Seller";
  }
}

let adapterInstance: BraveSearchShoppingAdapter | null = null;

export function getBraveSearchShoppingAdapter(): BraveSearchShoppingAdapter {
  if (!adapterInstance) {
    adapterInstance = new BraveSearchShoppingAdapter();
  }
  return adapterInstance;
}
