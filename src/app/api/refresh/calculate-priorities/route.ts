import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateRefreshPriority } from "@/lib/refresh-priority";

/**
 * POST /api/refresh/calculate-priorities
 * Calculate refresh priorities for all crawl targets
 * 
 * Returns priority scores and suggested crawl times
 * Used by cron job to determine which targets to crawl next
 */
export async function POST(request: NextRequest) {
  try {
    // NOTE: This endpoint requires migration 110 to be applied first
    // Return 503 until database schema is ready
    return NextResponse.json(
      {
        success: false,
        error: "Service not available",
        message: "This endpoint requires migration 110. Apply migration via Supabase dashboard first.",
        migration_file: "supabase/migrations/110_enhanced_data_collection.sql"
      },
      { status: 503 }
    );

    /* IMPLEMENTATION READY - Uncomment after migration 110 applied
    
    const supabase = await createClient();

    const { data: targets, error } = await supabase
      .from("crawl_targets")
      .select(`
        id,
        url,
        marketplace_id,
        product_id,
        last_crawled_at,
        crawl_interval,
        status,
        marketplaces (name),
        products (
          id,
          name,
          wishlists (count),
          price_alerts (count)
        )
      `)
      .eq("status", "active");

    if (error) {
      console.error("Error fetching crawl targets:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch crawl targets" },
        { status: 500 }
      );
    }

    // Calculate priority for each target
    const priorities = await Promise.all(
      (targets || []).map(async (target: any) => {
        const hoursSinceLastCheck = target.last_crawled_at
          ? (Date.now() - new Date(target.last_crawled_at).getTime()) /
            (1000 * 60 * 60)
          : 999; // Never crawled = very high priority

        // Fetch additional metrics
        // @ts-expect-error - Table relationships will work after migration 110
        const { data: priceHistory } = await supabase
          .from("price_snapshots")
          .select("captured_at, price")
          .eq("product_id", target.product_id)
          .eq("marketplace_id", target.marketplace_id)
          .gte(
            "captured_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          )
          .order("captured_at", { ascending: false });

        const priceChangesLast30Days = priceHistory?.length || 0;

        // Calculate price volatility
        const prices = (priceHistory || []).map((h: any) => h.price);
        let priceVolatility = 0;
        if (prices.length > 1) {
          const mean = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
          const variance =
            prices.reduce((sum: number, p: number) => sum + Math.pow(p - mean, 2), 0) /
            prices.length;
          priceVolatility = Math.sqrt(variance) / mean;
        }

        // @ts-expect-error - Recheck requests table from migration 110
        const { data: recheckRequests } = await supabase
          .from("recheck_requests")
          .select("priority_score, status")
          .eq("product_id", target.product_id)
          .eq("marketplace_id", target.marketplace_id)
          .eq("status", "pending")
          .order("priority_score", { ascending: false })
          .limit(1);

        const hasOpenRecheckRequest = (recheckRequests?.length || 0) > 0;
        const recheckPriority = recheckRequests?.[0]?.priority_score > 70
          ? "high"
          : recheckRequests?.[0]?.priority_score > 40
          ? "normal"
          : "low";

        // TODO: Fetch view count from analytics
        const viewsLast7Days = 0;

        const priority = calculateRefreshPriority({
          hoursSinceLastCheck,
          wishlistCount: target.products?.wishlists?.length || 0,
          activeAlertCount: target.products?.price_alerts?.length || 0,
          viewsLast7Days,
          priceChangesLast30Days,
          priceVolatility,
          isPopularMarketplace: ["tokopedia", "shopee", "bukalapak"].includes(
            target.marketplaces?.name
          ),
          hasActivePromotion: false, // TODO: Implement promotion detection
          hasOpenRecheckRequest,
          recheckRequestPriority: recheckPriority as any,
        });

        return {
          target_id: target.id,
          url: target.url,
          product_name: target.products?.name,
          marketplace: target.marketplaces?.name,
          priority_score: priority.score,
          reason: priority.reason,
          suggested_frequency_hours: priority.suggestedFrequency,
          hours_since_last_check: hoursSinceLastCheck,
          last_crawled_at: target.last_crawled_at,
        suggestedAction,
      };
    });

    // Sort by priority descending
    priorities.sort((a, b) => b.priority_score - a.priority_score);

    return NextResponse.json({
      success: true,
      data: {
        total_targets: priorities.length,
        high_priority: priorities.filter((p) => p.priority_score >= 60).length,
        medium_priority: priorities.filter(
          (p) => p.priority_score >= 40 && p.priority_score < 60
        ).length,
        low_priority: priorities.filter((p) => p.priority_score < 40).length,
        priorities: priorities.slice(0, 50), // Return top 50
      },
    });
    */
  } catch (error) {
    console.error("Error calculating priorities:", error);
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
 * GET /api/refresh/calculate-priorities
 * Get current priority queue (read-only)
 */
export async function GET() {
  return POST(new NextRequest("http://localhost/api/refresh/calculate-priorities", {
    method: "POST",
  }));
}
