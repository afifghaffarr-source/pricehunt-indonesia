import type { PriceHuntDiscoveredProduct, VexoSearchResultItem } from "./types";
import type { Marketplace } from "@/lib/types";

const MARKETPLACE_PATTERNS: { pattern: RegExp; name: PriceHuntDiscoveredProduct["marketplace"] }[] = [
  { pattern: /tokopedia\.com/i, name: "tokopedia" },
  { pattern: /shopee\.co\.id/i, name: "shopee" },
  { pattern: /bukalapak\.com/i, name: "bukalapak" },
  { pattern: /lazada\.co\.id/i, name: "lazada" },
  { pattern: /blibli\.com/i, name: "blibli" },
  { pattern: /tiktok\.com/i, name: "tiktok-shop" },
];

export function detectMarketplace(url: string): PriceHuntDiscoveredProduct["marketplace"] {
  for (const { pattern, name } of MARKETPLACE_PATTERNS) {
    if (pattern.test(url)) return name;
  }
  return "unknown";
}

export function extractPrice(text: string): number | null {
  if (!text) return null;
  const patterns = [
    /rp\.?\s*([\d.,]+)/i,
    /idr\.?\s*([\d.,]+)/i,
    /harga[:\s]*([\d.,]+)/i,
    /([\d.,]+)\s*(?:rupiah|rp)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/[.,]/g, "");
      const price = parseInt(cleaned, 10);
      if (price > 1000 && price < 100_000_000) return price;
    }
  }
  return null;
}

export function normalizeTitle(title: string): string {
  return title
    .replace(/\s*[-|–—]\s*(Tokopedia|Shopee|Bukalapak|Lazada|Blibli|TikTok).*$/i, "")
    .replace(/\s*[-|–—]\s*(Harga|Promo|Diskon).*$/i, "")
    .replace(/\bRp\.?\s*[\d.,]+\b/gi, "")
    .replace(/\bIDR\s*[\d.,]+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function calculateConfidence(item: VexoSearchResultItem, expectedMarketplace?: string): number {
  let score = 0.5;
  const detected = detectMarketplace(item.url);
  if (detected !== "unknown") score += 0.2;
  if (expectedMarketplace && detected === expectedMarketplace) score += 0.15;
  if (extractPrice(item.snippet || item.price || "")) score += 0.1;
  if (item.title && item.title.length > 10) score += 0.05;
  if (item.imageUrl) score += 0.05;
  return Math.min(1, Math.round(score * 100) / 100);
}

export function normalizeSearchResult(
  item: VexoSearchResultItem,
  source: PriceHuntDiscoveredProduct["source"],
  expectedMarketplace?: string
): PriceHuntDiscoveredProduct {
  const marketplace = detectMarketplace(item.url);
  const estimatedPrice = extractPrice(item.snippet || item.price || "");
  const uniqueId = "vexo-" + simpleHash(item.url + "|" + item.title + "|" + source);

  return {
    id: uniqueId,
    title: item.title,
    normalizedTitle: normalizeTitle(item.title),
    marketplace,
    url: item.url,
    imageUrl: item.imageUrl,
    priceText: item.price,
    estimatedPrice,
    snippet: item.snippet,
    source,
    confidenceScore: calculateConfidence(item, expectedMarketplace),
    discoveredAt: new Date().toISOString(),
  };
}

export function toMarketplace(mp: PriceHuntDiscoveredProduct["marketplace"]): Marketplace | null {
  const map: Record<string, Marketplace> = {
    tokopedia: "tokopedia",
    shopee: "shopee",
    bukalapak: "bukalapak",
    lazada: "lazada",
    blibli: "blibli",
    "tiktok-shop": "tiktok",
  };
  return map[mp] || null;
}