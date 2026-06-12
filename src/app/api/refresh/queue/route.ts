import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/refresh/queue
 * Get current refresh queue (targets due for crawling)
 * 
 * Query params:
 * - limit: number (default 20) - Max targets to return
 * - status: "queued" | "processing" | "all" (default "queued")
 * 
 * Used by crawler to fetch next targets to process
 * 
 * Auth: Requires INGESTION_SECRET header for security
 */
export async function GET(request: Request) {
  try {
    // Verify authorization (same secret as ingestion API)
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.INGESTION_SECRET;

    if (!expectedSecret) {
      console.error("INGESTION_SECRET not configured");
      return NextResponse.json(
        { success: false, error: "Service not configured" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Bearer token required" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const providedSecret = authHeader.substring(7); // Remove "Bearer "
    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid token" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const statusFilter = searchParams.get("status") || "pending";

    const supabase = createAdminClient();

    let query = supabase
      .from("crawl_targets")
      .select(`
        id,
        url,
        marketplace_id,
        product_id,
        priority_score,
        last_crawled_at,
        next_crawl_at,
        crawl_status,
        marketplaces (name),
        products (name)
      `)
      .or(`next_crawl_at.is.null,next_crawl_at.lte.${new Date().toISOString()}`)
      .order("priority_score", { ascending: false })
      .order("next_crawl_at", { ascending: true })
      .limit(limit);

    if (statusFilter !== "all") {
      query = query.eq("crawl_status", statusFilter);
    }

    const { data: targets, error } = await query;

    if (error) {
      console.error("Error fetching queue:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch queue" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
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
            status: t.crawl_status,
          })),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
