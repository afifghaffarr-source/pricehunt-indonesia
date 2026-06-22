import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { getIngestionSecret } from "@/lib/env";

/**
 * Row shape used by the calculate-priorities handler. Joins the
 * `marketplaces` and `products` tables for human-readable names.
 * Supabase returns these as either a single object or an array
 * depending on the FK relationship, so both shapes are allowed.
 */
type CrawlTargetWithJoins = Pick<
  Database["public"]["Tables"]["crawl_targets"]["Row"],
  "id" | "url" | "marketplace_id" | "product_id" | "last_crawled_at" | "crawl_status" | "priority_score"
> & {
  marketplaces: { name: string } | { name: string }[] | null;
  products: { name: string } | { name: string }[] | null;
};

/**
 * Supabase FK embeds return either a single object, an array of
 * objects, or null. This helper extracts the `name` from whichever
 * shape comes back, defaulting to "Unknown" when nothing usable is
 * present.
 */
function extractJoinName(
  value: { name: string } | { name: string }[] | null | undefined
): string {
  if (!value) return "Unknown";
  if (Array.isArray(value)) return value[0]?.name || "Unknown";
  return value.name || "Unknown";
}

/**
 * POST /api/refresh/calculate-priorities
 * Calculate refresh priorities for all crawl targets
 * 
 * Returns priority scores and suggested crawl times
 * Used by cron job to determine which targets to crawl next
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
    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid token" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = createAdminClient();

    // Fetch all active crawl targets. The Supabase generated types
    // don't list relationships for `crawl_targets` (Relationships: []
    // in src/lib/supabase/types.ts), so PostgREST can resolve the
    // `marketplaces(name)` and `products(name)` joins at runtime but
    // TS doesn't know the shape. We cast to `CrawlTargetWithJoins[]`
    // immediately after the query — this is the cleanest way to get
    // a typed callback downstream without needing a full type regen.
    const { data: rawTargets, error } = await supabase
      .from("crawl_targets")
      .select(`
        id,
        url,
        marketplace_id,
        product_id,
        last_crawled_at,
        crawl_status,
        priority_score,
        marketplaces (name),
        products (name)
      `)
      .in("crawl_status", ["queued", "failed"]);

    if (error) {
      console.error("Error fetching crawl targets:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch crawl targets" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const targets = (rawTargets ?? []) as unknown as CrawlTargetWithJoins[];

    if (!targets || targets.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            total_targets: 0,
            high_priority: 0,
            medium_priority: 0,
            low_priority: 0,
            priorities: [],
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Calculate priorities for each target
    const priorities = targets.map((target: CrawlTargetWithJoins) => {
      const hoursSinceLastCheck = target.last_crawled_at
        ? (Date.now() - new Date(target.last_crawled_at).getTime()) / (1000 * 60 * 60)
        : 999; // Never crawled = very high priority

      // Base priority calculation
      let calculatedScore = target.priority_score || 50;

      // Boost priority if not checked recently
      if (hoursSinceLastCheck > 168) {
        // > 7 days
        calculatedScore = Math.min(100, calculatedScore + 30);
      } else if (hoursSinceLastCheck > 72) {
        // > 3 days
        calculatedScore = Math.min(100, calculatedScore + 20);
      } else if (hoursSinceLastCheck > 24) {
        // > 1 day
        calculatedScore = Math.min(100, calculatedScore + 10);
      }

      // Boost failed targets
      if (target.crawl_status === "failed") {
        calculatedScore = Math.min(100, calculatedScore + 15);
      }

      const suggestedFrequency =
        calculatedScore >= 70 ? 6 : calculatedScore >= 50 ? 12 : 24;

      return {
        target_id: target.id,
        url: target.url,
        product_name: extractJoinName(target.products),
        marketplace: extractJoinName(target.marketplaces),
        priority_score: calculatedScore,
        current_status: target.crawl_status,
        hours_since_last_check: Math.round(hoursSinceLastCheck * 10) / 10,
        last_crawled_at: target.last_crawled_at,
        suggested_frequency_hours: suggestedFrequency,
        reason:
          hoursSinceLastCheck > 168
            ? "Not checked for over 7 days"
            : hoursSinceLastCheck > 72
            ? "Not checked for over 3 days"
            : target.crawl_status === "failed"
            ? "Previous crawl failed"
            : "Regular refresh cycle",
      };
    });

    // Sort by priority descending
    priorities.sort((a, b) => b.priority_score - a.priority_score);

    const stats = {
      total_targets: priorities.length,
      high_priority: priorities.filter((p) => p.priority_score >= 70).length,
      medium_priority: priorities.filter(
        (p) => p.priority_score >= 50 && p.priority_score < 70
      ).length,
      low_priority: priorities.filter((p) => p.priority_score < 50).length,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          ...stats,
          priorities: priorities.slice(0, 50), // Return top 50
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error calculating priorities:", error);
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
 * GET /api/refresh/calculate-priorities
 * Get current priority queue (read-only)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
