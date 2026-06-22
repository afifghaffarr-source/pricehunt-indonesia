import { NextRequest, NextResponse } from "next/server";
import { ShopeeCamoufoxAdapter } from "@/lib/scraper/shopee-camoufox-adapter";

export const runtime = "nodejs";

/**
 * Shopee Scraper API (Proof of Concept)
 * 
 * POST /api/scrape/shopee
 * Body: { keyword: string, limit?: number }
 * 
 * Returns: Array of ScrapeResult from Shopee Internal API v4
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, limit } = body;

    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json(
        { error: "keyword is required and must be a string" },
        { status: 400 }
      );
    }

    if (keyword.length > 200) {
      return NextResponse.json(
        { error: "keyword must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (limit && (typeof limit !== "number" || limit < 1 || limit > 50)) {
      return NextResponse.json(
        { error: "limit must be a number between 1 and 50" },
        { status: 400 }
      );
    }

    console.log(`[API /api/scrape/shopee] Searching for: "${keyword}", limit: ${limit || 20}`);

    const adapter = new ShopeeCamoufoxAdapter();
    await adapter.init();
    try {
      const results = await adapter.search(keyword, limit);
      await adapter.close();
      return NextResponse.json({
        success: true,
        keyword,
        count: results.length,
        results,
      });
    } catch (error) {
      await adapter.close();
      throw error;
    }
  } catch (error) {
    console.error("[API /api/scrape/shopee] Error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Specific error handling
    if (message.includes("HTTP 403") || message.includes("blocked")) {
      return NextResponse.json(
        { 
          error: "Shopee API blocked request",
          message: "Shopee's anti-bot protection rejected the request. This may require Playwright stealth mode.",
          solution: "Consider using Playwright with stealth plugin or switch to Apify/ScrapingBee",
        },
        { status: 403 }
      );
    }

    if (message.includes("HTTP 429") || message.includes("rate limit")) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded",
          message: "Too many requests to Shopee API",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to scrape Shopee",
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scrape/shopee?keyword=xxx&limit=20
 * Alternative GET endpoint for convenience
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const limitParam = searchParams.get("limit");

    if (!keyword) {
      return NextResponse.json(
        { error: "keyword query parameter is required" },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    if (limit && (isNaN(limit) || limit < 1 || limit > 50)) {
      return NextResponse.json(
        { error: "limit must be a number between 1 and 50" },
        { status: 400 }
      );
    }

    console.log(`[API /api/scrape/shopee GET] Searching for: "${keyword}", limit: ${limit || 20}`);

    const adapter = new ShopeeCamoufoxAdapter();
    await adapter.init();
    try {
      const results = await adapter.search(keyword, limit);
      await adapter.close();
      return NextResponse.json({
        success: true,
        keyword,
        count: results.length,
        results,
      });
    } catch (error) {
      await adapter.close();
      throw error;
    }
  } catch (error) {
    console.error("[API /api/scrape/shopee GET] Error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to scrape Shopee", message },
      { status: 500 }
    );
  }
}
