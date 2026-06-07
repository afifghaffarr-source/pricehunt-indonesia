import { VEXO_ENDPOINTS, type VexoSearchEngine, type VexoImageEngine, type VexoAIModel } from "./endpoints";
import { VexoAPIError, VexoTimeoutError, VexoConfigError } from "./errors";
import { getCache, setCache, buildCacheKey } from "./cache";
import type {
  VexoSearchResponse,
  VexoImageResponse,
  VexoAIResponse,
} from "./types";

function getConfig() {
  const baseUrl = process.env.VEXO_API_BASE_URL;
  const apiKey = process.env.VEXO_API_KEY;

  if (!baseUrl) throw new VexoConfigError("VEXO_API_BASE_URL");
  if (!apiKey) throw new VexoConfigError("VEXO_API_KEY");

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    timeoutMs: parseInt(process.env.VEXO_API_TIMEOUT_MS || "10000", 10),
  };
}

async function vexoFetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const config = getConfig();

  const url = new URL(endpoint, config.baseUrl);
  url.searchParams.set("key", config.apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const cacheKey = buildCacheKey(endpoint, params);
  const cached = getCache<T>(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new VexoAPIError({
        code: `VEXO_HTTP_${response.status}`,
        message: `VexoAPI returned ${response.status}`,
        statusCode: response.status,
        retryable: response.status >= 500,
      });
    }

    const data = (await response.json()) as T;
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof VexoAPIError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new VexoTimeoutError(config.timeoutMs);
    }
    throw new VexoAPIError({
      code: "VEXO_NETWORK_ERROR",
      message: err instanceof Error ? err.message : "Unknown network error",
      retryable: true,
    });
  }
}

export async function searchWeb(
  query: string,
  engine: VexoSearchEngine = "google"
): Promise<VexoSearchResponse> {
  const endpoint = VEXO_ENDPOINTS.search[engine];
  return vexoFetch<VexoSearchResponse>(endpoint, { query });
}

export async function searchImages(
  query: string,
  engine: VexoImageEngine = "google"
): Promise<VexoImageResponse> {
  const endpoint = VEXO_ENDPOINTS.image[engine];
  return vexoFetch<VexoImageResponse>(endpoint, { query });
}

export async function askAI(
  prompt: string,
  model: VexoAIModel = "gptoss120b"
): Promise<VexoAIResponse> {
  const endpoint = VEXO_ENDPOINTS.ai[model];
  return vexoFetch<VexoAIResponse>(endpoint, { prompt });
}

export function isVexoConfigured(): boolean {
  return !!(process.env.VEXO_API_BASE_URL && process.env.VEXO_API_KEY);
}
