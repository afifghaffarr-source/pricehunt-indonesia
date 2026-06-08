export interface VexoBaseResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  cached?: boolean;
  timestamp?: string;
}

export interface VexoSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  imageUrl?: string;
  price?: string;
  source?: string;
}

export interface VexoSearchResponse extends VexoBaseResponse {
  data?: {
    results: VexoSearchResultItem[];
    query: string;
    totalResults?: number;
    searchEngine: "google" | "duckduckgo";
  };
}

export interface VexoImageResultItem {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  width?: number;
  height?: number;
}

export interface VexoImageResponse extends VexoBaseResponse {
  data?: {
    results: VexoImageResultItem[];
    query: string;
    searchEngine: "google" | "bing";
  };
}

export interface VexoAIResponse extends VexoBaseResponse {
  data?: {
    response: string;
    model: string;
    tokensUsed?: number;
  };
}

export interface VexoTranslateResponse extends VexoBaseResponse {
  data?: {
    translatedText?: string;
    text?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  };
}

export interface PriceHuntDiscoveredProduct {
  id: string;
  title: string;
  normalizedTitle: string;
  marketplace: "tokopedia" | "shopee" | "lazada" | "blibli" | "bukalapak" | "tiktok-shop" | "unknown";
  url: string;
  imageUrl?: string;
  priceText?: string;
  estimatedPrice: number | null;
  snippet?: string;
  source: "vexo-google" | "vexo-duckduckgo" | "vexo-image" | "mock";
  confidenceScore: number;
  discoveredAt: string;
}

export interface ProductDiscoverySource {
  engine: "google" | "duckduckgo";
  query: string;
  siteFilter?: string;
  resultCount: number;
  fetchedAt: string;
}

export interface VexoSearchParams {
  query: string;
  engine?: "google" | "duckduckgo";
  siteFilter?: string;
  limit?: number;
}

export interface VexoAIRequest {
  prompt: string;
  model?: "gptoss120b" | "glm47flash" | "duckai";
  context?: string;
}

export type VexoAIIntent =
  | "smart-search"
  | "product-summary"
  | "deal-verdict"
  | "product-matcher"
  | "general";

export interface VexoError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}
