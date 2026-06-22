import type { ScrapeResult } from ".";

export interface EnhancedProduct {
  title: string;
  marketplace: "shopee" | "tokopedia";
  url: string;
  price: number;
  currency: string;
  seller?: string;
  rating?: number;
  sold?: number;
  imageUrl?: string;
  source: string;
  scrapedAt: string;
}

/**
 * Extract price and metadata from product page using OpenGraph and JSON-LD
 * Uses lightweight fetch (no browser) with realistic headers
 */
async function extractProductMetadata(url: string, marketplace: string): Promise<Partial<EnhancedProduct>> {
  try {
    // Special handling: extract from Shopee internal API if URL has shopid/itemid
    if (marketplace === "shopee" && url.includes("/i.")) {
      const apiData = await fetchShopeeItemAPI(url);
      if (apiData) return apiData;
    }
    
    // Special handling: Tokopedia API
    if (marketplace === "tokopedia") {
      const apiData = await fetchTokopediaItemAPI(url);
      if (apiData) return apiData;
    }
    
    // Fallback: HTML scraping
    return await fetchHTMLMetadata(url, marketplace);
  } catch (error) {
    return {};
  }
}

/**
 * Extract Shopee item data via internal API v2
 * URL formats supported:
 *   - shopee.co.id/Name-i.{shopid}.{itemid}
 *   - shopee.co.id/Name-{slug}-i.{shopid}.{itemid}
 */
async function fetchShopeeItemAPI(url: string): Promise<Partial<EnhancedProduct>> {
  try {
    // Extract shopid and itemid from URL - try multiple patterns
    const patterns = [
      /i\.(\d+)\.(\d+)/,           // Standard: i.{shopid}.{itemid}
      /-i\.(\d+)\.(\d+)$/,         // End of URL
      /-i-(\d+)-(\d+)/,            // Alternative format
    ];
    
    let shopid: string | null = null;
    let itemid: string | null = null;
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        shopid = match[1];
        itemid = match[2];
        break;
      }
    }
    
    if (!shopid || !itemid) return {};
    
    // Shopee internal API endpoint - returns full item data as JSON
    const apiUrl = `https://shopee.co.id/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": url,
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return {};
    
    const data = await response.json();
    
    if (!data.data) return {};
    
    const item = data.data;
    const result: Partial<EnhancedProduct> = {};
    
    // Title
    if (item.name) result.title = item.name;
    
    // Price (in cents, divide by 100000)
    if (item.price !== undefined) {
      result.price = Math.round(item.price / 100000);
    }
    
    // Images
    if (item.images && item.images.length > 0) {
      result.imageUrl = `https://down-id.img.susercontent.com/file/${item.images[0]}`;
    }
    
    // Seller
    if (item.shop_name) {
      result.seller = item.shop_name;
    } else if (item.brand && item.is_official_shop) {
      result.seller = `${item.brand} Official Store`;
    }
    
    // Rating
    if (item.item_rating?.rating_star !== undefined) {
      result.rating = item.item_rating.rating_star;
    }
    
    // Sold count
    if (item.historical_sold !== undefined) {
      result.sold = item.historical_sold;
    } else if (item.sold !== undefined) {
      result.sold = item.sold;
    }
    
    return result;
  } catch (error) {
    return {};
  }
}

/**
 * Extract Tokopedia item data via internal API
 */
async function fetchTokopediaItemAPI(url: string): Promise<Partial<EnhancedProduct>> {
  try {
    // Tokopedia URLs: tokopedia.com/{product-name}/p/{productid}
    // or: tokopedia.com/product/{slug}/{productid}
    const match = url.match(/\/p\/(\d+)|\/([\w-]+)\/(\d+)$/);
    if (!match) return {};
    
    const productId = match[1] || match[3];
    if (!productId) return {};
    
    // Try Tokopedia internal API (v3)
    const apiUrl = `https://www.tokopedia.com/v3/product/${productId}?lang=id&country=ID`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.tokopedia.com/",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return {};
    
    const data = await response.json();
    if (!data.data) return {};
    
    const result: Partial<EnhancedProduct> = {};
    const item = data.data;
    
    if (item.name) result.title = item.name;
    if (item.price) result.price = parseInt(item.price);
    if (item.image_url) result.imageUrl = item.image_url;
    if (item.shop?.name) result.seller = item.shop.name;
    if (item.rating) result.rating = item.rating;
    
    return result;
  } catch (error) {
    return {};
  }
}

