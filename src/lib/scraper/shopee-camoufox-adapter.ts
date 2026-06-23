import { firefox } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import { normalizeShopeeItem, type ShopeeSearchResponse, type ShopeeRawItem } from "./shopee-normalizer";
import type { ScrapeResult } from ".";

const SHOPEE_SEARCH_URL = "https://shopee.co.id/search";
const CAMOUFOX_BIN = "/home/ubuntu/.cache/camoufox/camoufox-bin";

interface ShopeeAdapterConfig {
  maxItems?: number;
  timeout?: number;
  retryAttempts?: number;
  headless?: boolean;
}

const DEFAULT_CONFIG: ShopeeAdapterConfig = {
  maxItems: 20,
  timeout: 45000,
  retryAttempts: 2,
  headless: true,
};

export class ShopeeCamoufoxAdapter {
  private config: ShopeeAdapterConfig;
  private browser: Browser | null = null;

  constructor(config: ShopeeAdapterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    if (this.browser) return;
    console.log("[ShopeeCamoufoxAdapter] Launching Camoufox...");
    this.browser = await firefox.launch({
      executablePath: CAMOUFOX_BIN,
      headless: this.config.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    console.log("[ShopeeCamoufoxAdapter] Camoufox launched");
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("[ShopeeCamoufoxAdapter] Browser closed");
    }
  }

  async search(keyword: string, limit?: number): Promise<ScrapeResult[]> {
    await this.init();
    if (!this.browser) throw new Error("Browser not initialized");

    const maxItems = limit || this.config.maxItems || 20;

    for (let attempt = 0; attempt < (this.config.retryAttempts || 2); attempt++) {
      let context: BrowserContext | null = null;
      try {
        console.log(`[ShopeeCamoufoxAdapter] Attempt ${attempt + 1}: "${keyword}"`);

        context = await this.browser.newContext({
          viewport: null,
          locale: "id-ID",
          timezoneId: "Asia/Jakarta",
          extraHTTPHeaders: {
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });

        const page = await context.newPage();
        const rawItems = await this.interceptSearchResponse(page, keyword, maxItems);
        await context.close();
        context = null;

        if (rawItems.length === 0) {
          console.warn(`[ShopeeCamoufoxAdapter] No items for "${keyword}"`);
          if (attempt < (this.config.retryAttempts || 2) - 1) {
            await this.delay(3000 * (attempt + 1));
            continue;
          }
          return [];
        }

        console.log(`[ShopeeCamoufoxAdapter] Found ${rawItems.length} items`);
        return this.transformResults(rawItems);
      } catch (error) {
        if (context) await context.close();
        console.error(`[ShopeeCamoufoxAdapter] Attempt ${attempt + 1} failed:`, (error as Error).message);
        if (attempt === (this.config.retryAttempts || 2) - 1) throw error;
        await this.delay(3000 * (attempt + 1));
      }
    }
    return [];
  }

  private async interceptSearchResponse(
    page: Page,
    keyword: string,
    maxItems: number
  ): Promise<ShopeeRawItem[]> {
    let capturedItems: ShopeeRawItem[] = [];
    let navigationError = false;

    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (url.includes("captcha") || url.includes("verify") || url.includes("challenge")) {
          console.warn(`[ShopeeCamoufoxAdapter] CAPTCHA detected: ${url}`);
          navigationError = true;
        }
      }
    });

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/v4/search/search_items")) {
        try {
          const json = (await response.json()) as ShopeeSearchResponse;
          if (json.items && json.items.length > 0) {
            capturedItems = json.items.slice(0, maxItems);
            console.log(`[ShopeeCamoufoxAdapter] Captured ${capturedItems.length} items from API`);
          }
        } catch {
          // ignore parse errors
        }
      }
    });

    const searchUrl = `${SHOPEE_SEARCH_URL}?keyword=${encodeURIComponent(keyword)}&sortBy=ctime`;
    console.log(`[ShopeeCamoufoxAdapter] Navigating to: ${searchUrl}`);

    try {
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: this.config.timeout || 45000,
      });
    } catch (error) {
      console.error("[ShopeeCamoufoxAdapter] Navigation failed:", (error as Error).message);
      navigationError = true;
    }

    if (navigationError) return [];

    await this.delay(5000);

    // Scroll to trigger lazy loading
    if (capturedItems.length < maxItems) {
      for (let i = 0; i < 3 && capturedItems.length < maxItems; i++) {
        await page.evaluate(() => window.scrollBy(0, 600));
        await this.delay(1500);
      }
    }

    // Fallback DOM scrape
    if (capturedItems.length === 0) {
      capturedItems = await this.scrapeFromDOM(page);
    }

    return capturedItems;
  }

  private async scrapeFromDOM(page: Page): Promise<ShopeeRawItem[]> {
    const items = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/product/"]');
      interface DomCard {
        item_basic: {
          itemid: number;
          shopid: number;
          name: string;
          image: string;
          price: number;
          stock: number;
          sold: number;
          shop_rating: number;
          is_official_shop: boolean;
          is_free_shipping: boolean;
        };
      }
      const results: DomCard[] = [];

      links.forEach((link) => {
        try {
          const card = link.closest('[data-sqe="item"], .col-xs-2_4') || link.parentElement;
          if (!card) return;

          const nameEl = card.querySelector('[data-sqe="name"]')
            || card.querySelector('.shopee-search-item-result__item-title')
            || link.querySelector('div');

          const priceEl = card.querySelector('[data-sqe="price"]')
            || card.querySelector('.shopee-search-item-result__item-price');

          const name = nameEl?.textContent?.trim() || "";
          const priceText = priceEl?.textContent?.replace(/[^\d]/g, "") || "0";
          const href = link.getAttribute("href") || "";

          const match = href.match(/\/product\/(\d+)\/(\d+)/);
          const shopid = match ? parseInt(match[1]) : 0;
          const itemid = match ? parseInt(match[2]) : 0;

          if (name && itemid && !results.find((r: DomCard) => r.item_basic.itemid === itemid)) {
            results.push({
              item_basic: {
                itemid,
                shopid,
                name,
                image: "",
                price: parseInt(priceText) || 0,
                stock: 1,
                sold: 0,
                shop_rating: 0,
                is_official_shop: false,
                is_free_shipping: false,
              },
            });
          }
        } catch {
          // skip
        }
      });

      return results;
    });

    if (items.length > 0) {
      console.log(`[ShopeeCamoufoxAdapter] DOM fallback found ${items.length} items`);
    }
    return items as ShopeeRawItem[];
  }

  private transformResults(rawItems: ShopeeRawItem[]): ScrapeResult[] {
    return rawItems
      .map((item) => {
        try {
          return normalizeShopeeItem(item);
        } catch (_error) {
          return null;
        }
      })
      .filter((item): item is ScrapeResult => item !== null);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

let adapterInstance: ShopeeCamoufoxAdapter | null = null;

export function getShopeeCamoufoxAdapter(): ShopeeCamoufoxAdapter {
  if (!adapterInstance) {
    adapterInstance = new ShopeeCamoufoxAdapter();
  }
  return adapterInstance;
}
