export const VEXO_ENDPOINTS = {
  search: {
    google: "/api/search/google",
    duckduckgo: "/api/search/duckduckgo",
  },
  image: {
    google: "/api/search/googleimg",
    bing: "/api/search/bimg",
  },
  ai: {
    gptoss120b: "/api/ai/gptoss120b",
    glm47flash: "/api/ai/glm47flash",
    duckai: "/api/ai/duckai",
  },
  tools: {
    translate: "/api/tools/translate",
  },
} as const;

export type VexoSearchEngine = keyof typeof VEXO_ENDPOINTS.search;
export type VexoImageEngine = keyof typeof VEXO_ENDPOINTS.image;
export type VexoAIModel = keyof typeof VEXO_ENDPOINTS.ai;
export type VexoTool = keyof typeof VEXO_ENDPOINTS.tools;

export const MARKETPLACE_SITES: Record<string, string> = {
  tokopedia: "site:tokopedia.com",
  shopee: "site:shopee.co.id",
  bukalapak: "site:bukalapak.com",
  lazada: "site:lazada.co.id",
  blibli: "site:blibli.com",
  tiktok: "site:shop.tiktok.com",
};

export const AI_MODEL_PRIORITY: VexoAIModel[] = ["gptoss120b", "glm47flash", "duckai"];
export const IMAGE_ENGINE_PRIORITY: VexoImageEngine[] = ["google", "bing"];
export const SEARCH_ENGINE_PRIORITY: VexoSearchEngine[] = ["duckduckgo", "google"];