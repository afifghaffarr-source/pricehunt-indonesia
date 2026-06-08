import {
  VEXO_ENDPOINTS,
  AI_MODEL_PRIORITY,
  IMAGE_ENGINE_PRIORITY,
  SEARCH_ENGINE_PRIORITY,
  type VexoSearchEngine,
  type VexoImageEngine,
  type VexoAIModel,
  type VexoTool,
} from "./endpoints";
import { VexoAPIError, VexoTimeoutError, VexoConfigError } from "./errors";
import { getCache, setCache, buildCacheKey } from "./cache";
import type {
  VexoBaseResponse,
  VexoSearchResponse,
  VexoImageResponse,
  VexoAIResponse,
  VexoTranslateResponse,
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

export async function translateText(
  text: string,
  target = "id",
  source = "auto"
): Promise<VexoTranslateResponse> {
  const endpoint = VEXO_ENDPOINTS.tools.translate satisfies string;
  return vexoFetch<VexoTranslateResponse>(endpoint, { text, target, source });
}

export function isVexoConfigured(): boolean {
  return !!(process.env.VEXO_API_BASE_URL && process.env.VEXO_API_KEY);
}

// Fallback-aware functions that try services in priority order

export async function searchWebWithFallback(query: string): Promise<VexoSearchResponse> {
  const errors: Array<{ engine: VexoSearchEngine; error: string }> = [];

  for (const engine of SEARCH_ENGINE_PRIORITY) {
    try {
      const result = await searchWeb(query, engine);
      if (result.success && result.data?.results && result.data.results.length > 0) {
        return result;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ engine, error: message });
    }
  }

  throw new VexoAPIError({
    code: "VEXO_ALL_SEARCH_ENGINES_FAILED",
    message: `All search engines failed: ${errors.map(e => `${e.engine}: ${e.error}`).join(", ")}`,
    retryable: false,
  });
}

export async function searchImagesWithFallback(query: string): Promise<VexoImageResponse> {
  const errors: Array<{ engine: VexoImageEngine; error: string }> = [];

  for (const engine of IMAGE_ENGINE_PRIORITY) {
    try {
      const result = await searchImages(query, engine);
      if (result.success && result.data?.results && result.data.results.length > 0) {
        return result;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ engine, error: message });
    }
  }

  throw new VexoAPIError({
    code: "VEXO_ALL_IMAGE_ENGINES_FAILED",
    message: `All image engines failed: ${errors.map(e => `${e.engine}: ${e.error}`).join(", ")}`,
    retryable: false,
  });
}

export async function askAIWithFallback(prompt: string): Promise<VexoAIResponse> {
  const errors: Array<{ model: VexoAIModel; error: string }> = [];

  for (const model of AI_MODEL_PRIORITY) {
    try {
      const result = await askAI(prompt, model);
      if (result.success && result.data?.response) {
        return result;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ model, error: message });
    }
  }

  throw new VexoAPIError({
    code: "VEXO_ALL_AI_MODELS_FAILED",
    message: `All AI models failed: ${errors.map(e => `${e.model}: ${e.error}`).join(", ")}`,
    retryable: false,
  });
}

export async function callVexoTool(
  tool: VexoTool,
  params: Record<string, string>
): Promise<VexoBaseResponse> {
  return vexoFetch<VexoBaseResponse>(VEXO_ENDPOINTS.tools[tool], params);
}
