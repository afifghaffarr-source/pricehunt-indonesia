import { NextRequest, NextResponse } from "next/server";
import { BraveSearchShoppingAdapter } from "@/lib/scraper/brave-search-shopping-adapter";

export const runtime = "nodejs";

/**
 * Brave Search Shopping Scraper API
 * 
 * Uses DuckDuckGo HTML scraping (free) or Brave Search API (if BRAVE_SEARCH_API_KEY set)
 * 
 * POST /api/scrape/shopping
 * Body: { query: string, limit?: number }
 * 
 * Returns: Array of ScrapeResult from marketplace searches
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

    if (limit && (typeof limit !== "number" || limit < 1 || limit > 50)) {
      return NextResponse.json(
        { error: "limit must be a number between 1 and 50" },
        { status: 400 }
      );
    }

    console.log(`[API /api/scrape/shopping] Query: "${query}", limit: ${limit || 10}`);

    const adapter = new BraveSearchShoppingAdapter({ 
      maxResults: limit || 10,
      country: "id" 
    });
    
    const results = await adapter.search(query, limit);
    
    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("[API /api/scrape/shopping] Error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    if (message.includes("HTTP 429") || message.includes("rate limit")) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded",
          message: "Too many requests to search engine",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to search shopping results",
        message,
      },
      { status: 500 }
    );
  }
}