/**
 * Fallback: HTML scraping for meta tags
 */
async function fetchHTMLMetadata(url: string, marketplace: string): Promise<Partial<EnhancedProduct>> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return {};

    const html = await response.text();
    const result: Partial<EnhancedProduct> = {};

    // JSON-LD structured data
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const data = JSON.parse(jsonContent);
          
          if (data["@type"] === "Product" || data["@type"]?.includes("Product")) {
            if (data.name && !result.title) result.title = data.name;
            if (data.image) result.imageUrl = Array.isArray(data.image) ? data.image[0] : data.image;
            
            if (data.offers) {
              const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers;
              if (offers.price) {
                result.price = parseInt(offers.price.toString().replace(/[^\d]/g, '')) || 0;
              }
              if (offers.seller?.name) result.seller = offers.seller.name;
            }
            
            if (data.aggregateRating) {
              result.rating = parseFloat(data.aggregateRating.ratingValue) || undefined;
              result.sold = parseInt(data.aggregateRating.reviewCount) || undefined;
            }
            break;
          }
        } catch {
          // Continue
        }
      }
    }

    // OpenGraph
    if (!result.price || !result.title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogTitleMatch && !result.title) result.title = ogTitleMatch[1];
      
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      if (ogImageMatch && !result.imageUrl) result.imageUrl = ogImageMatch[1];
      
      const ogPriceMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i);
      if (ogPriceMatch && !result.price) {
        result.price = parseInt(ogPriceMatch[1].replace(/[^\d]/g, '')) || 0;
      }
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Multi-Strategy Shopping Scraper
 *
 * Combines 4 free strategies to maximize data coverage:
 * 1. DuckDuckGo HTML scraping (URL discovery)
 * 2. Bing Shopping search (price data)
 * 3. Direct marketplace search (when possible)
 * 4. OpenGraph/meta tag extraction from product URLs
 *
 * All strategies are free and don't require API keys.
 */
export class MultiStrategyShoppingScraper {
  /**
   * Search using multiple free strategies in parallel
   */
  async search(query: string, limit: number = 10): Promise<EnhancedProduct[]> {
    console.log(`[MultiStrategy] Searching for: "${query}"`);

    const strategies = [
      this.searchDuckDuckGo(query, limit),
      this.searchBing(query, limit),
      this.searchDuckDuckGoHTML(query, limit),
    ];

    const results = await Promise.allSettled(strategies);
    
    const allProducts: EnhancedProduct[] = [];
    const seenUrls = new Set<string>();

    results.forEach((result, index) => {
      const strategyName = ["DuckDuckGo", "Bing", "DDG-HTML"][index];
      if (result.status === "fulfilled") {
        result.value.forEach(product => {
          const normalizedUrl = this.normalizeUrl(product.url);
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            allProducts.push(product);
          }
        });
        console.log(`[MultiStrategy] ${strategyName}: ${result.value.length} results`);
      } else {
        console.log(`[MultiStrategy] ${strategyName} failed: ${result.reason?.message || "unknown"}`);
      }
    });

    // Deduplicate by title similarity
    let deduplicated = this.deduplicateByTitle(allProducts);
    
    // Try to enrich with price/metadata from product pages (max 5 to avoid rate limits)
    const productsToEnrich = deduplicated.slice(0, 5);
    const enriched = await Promise.all(
      productsToEnrich.map(async (product) => {
        // Skip product listing pages (they don't have price)
        if (this.isListingPage(product.url)) {
          return product;
        }
        
        const metadata = await extractProductMetadata(product.url, product.marketplace);
        return { ...product, ...metadata };
      })
    );
    
