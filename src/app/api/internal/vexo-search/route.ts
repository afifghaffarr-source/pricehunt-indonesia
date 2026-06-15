/**
 * Internal API: VexoAPI-backed marketplace search (Phase 8, P8.1)
 *
 * Runs entirely server-side so the VEXO_API_KEY (VIP key) never leaves
 * the Vercel runtime. The Python collector at `collectors/phase8_vexo_collector.py`
 * calls this endpoint with INGESTION_SECRET as bearer auth.
 *
 * Pipeline per request:
 *   1. VexoAPI Google search with `site:<marketplace> <product name>`
 *   2. AI (gpt-oss-120b) extracts current_price IDR + product_name from snippet
 *   3. Returns structured results for upsert into `offers` + `price_snapshots`
 *
 * Security:
 *   - Auth: INGESTION_SECRET (matches existing /api/ingestion pattern)
 *   - Rate limit: 60/hour per IP (collectors can be aggressive)
 *   - No public access (route lives under /api/internal/)
 *
 * Caveat: VexoAPI `/tools/marketplace` returns MOCK data as of 2026-06-15,
 * so we go the indirect route (search + AI extract). Confidence is medium
 * — works for products with rich Google snippets (price shown in title).
 */

import { NextRequest, NextResponse } from "next/server";
import { checkPersistentRateLimit, getRequestIdentifier } from "@/lib/rate-limit";

const VEXO_BASE = process.env.VEXO_API_BASE_URL || "https://vexoapi.dev";
const VEXO_KEY = process.env.VEXO_API_KEY || "";
const INGESTION_SECRET = process.env.INGESTION_SECRET || "";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 60;

// Map of marketplace slugs → Google `site:` filter. Matches MARKETPLACE_SITES
// in src/lib/vexo/endpoints.ts.
const SITE_FILTERS: Record<string, string> = {
  tokopedia: "site:tokopedia.com",
  shopee: "site:shopee.co.id",
  bukalapak: "site:bukalapak.com",
  lazada: "site:lazada.co.id",
  blibli: "site:blibli.com",
  tiktok: "site:shop.tiktok.com",
};

interface SearchResult {
  marketplace: string;
  url: string;
  title: string;
  snippet: string;
  price_idr: number | null;
  product_name: string | null;
  confidence: "high" | "medium" | "low" | "none";
  source: "vexo-search+ai";
}

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function vexoGet(path: string, params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({ key: VEXO_KEY, ...params }).toString();
  const res = await fetch(`${VEXO_BASE}${path}?${qs}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "bijakbeli-collector/1.0" },
  });
  if (!res.ok) {
    throw new Error(`VexoAPI ${path} returned ${res.status}`);
  }
  return res.json();
}

async function vexoAi(prompt: string, context: string): Promise<string | null> {
  // Try primary model (gpt-oss-120b), fallback to duckai if needed.
  const models = ["gptoss120b", "duckai"];
  for (const model of models) {
    try {
      const res = await fetch(
        `${VEXO_BASE}/api/ai/${model}?key=${VEXO_KEY}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(20_000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, context }),
        }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        result?: string | { text?: string };
        data?: { result?: string | { text?: string } };
      };
      const result = data.result || data.data?.result;
      if (typeof result === "string") return result;
      if (typeof result === "object" && result && "text" in result) {
        return result.text ?? null;
      }
    } catch (err) {
      console.error(`[vexo-search] ${model} failed:`, err);
    }
  }
  return null;
}

