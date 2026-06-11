import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateNextCrawlTime } from "@/lib/refresh-priority";

/**
 * POST /api/refresh/trigger
 * Manually trigger a refresh for specific targets
 * 
 * Body:
 * - target_ids: string[] - Crawl target IDs to refresh
 * - force: boolean - Bypass priority checks
 * 
 * Enqueues targets for immediate crawling by browser collector
 */
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { target_ids, force = false } = body;

    if (!Array.isArray(target_ids) || target_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "target_ids array required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // NOTE: Requires migration 110 for crawl_targets table
    // @ts-expect-error - Table will exist after migration 110
    const { data: targets, error: fetchError } = await supabase
      .from("crawl_targets")
      .select("*")
      .in("id", target_ids);

    if (fetchError) {
      console.error("Error fetching targets:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch targets" },
        { status: 500 }
      );
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json(
        { success: false, error: "No targets found" },
        { status: 404 }
      );
    }

    // Update next_crawl_at to now (immediate priority)
    const updates = targets.map((target: any) => ({
      id: target.id,
      next_crawl_at: new Date().toISOString(),
      status: "pending",
      updated_at: new Date().toISOString(),
    }));

    // @ts-expect-error - Upsert will work after migration 110
    const { error: updateError } = await supabase
      .from("crawl_targets")
      .upsert(updates);

    if (updateError) {
      console.error("Error updating targets:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to enqueue targets" },
        { status: 500 }
      );
    }

    // TODO: Trigger actual crawler (Python browser collector or cron job)
    // This would typically:
    // 1. Send webhook to crawler service
    // 2. Or add to Redis queue
    // 3. Or trigger background job

    return NextResponse.json({
      success: true,
      data: {
        enqueued_count: targets.length,
        targets: targets.map((t: any) => ({
          id: t.id,
          url: t.url,
          next_crawl_at: new Date().toISOString(),
        })),
      },
      message: `${targets.length} target(s) enqueued for refresh`,
    });
    */
  } catch (error) {
    console.error("Error triggering refresh:", error);
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

/**
 * GET /api/refresh/trigger?target_id=xxx
 * Convenience method for single target refresh
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetId = searchParams.get("target_id");

  if (!targetId) {
    return NextResponse.json(
      { success: false, error: "target_id query parameter required" },
      { status: 400 }
    );
  }

  // Forward to POST handler
  return POST(
    new NextRequest(request.url, {
      method: "POST",
      body: JSON.stringify({ target_ids: [targetId], force: false }),
      headers: { "Content-Type": "application/json" },
    })
  );
}
