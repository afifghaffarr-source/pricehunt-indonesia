import type { Marketplace } from "@/lib/types";

export interface ScrapeResult {
  marketplace: Marketplace;
  productSlug: string;
  price: number;
  url: string;
  seller: string;
  sellerRating: number;
  inStock: boolean;
  shippingCost: number;
  scrapedAt: string;
}

export interface ScraperConfig {
  marketplace: Marketplace;
  baseUrl: string;
  searchPath: string;
  enabled: boolean;
}

export const SCRAPER_CONFIGS: ScraperConfig[] = [
  { marketplace: "tokopedia", baseUrl: "https://www.tokopedia.com", searchPath: "/search?q=", enabled: true },
  { marketplace: "shopee", baseUrl: "https://shopee.co.id", searchPath: "/search?keyword=", enabled: true },
  { marketplace: "bukalapak", baseUrl: "https://www.bukalapak.com", searchPath: "/products?search[keywords]=", enabled: true },
  { marketplace: "lazada", baseUrl: "https://www.lazada.co.id", searchPath: "/catalog/?q=", enabled: true },
  { marketplace: "blibli", baseUrl: "https://www.blibli.com", searchPath: "/cari/", enabled: true },
  { marketplace: "tiktok", baseUrl: "https://shop.tiktok.com", searchPath: "/search?keyword=", enabled: false },
];

export function simulatePriceFluctuation(basePrice: number, volatility: number = 0.05): number {
  const change = (Math.random() - 0.5) * 2 * volatility;
  return Math.round(basePrice * (1 + change));
}

export function simulateSellerRating(): number {
  return Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
}

export function simulateShippingCost(): number {
  const freeShippingChance = Math.random();
  if (freeShippingChance > 0.4) return 0;
  return Math.round(Math.random() * 25000 / 1000) * 1000;
}

export function simulateStockAvailability(): boolean {
  return Math.random() > 0.08;
}

export async function scrapeProduct(
  marketplace: Marketplace,
  productName: string,
  basePrice: number
): Promise<ScrapeResult> {
  const config = SCRAPER_CONFIGS.find((c) => c.marketplace === marketplace);
  if (!config) {
    throw new Error(`No scraper config for ${marketplace}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));

  const price = simulatePriceFluctuation(basePrice, 0.12);
  const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    marketplace,
    productSlug: slug,
    price,
    url: `${config.baseUrl}${config.searchPath}${encodeURIComponent(productName)}`,
    seller: `${config.marketplace.charAt(0).toUpperCase() + config.marketplace.slice(1)} Official Store`,
    sellerRating: simulateSellerRating(),
    inStock: simulateStockAvailability(),
    shippingCost: simulateShippingCost(),
    scrapedAt: new Date().toISOString(),
  };
}

export async function scrapeAllMarketplaces(
  productName: string,
  basePrice: number
): Promise<ScrapeResult[]> {
  const enabledConfigs = SCRAPER_CONFIGS.filter((c) => c.enabled);

  const results = await Promise.allSettled(
    enabledConfigs.map((config) =>
      scrapeProduct(config.marketplace, productName, basePrice)
    )
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ScrapeResult> => r.status === "fulfilled")
    .map((r) => r.value);
}

export function generateScrapeReport(results: ScrapeResult[]): {
  lowest: ScrapeResult | null;
  highest: ScrapeResult | null;
  average: number;
  inStockCount: number;
  freeShippingCount: number;
} {
  const inStock = results.filter((r) => r.inStock);
  if (inStock.length === 0) {
    return { lowest: null, highest: null, average: 0, inStockCount: 0, freeShippingCount: 0 };
  }

  const sorted = [...inStock].sort((a, b) => a.price - b.price);
  const total = inStock.reduce((sum, r) => sum + r.price, 0);

  return {
    lowest: sorted[0],
    highest: sorted[sorted.length - 1],
    average: Math.round(total / inStock.length),
    inStockCount: inStock.length,
    freeShippingCount: results.filter((r) => r.shippingCost === 0).length,
  };
}
