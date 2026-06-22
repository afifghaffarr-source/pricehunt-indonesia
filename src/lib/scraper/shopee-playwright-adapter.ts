import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { normalizeShopeeItem, type ShopeeSearchResponse, type ShopeeRawItem } from "./shopee-normalizer";
import type { ScrapeResult } from ".";

const SHOPEE_SEARCH_URL = "https://shopee.co.id/search";

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

/**
 * Manual stealth: remove Playwright detection fingerprints
 */
async function applyStealthScripts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Hide webdriver flag
    Object.defineProperty(navigator, "webdriver", { get: () => false });

    // Fake plugins (Chrome always has at least a few)
    Object.defineProperty(navigator, "plugins", {
      get: () => [
        { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
        { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
        { name: "Native Client", filename: "internal-nacl-plugin" },
      ],
    });

    // Fake languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["id-ID", "id", "en-US", "en"],
    });

    // Chrome runtime (makes it look like real Chrome)
    (window as any).chrome = { runtime: {} };

    // Permissions API
    const originalQuery = (window.navigator as any).permissions?.query;
    if (originalQuery) {
      (window.navigator as any).permissions.query = (params: { name: string }) =>
        params.name === "notifications"
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(params);
    }

    // WebGL vendor/renderer (realistic values)
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param: number) {
      if (param === 37445) return "Intel Inc.";
      if (param === 37446) return "Intel Iris OpenGL Engine";
      return getParameter.call(this, param);
    };
  });
}

/**
 * Shopee Playwright Adapter (v2 - Stealth Mode)
 *
 * Uses Playwright with manual stealth techniques to bypass Shopee's anti-bot protection.
 * Intercepts Shopee's internal API v4 responses during page load.
 */
export class ShopeePlaywrightAdapter {
  private config: ShopeeAdapterConfig;
  private browser: Browser | null = null;

