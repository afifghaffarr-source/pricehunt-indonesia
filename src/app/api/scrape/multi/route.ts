import { NextRequest, NextResponse } from "next/server";
import { MultiStrategyShoppingScraper } from "@/lib/scraper/multi-strategy-shopping-adapter";

export const runtime = "nodejs";

/**
 * Multi-Strategy Shopping Scraper API
 * 
 * Combines 3 free strategies:
 * 1. DuckDuckGo API (JSON, no scraping)
 * 2. Bing Search (HTML parsing)
 * 3. DuckDuckGo HTML (fallback)
 * 
 * Then enriches with price/metadata from:
 * 4. Shopee internal API (if shopid/itemid in URL)
 * 5. Tokopedia internal API
 * 6. OpenGraph/JSON-LD fallback
 * 
 * POST /api/scrape/multi
 * Body: { query: string, limit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query is required and must be a string" },
        { status: 400 }
      );
    }

    if (query.length > 200) {
      return NextResponse.json(
        { error: "query must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (limit && (typeof limit !== "number" || limit < 1 || limit > 20)) {
      return NextResponse.json(
        { error: "limit must be a number between 1 and 20" },
        { status: 400 }
      );
    }

    console.log(`[API /api/scrape/multi] Query: "${query}", limit: ${limit || 10}`);

    const scraper = new MultiStrategyShoppingScraper();
    const results = await scraper.search(query, limit || 10);

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results,
      strategies: ["duckduckgo-api", "bing", "duckduckgo-html", "shopee-api", "tokopedia-api", "og-meta"],
    });
  } catch (error) {
    console.error("[API /api/scrape/multi] Error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Failed to search shopping results",
        message,
      },
      { status: 500 }
    );
  }
}