    // Replace first 5 with enriched versions
    deduplicated = [...enriched, ...deduplicated.slice(5)];
    
    console.log(`[MultiStrategy] Total unique products: ${deduplicated.length}`);
    return deduplicated.slice(0, limit);
  }

  /**
   * Check if URL is a listing/search page (no individual product)
   */
  private isListingPage(url: string): boolean {
    return url.includes("/search?") || 
           url.includes("/list/") || 
           url.includes("/find/") ||
           url.includes("/catalog/");
  }

  /**
   * Strategy 1: DuckDuckGo Instant Answer API (JSON, no scraping)
   */
  private async searchDuckDuckGo(query: string, limit: number): Promise<EnhancedProduct[]> {
    try {
      const searchQuery = encodeURIComponent(`${query} shopee OR tokopedia`);
      const url = `https://api.duckduckgo.com/?q=${searchQuery}&format=json&no_html=1`;
      
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BijakBeli/1.0)" },
      });

      if (!response.ok) return [];

      const data = await response.json();
      const results: EnhancedProduct[] = [];

      // Parse RelatedTopics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, limit)) {
          if (topic.FirstURL && (topic.FirstURL.includes("shopee") || topic.FirstURL.includes("tokopedia"))) {
            const marketplace: "shopee" | "tokopedia" = topic.FirstURL.includes("shopee") ? "shopee" : "tokopedia";
            results.push({
              title: topic.Text?.split(" - ")[0] || query,
              marketplace,
              url: topic.FirstURL,
              price: 0,
              currency: "IDR",
              source: "duckduckgo-api",
              scrapedAt: new Date().toISOString(),
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error("[DuckDuckGo API] Error:", error);
      return [];
    }
  }

  /**
   * Strategy 2: Bing Search (free, more lenient than Google)
   */
  private async searchBing(query: string, limit: number): Promise<EnhancedProduct[]> {
    try {
      const searchQuery = encodeURIComponent(`${query} (site:shopee.co.id OR site:tokopedia.com)`);
      const url = `https://www.bing.com/search?q=${searchQuery}&count=${limit}`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      const results: EnhancedProduct[] = [];

      // Parse Bing results - look for marketplace URLs
      const linkRegex = /<a[^>]*href="(https?:\/\/(?:www\.)?(?:shopee\.co\.id|tokopedia\.com)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      const titleRegex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
      
      const urls: string[] = [];
      const titles: string[] = [];
      
      let match;
      while ((match = linkRegex.exec(html)) !== null && urls.length < limit) {
        urls.push(match[1]);
      }
      
      while ((match = titleRegex.exec(html)) !== null && titles.length < limit) {
        titles.push(match[1].replace(/<[^>]*>/g, '').trim());
      }

      for (let i = 0; i < Math.min(urls.length, limit); i++) {
        const url = urls[i];
        const marketplace: "shopee" | "tokopedia" = url.includes("shopee") ? "shopee" : "tokopedia";
        const title = titles[i] || query;

        // Try to extract price from Bing snippet
        const price = this.extractPriceFromSnippet(html, url) || 0;

        results.push({
          title,
          marketplace,
          url,
          price,
          currency: "IDR",
          source: "bing",
          scrapedAt: new Date().toISOString(),
        });
      }

      return results;
    } catch (error) {
      console.error("[Bing] Error:", error);
      return [];
    }
  }

  /**
   * Strategy 3: DuckDuckGo HTML scraping (fallback)
   */
  private async searchDuckDuckGoHTML(query: string, limit: number): Promise<EnhancedProduct[]> {
    try {
      const searchQuery = encodeURIComponent(`${query} (site:shopee.co.id OR site:tokopedia.com)`);
      const url = `https://html.duckduckgo.com/html/?q=${searchQuery}`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      const results: EnhancedProduct[] = [];

      // Parse DuckDuckGo HTML results
      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
      
      let match;
      let count = 0;
      
      while ((match = resultRegex.exec(html)) !== null && count < limit) {
        let rawUrl = match[1];
        const titleHtml = match[2];
        const title = titleHtml.replace(/<[^>]*>/g, '').trim();
        
        // Decode DuckDuckGo redirect URL
        let cleanUrl = rawUrl;
        if (rawUrl.includes('uddg=')) {
          const urlMatch = rawUrl.match(/uddg=([^&]+)/);
          if (urlMatch) {
            try {
              cleanUrl = decodeURIComponent(urlMatch[1]);
            } catch {
              cleanUrl = rawUrl;
            }
          }
        }
        
        if (cleanUrl.includes("shopee.co.id") || cleanUrl.includes("tokopedia.com")) {
          const marketplace: "shopee" | "tokopedia" = cleanUrl.includes("shopee") ? "shopee" : "tokopedia";
          
          // Try to extract price from snippet near this result
          const price = this.extractPriceFromDDGSnippet(html, match.index) || 0;
          
          results.push({
            title,
            marketplace,
            url: cleanUrl,
            price,
            currency: "IDR",
            source: "duckduckgo-html",
            scrapedAt: new Date().toISOString(),
          });
          
          count++;
        }
      }

      return results;
    } catch (error) {
      console.error("[DuckDuckGo HTML] Error:", error);
      return [];
    }
  }

  /**
   * Extract price from text using regex
   */
  private extractPrice(text: string): number {
    // Match patterns like "Rp 1.500.000", "Rp1,500,000", "IDR 1500000"
    const patterns = [
      /Rp\s*([\d.,]+)/i,
      /IDR\s*([\d.,]+)/i,
      /\$\s*([\d.,]+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Remove dots and commas, parse as number
        const cleaned = match[1].replace(/[.,]/g, '');
        const price = parseInt(cleaned, 10);
        if (!isNaN(price) && price > 100) {
          return price;
        }
      }
    }

    return 0;
  }

  /**
   * Extract price from Bing search snippet
   */
  private extractPriceFromSnippet(html: string, targetUrl: string): number {
    // Find the snippet near the URL
    const urlIndex = html.indexOf(targetUrl);
    if (urlIndex === -1) return 0;
    
    // Get surrounding context (next 500 chars)
    const context = html.substring(urlIndex, urlIndex + 500);
    return this.extractPrice(context);
  }

  /**
   * Extract price from DuckDuckGo snippet
   */
  private extractPriceFromDDGSnippet(html: string, resultIndex: number): number {
    // Get snippet after the result title
    const snippetStart = html.indexOf('result__snippet', resultIndex);
    if (snippetStart === -1) return 0;
    
    const snippetEnd = html.indexOf('</a>', snippetStart);
    const snippet = html.substring(snippetStart, snippetEnd > 0 ? snippetEnd : snippetStart + 300);
    
    return this.extractPrice(snippet);
  }

  /**
   * Normalize URL for deduplication
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove tracking params
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'ref_id'];
      trackingParams.forEach(param => parsed.searchParams.delete(param));
      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * Deduplicate products by title similarity
   */
  private deduplicateByTitle(products: EnhancedProduct[]): EnhancedProduct[] {
    const result: EnhancedProduct[] = [];
    const seenTitles = new Map<string, EnhancedProduct>();

    for (const product of products) {
      // Normalize title: lowercase, remove special chars, limit length
      const normalizedTitle = product.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .slice(0, 8)
        .join(' ')
        .substring(0, 60);

      if (normalizedTitle.length < 5) continue;

      const existing = seenTitles.get(normalizedTitle);
      if (!existing) {
        seenTitles.set(normalizedTitle, product);
        result.push(product);
      } else {
        // Keep the one with price if available
        if (product.price > 0 && existing.price === 0) {
          const index = result.indexOf(existing);
          if (index !== -1) {
            result[index] = product;
            seenTitles.set(normalizedTitle, product);
          }
        }
      }
    }

    return result;
  }
}

let adapterInstance: MultiStrategyShoppingScraper | null = null;

export function getMultiStrategyShoppingScraper(): MultiStrategyShoppingScraper {
  if (!adapterInstance) {
    adapterInstance = new MultiStrategyShoppingScraper();
  }
  return adapterInstance;
}