function extractJsonFromText(text: string): Record<string, unknown> | null {
  // Strip markdown code fences if present
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // Try direct parse
  try {
    return JSON.parse(stripped);
  } catch {
    // Find first {...} block
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

interface SearchRequest {
  query: string; // Product name, e.g. "iPhone 15 Pro Max 256GB"
  marketplaces?: string[]; // Defaults to all 6
  max_per_marketplace?: number; // Defaults to 1 (top result)
}

export async function POST(request: NextRequest) {
  // 1. Auth — INGESTION_SECRET bearer token
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "").trim();

  if (!INGESTION_SECRET) {
    return json({ error: "INGESTION_SECRET not configured on server" }, { status: 500 });
  }
  if (!secret || secret !== INGESTION_SECRET) {
    return json({ error: "Unauthorized. Valid INGESTION_SECRET required." }, { status: 401 });
  }

  // 2. Rate limit (per IP)
  const rl = await checkPersistentRateLimit({
    identifier: getRequestIdentifier("vexo-internal", request),
    endpoint: "vexo-internal-search",
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rl.allowed) {
    return json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

  // 3. Validate input
  if (!VEXO_KEY) {
    return json({ error: "VEXO_API_KEY not configured on server" }, { status: 500 });
  }

  let body: SearchRequest;
  try {
    body = (await request.json()) as SearchRequest;
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query, marketplaces, max_per_marketplace = 1 } = body;
  if (!query || typeof query !== "string" || query.length > 200) {
    return json({ error: "Field 'query' required (string, max 200 chars)" }, { status: 400 });
  }

  const targets = marketplaces && marketplaces.length > 0 ? marketplaces : Object.keys(SITE_FILTERS);
  const invalid = targets.filter((m) => !(m in SITE_FILTERS));
  if (invalid.length > 0) {
    return json(
      { error: `Unknown marketplace(s): ${invalid.join(", ")}. Valid: ${Object.keys(SITE_FILTERS).join(", ")}` },
      { status: 400 }
    );
  }

  // 4. For each marketplace: search → AI extract → return structured
  const results: SearchResult[] = [];
  const errors: Array<{ marketplace: string; error: string }> = [];

  await Promise.all(
    targets.map(async (marketplace) => {
      const siteFilter = SITE_FILTERS[marketplace];
      const searchQuery = `${siteFilter} ${query}`;
      try {
        const searchResp = (await vexoGet("/api/search/google", { q: searchQuery })) as {
          results?: Array<{ title: string; url: string; snippet?: string; description?: string; body?: string }>;
          data?: { results?: Array<{ title: string; url: string; snippet?: string }> };
        };
        const items = (searchResp.results || searchResp.data?.results || []) as Array<{
          title?: string;
          url?: string;
          snippet?: string;
          description?: string;
          body?: string;
        }>;
        const top = items.slice(0, max_per_marketplace);

        for (const item of top) {
          const title = (item.title || "").toString();
          const url = (item.url || "").toString();
          const snippet = (item.snippet || item.description || item.body || "").toString();
          const baseResult: SearchResult = {
            marketplace,
            url,
            title,
            snippet,
            price_idr: null,
            product_name: null,
            confidence: "none",
            source: "vexo-search+ai",
          };

          // AI extraction — try to get price from snippet/title
          if (snippet || title) {
            const prompt = `Extract the product price in Indonesian Rupiah (IDR) from this Google search result. Reply with ONLY a JSON object in this exact format:
{"price_idr": <integer or null>, "product_name": "<string or null>", "confidence": "<high|medium|low>"}
- "price_idr" is the current selling price in IDR (convert from "Rp 1.234.000" format to integer, e.g. 1234000)
- "product_name" is the actual product name from the result
- "confidence" is "high" if price is clearly stated, "medium" if inferred, "low" if uncertain
If no price is shown, return {"price_idr": null, "product_name": null, "confidence": "low"}.`;
            const context = `Title: ${title}\nURL: ${url}\nSnippet: ${snippet}`;
            const aiText = await vexoAi(prompt, context);
            if (aiText) {
              const parsed = extractJsonFromText(aiText);
              if (parsed) {
                const price = parsed.price_idr;
                if (typeof price === "number" && price > 0) {
                  baseResult.price_idr = price;
                }
                if (typeof parsed.product_name === "string") {
                  baseResult.product_name = parsed.product_name;
                }
                if (parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low") {
                  baseResult.confidence = parsed.confidence;
                }
              }
            }
          }

          results.push(baseResult);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ marketplace, error: msg });
      }
    })
  );

  // 5. Sort: results with price first, then by marketplace name
  results.sort((a, b) => {
    if (a.price_idr && !b.price_idr) return -1;
    if (!a.price_idr && b.price_idr) return 1;
    return a.marketplace.localeCompare(b.marketplace);
  });

  return json({
    success: true,
    query,
    marketplaces_searched: targets,
    results_count: results.length,
    results_with_price: results.filter((r) => r.price_idr !== null).length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
