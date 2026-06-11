import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateNextCrawlTime } from "@/lib/refresh-priority";

/**
 * GET /api/refresh/queue
 * Get current refresh queue (targets due for crawling)
 * 
 * Query params:
 * - limit: number (default 20) - Max targets to return
 * - status: "pending" | "in_progress" | "all" (default "all")
 * 
 * Used by crawler to fetch next targets to process
 */
export async function GET(request: Request) {
  try {
    // NOTE: This endpoint requires migration 110 to be applied first
    return NextResponse.json(
      {
        success: false,
        error: "Service not available",
        message: "This endpoint requires migration 110. Apply migration via Supabase dashboard first.",
      },
      { status: 503 }
    );

    /* IMPLEMENTATION READY - Uncomment after migration 110 applied
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "all";

    const supabase = await createClient();

    // NOTE: Requires migration 110 for crawl_targets table
    let query = supabase
      .from("crawl_targets")
      // @ts-expect-error - Table will exist after migration 110
      .select(`
        id,
        url,
        marketplace_id,
        product_id,
        priority_score,
        crawl_interval,
        last_crawled_at,
        next_crawl_at,
        status,
        marketplaces (name),
        products (name)
      `)
      .lte("next_crawl_at", new Date().toISOString())
      .order("priority_score", { ascending: false })
      .order("next_crawl_at", { ascending: true })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: targets, error } = await query;

    if (error) {
      console.error("Error fetching queue:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch queue" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        queue_length: targets?.length || 0,
        targets: (targets || []).map((t: any) => ({
          id: t.id,
          url: t.url,
          marketplace: t.marketplaces?.name,
          product_name: t.products?.name,
          priority_score: t.priority_score,
          last_crawled_at: t.last_crawled_at,
          next_crawl_at: t.next_crawl_at,
          status: t.status,
        })),
      },
    });
    */
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