  constructor(config: ShopeeAdapterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    if (this.browser) return;

    console.log("[ShopeePlaywrightAdapter] Launching browser...");
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("[ShopeePlaywrightAdapter] Browser closed");
    }
  }

  async search(keyword: string, limit?: number): Promise<ScrapeResult[]> {
    await this.init();
    if (!this.browser) throw new Error("Browser not initialized");

    const maxItems = limit || this.config.maxItems || 20;

    for (let attempt = 0; attempt < (this.config.retryAttempts || 2); attempt++) {
      let context: BrowserContext | null = null;
      try {
        console.log(`[ShopeePlaywrightAdapter] Attempt ${attempt + 1}: Searching "${keyword}"`);

        context = await this.browser.newContext({
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          viewport: { width: 1920, height: 1080 },
          locale: "id-ID",
          timezoneId: "Asia/Jakarta",
          extraHTTPHeaders: {
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });

        const page = await context.newPage();

        // Apply stealth
        await applyStealthScripts(page);

        const rawItems = await this.interceptSearchResponse(page, keyword, maxItems);

        await context.close();
        context = null;

        if (rawItems.length === 0) {
          console.warn(`[ShopeePlaywrightAdapter] No items found for keyword: ${keyword}`);
          if (attempt < (this.config.retryAttempts || 2) - 1) {
            console.log("[ShopeePlaywrightAdapter] Retrying after delay...");
            await this.delay(3000 * (attempt + 1));
            continue;
          }
          return [];
        }

        console.log(`[ShopeePlaywrightAdapter] Found ${rawItems.length} items`);
        return this.transformResults(rawItems);
      } catch (error) {
        if (context) await context.close();
        console.error(`[ShopeePlaywrightAdapter] Attempt ${attempt + 1} failed:`, error);
        if (attempt === (this.config.retryAttempts || 2) - 1) {
          throw error;
        }
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

    // Listen for navigation/redirects
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (url.includes("captcha") || url.includes("verify") || url.includes("challenge")) {
          console.warn(`[ShopeePlaywrightAdapter] CAPTCHA/bot detection triggered: ${url}`);
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
            console.log(`[ShopeePlaywrightAdapter] Captured ${capturedItems.length} items from API`);
          }
        } catch (error) {
          console.error("[ShopeePlaywrightAdapter] Failed to parse API response:", error);
        }
      }
    });

    const searchUrl = `${SHOPEE_SEARCH_URL}?keyword=${encodeURIComponent(keyword)}&sortBy=ctime`;
    console.log(`[ShopeePlaywrightAdapter] Navigating to: ${searchUrl}`);

    try {
      await page.goto(searchUrl, {
        waitUntil: "load",
        timeout: this.config.timeout || 45000,
      });
    } catch (error) {
      console.error("[ShopeePlaywrightAdapter] Navigation failed:", error);
      navigationError = true;
    }

    if (navigationError) {
      console.error("[ShopeePlaywrightAdapter] Shopee triggered bot detection (CAPTCHA/redirect). This is expected from cloud servers.");
      return [];
    }

    // Wait for page to settle
    await this.delay(5000);

    // Try scrolling to trigger more loads
    if (capturedItems.length < maxItems) {
      console.log("[ShopeePlaywrightAdapter] Scrolling to load more items...");
      try {
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 600));
          await this.delay(1500);
          if (capturedItems.length >= maxItems) break;
        }
      } catch (error) {
        console.warn("[ShopeePlaywrightAdapter] Scroll failed (context destroyed?):", error);
      }
    }

    // Fallback: scrape DOM if API interception failed
    if (capturedItems.length === 0) {
      console.log("[ShopeePlaywrightAdapter] API interception returned no items, trying DOM scrape...");
      try {
        capturedItems = await this.scrapeFromDOM(page, keyword);
      } catch (error) {
        console.error("[ShopeePlaywrightAdapter] DOM scrape failed:", error);
      }
    }

    return capturedItems;
  }

  /**
   * Fallback: scrape product data directly from the page DOM
   */
  private async scrapeFromDOM(page: Page, keyword: string): Promise<ShopeeRawItem[]> {
    const items = await page.evaluate(() => {
      const productCards = document.querySelectorAll('[data-sqe="item"], .col-xs-2_4, .shopee-search-item-result__item');
      const results: any[] = [];

      productCards.forEach((card) => {
        try {
          const nameEl = card.querySelector('[data-sqe="name"], .IE9p6r, .shopee-search-item-result__item-title');
          const priceEl = card.querySelector('[data-sqe="price"], ._1w9dkI, .shopee-search-item-result__item-price');
          const linkEl = card.querySelector("a[href*='/product/']");

          const name = nameEl?.textContent?.trim() || "";
          const priceText = priceEl?.textContent?.replace(/[^\d]/g, "") || "0";
          const href = linkEl?.getAttribute("href") || "";

          // Extract shopid and itemid from URL
          const match = href.match(/\/product\/(\d+)\/(\d+)/);
          const shopid = match ? parseInt(match[1]) : 0;
          const itemid = match ? parseInt(match[2]) : 0;

          if (name && itemid) {
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
          // skip broken cards
        }
      });

      return results;
    });

    if (items.length > 0) {
      console.log(`[ShopeePlaywrightAdapter] DOM fallback found ${items.length} items`);
    }

    return items as ShopeeRawItem[];
  }

  private transformResults(rawItems: ShopeeRawItem[]): ScrapeResult[] {
    return rawItems
      .map((item) => {
        try {
          return normalizeShopeeItem(item);
        } catch (error) {
          console.error(`[ShopeePlaywrightAdapter] Failed to normalize item:`, error);
          return null;
        }
      })
      .filter((item): item is ScrapeResult => item !== null);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

let adapterInstance: ShopeePlaywrightAdapter | null = null;

export function getShopeePlaywrightAdapter(): ShopeePlaywrightAdapter {
  if (!adapterInstance) {
    adapterInstance = new ShopeePlaywrightAdapter();
  }
  return adapterInstance;
}
