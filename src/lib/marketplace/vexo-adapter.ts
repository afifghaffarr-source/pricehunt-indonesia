import { searchWeb, askAI, searchImages, isVexoConfigured } from "@/lib/vexo/client";
import { normalizeSearchResult } from "@/lib/vexo/normalizers";
import { MARKETPLACE_SITES } from "@/lib/vexo/endpoints";
import type { PriceHuntDiscoveredProduct, VexoAIIntent } from "@/lib/vexo/types";

export async function discoverProducts(
  query: string,
  marketplace?: string
): Promise<PriceHuntDiscoveredProduct[]> {
  if (!isVexoConfigured()) return [];

  const siteFilter = marketplace ? MARKETPLACE_SITES[marketplace] : undefined;
  const searchQuery = siteFilter ? `${query} ${siteFilter}` : query;

  const [googleResults, ddgResults] = await Promise.allSettled([
    searchWeb(searchQuery, "google"),
    searchWeb(searchQuery, "duckduckgo"),
  ]);

  const products: PriceHuntDiscoveredProduct[] = [];

  if (googleResults.status === "fulfilled" && googleResults.value.data?.results) {
    for (const item of googleResults.value.data.results) {
      products.push(normalizeSearchResult(item, "vexo-google", marketplace));
    }
  }

  if (ddgResults.status === "fulfilled" && ddgResults.value.data?.results) {
    for (const item of ddgResults.value.data.results) {
      products.push(normalizeSearchResult(item, "vexo-duckduckgo", marketplace));
    }
  }

  return products
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 20);
}

export async function discoverProductImage(productName: string): Promise<string | null> {
  if (!isVexoConfigured()) return null;

  try {
    const result = await searchImages(`${productName} product`, "google");
    const firstImage = result.data?.results?.[0];
    return firstImage?.imageUrl || null;
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
    "deal-verdict": `Berdasarkan data berikut, apakah produk ini layak dibeli sekarang atau tunggu? Jawab 2-3 kalimat dalam bahasa Indonesia: ${context}`,
    "product-matcher": `Apakah dua produk berikut kemungkinan produk yang sama? Jawab ya/tidak dengan alasan singkat: ${context}`,
    "general": context,
  };

  try {
    const result = await askAI(prompts[intent], "gptoss120b");
    return result.data?.response || null;
  } catch {
    return null;
  }
}
