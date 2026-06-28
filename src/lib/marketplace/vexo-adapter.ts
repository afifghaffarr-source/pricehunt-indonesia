import { searchWebWithFallback, askAIWithFallback, searchImagesWithFallback, isVexoConfigured, translateText } from "@/lib/vexo/client";
import { normalizeSearchResult } from "@/lib/vexo/normalizers";
import { MARKETPLACE_SITES } from "@/lib/vexo/endpoints";
import type { BijakBeliDiscoveredProduct, VexoAIIntent } from "@/lib/vexo/types";

const MARKETPLACE_KEYS = Object.keys(MARKETPLACE_SITES);

function sanitizeDiscoveryQuery(query: string): string {
  return query.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 140);
}

export async function discoverProducts(
  query: string,
  marketplace?: string
): Promise<BijakBeliDiscoveredProduct[]> {
  if (!isVexoConfigured()) return [];

  const safeQuery = sanitizeDiscoveryQuery(query);
  if (!safeQuery) return [];

  const siteFilter = marketplace ? MARKETPLACE_SITES[marketplace] : undefined;
  const searchQuery = siteFilter ? `${safeQuery} ${siteFilter}` : safeQuery;

  try {
    const searchResults = await searchWebWithFallback(searchQuery);
    const products: BijakBeliDiscoveredProduct[] = [];

    if (searchResults.data?.results) {
      const source = searchResults.data.searchEngine === "google" ? "vexo-google" : "vexo-duckduckgo";
      for (const item of searchResults.data.results) {
        products.push(normalizeSearchResult(item, source, marketplace));
      }
    }

    return products
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export async function discoverProductsAcrossMarketplaces(
  query: string,
  limitPerMarketplace = 4
): Promise<BijakBeliDiscoveredProduct[]> {
  if (!isVexoConfigured()) return [];

  const results = await Promise.allSettled(
    MARKETPLACE_KEYS.map((marketplace) => discoverProducts(query, marketplace))
  );

  const seen = new Set<string>();
  return results
    .flatMap((result) => (result.status === "fulfilled" ? result.value.slice(0, limitPerMarketplace) : []))
    .filter((product) => {
      const key = product.url || product.normalizedTitle;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 24);
}

export async function discoverProductImage(productName: string): Promise<string | null> {
  if (!isVexoConfigured()) return null;

  try {
    const result = await searchImagesWithFallback(`${productName} product`);
    const firstImage = result.data?.results?.[0];
    return firstImage?.imageUrl || null;
  } catch {
    return null;
  }
}

export async function translateForIndonesianShopping(text: string): Promise<string | null> {
  if (!isVexoConfigured()) return null;

  const safeText = sanitizeDiscoveryQuery(text).slice(0, 500);
  if (!safeText) return null;

  try {
    const result = await translateText(safeText, "id", "auto");
    return result.data?.translatedText || result.data?.text || null;
  } catch {
    return null;
  }
}

export async function getAIInsight(
  intent: VexoAIIntent,
  context: string
): Promise<string | null> {
  if (!isVexoConfigured()) return null;

  const prompts: Record<VexoAIIntent, string> = {
    "smart-search": `Analisis query pencarian ini dan ekstrak keyword, kategori, dan harga maksimum jika ada. Query: "${context}". Balas dalam format JSON: {"keyword":"...", "category":"...", "maxPrice": number|null}`,
    "product-summary": `Ringkas produk ini dalam 1 kalimat singkat dan informatif dalam bahasa Indonesia: ${context}`,
    "deal-verdict": `Berdasarkan data harga produk berikut, berikan rekomendasi singkat dalam 1-2 kalimat bahasa Indonesia: apakah layak dibeli sekarang, pantau, atau tunggu. JANGAN sebutkan nama marketplace atau toko spesifik karena tidak tersedia di data. Data: ${context}`,
    "product-matcher": `Apakah dua produk berikut kemungkinan produk yang sama? Jawab ya/tidak dengan alasan singkat: ${context}`,
    "general": context,
  };

  try {
    const result = await askAIWithFallback(prompts[intent]);
    return result.data?.response || null;
  } catch {
    return null;
  }
}
