import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { getIngestionSecret, safeEqual } from "@/lib/env";

/**
 * Local row-shape alias for the `crawl_targets` table. The Supabase
 * generated `Row` type is fully type-safe; this alias keeps the route
 * file readable and follows the convention from `offers.ts`.
 */
type CrawlTargetRow = Database["public"]["Tables"]["crawl_targets"]["Row"];
type CrawlTargetInsert = Database["public"]["Tables"]["crawl_targets"]["Insert"];

/**
 * POST /api/refresh/trigger
 * Manually trigger a refresh for specific targets
 * 
 * Body:
 * - target_ids: string[] - Crawl target IDs to refresh
 * - force: boolean - Bypass priority checks
 * 
 * Enqueues targets for immediate crawling by browser collector
 * 
 * Auth: Requires INGESTION_SECRET header for security
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = getIngestionSecret();

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

    const providedSecret = authHeader.substring(7);
    // Constant-time compare to prevent timing-side-channel recovery of
    // the bearer token. See src/lib/env.ts `safeEqual`.
    if (!safeEqual(providedSecret, expectedSecret)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid token" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json();
    const { target_ids } = body;

    if (!Array.isArray(target_ids) || target_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "target_ids array required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (target_ids.length > 100) {
      return NextResponse.json(
        { success: false, error: "Maximum 100 targets per request" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = createAdminClient();

    const { data: targets, error: fetchError } = await supabase
      .from("crawl_targets")
      .select("*")
      .in("id", target_ids);

    if (fetchError) {
      console.error("Error fetching targets:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch targets" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json(
        { success: false, error: "No targets found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Update next_crawl_at to now (immediate priority). Include `url`
    // in each row so the array matches the `Insert` type that
    // `upsert()` accepts.
    const updates: CrawlTargetInsert[] = targets.map((target: CrawlTargetRow) => ({
      id: target.id,
      url: target.url,
      next_crawl_at: new Date().toISOString(),
      crawl_status: "queued",
      updated_at: new Date().toISOString(),
    }));

    const { error: updateError } = await supabase
      .from("crawl_targets")
      .upsert(updates);

    if (updateError) {
      console.error("Error updating targets:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to enqueue targets" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          enqueued_count: targets.length,
          targets: targets.map((t: CrawlTargetRow) => ({
            id: t.id,
            url: t.url,
            next_crawl_at: new Date().toISOString(),
          })),
        },
        message: `${targets.length} target(s) enqueued for refresh`,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error triggering refresh:", error);
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

/**
 * GET /api/refresh/trigger?target_id=xxx
 * Convenience method for single target refresh
 */
export async function GET(request: NextRequest) {
// Pre-existing refresh trigger typing (Phase 5). replace `any` usages with proper types.

  const searchParams = request.nextUrl.searchParams;
  const targetId = searchParams.get("target_id");

  if (!targetId) {
    return NextResponse.json(
      { success: false, error: "target_id query parameter required" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Forward to POST handler
  const url = new URL(request.url);
  return POST(
    new NextRequest(url, {
      method: "POST",
      body: JSON.stringify({ target_ids: [targetId], force: false }),
      headers: request.headers,
    })
  );
}
