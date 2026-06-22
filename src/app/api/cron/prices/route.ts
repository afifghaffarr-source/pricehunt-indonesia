import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/api-auth";
import { isOfferInStock } from "@/lib/ingestion/adapter";
import { isPriceSimulationEnabled } from "@/lib/env";
import { withJobLogging } from "@/lib/job-logger";

export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require cron secret (fail closed)
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  // ✅ DATA TRUST: Check if price simulation is enabled
  // In production, this should be false. Real prices come from ingestion API.
  const enableSimulation = isPriceSimulationEnabled();

  // SAFETY GUARD: refuse to run simulation in production regardless of env
  // value. A misconfigured env var on a prod deploy would otherwise silently
  // overwrite every real offer price with a random ±3% perturbation.
  if (enableSimulation && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "ENABLE_PRICE_SIMULATION is not allowed in production",
      },
      { status: 503 }
    );
  }

  if (!enableSimulation) {
    return NextResponse.json({
      message: "Price simulation disabled. Real price updates should come from ingestion API or data sources.",
      simulation_enabled: false,
      note: "To enable simulation for testing, set ENABLE_PRICE_SIMULATION=true in .env"
    }, { status: 200 });
  }

  const result = await withJobLogging("cron_prices", async () => {
    try {
      // Type for offer data from database (A-002: post-114 schema)
      interface OfferRow {
        id: string;
        product_id: string;
        marketplace_id: string;
        current_price: number | null;
        stock_status: string | null;
        is_active: boolean | null;
        url: string | null;
      }

      // ✅ Use admin client to bypass RLS for system operations
      const supabase = createAdminClient();

      // ✅ PERFORMANCE FIX: Fetch all data in 2 queries instead of 1,500+
      const { data: products } = await supabase
        .from("products")
        .select("id, slug, lowest_price, highest_price");

      if (!products || products.length === 0) {
        return {
          success: true,
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
        };
      }

      // A-002: Fetch ALL offers at once from `offers` (post-114), not legacy `prices`.
      const { data: allOffers } = await supabase
        .from("offers")
        .select("id, product_id, marketplace_id, current_price, stock_status, is_active, url")
        .not("url", "like", "simulation://%");  // skip simulator's own rows

      if (!allOffers || allOffers.length === 0) {
        return {
          success: true,
          processedCount: 0,
          successCount: 0,
          failedCount: 0,
        };
      }

      const typedOffers = allOffers as OfferRow[];
      const offerUpdates: Array<{ id: string; current_price: number; last_checked_at: string }> = [];
      // P7-Post: snapshots are now written per offer (granular) instead of
      // per (product, marketplace, day). The legacy `price_history` insert
      // (one row per product+marketplace+date) is gone — `price_history`
      // was dropped in migration 129.
      const snapshotRecords: Array<{
        offer_id: string;
        current_price: number;
        stock_status: string;
        source: string;
        captured_at: string;
      }> = [];
      const productStats = new Map<string, { prices: number[]; id: string }>();

      for (const offerRow of typedOffers) {
        const currentPrice = offerRow.current_price ?? 0;
        if (currentPrice <= 0) continue;

        // Simulate price fluctuation
        const fluctuation = 1 + (Math.random() - 0.5) * 0.06;
        const newPrice = Math.round(currentPrice * fluctuation);

        // Collect offer update
        offerUpdates.push({
          id: offerRow.id,
          current_price: newPrice,
          last_checked_at: new Date().toISOString(),
        });

        // Collect snapshot record (per offer, granular chart data)
        snapshotRecords.push({
          offer_id: offerRow.id,
          current_price: newPrice,
          stock_status: offerRow.stock_status ?? "unknown",
          source: "manual_admin",
          captured_at: new Date().toISOString(),
        });

        // Collect for product stats calculation (only in-stock)
        const inStock = isOfferInStock(offerRow.stock_status, offerRow.is_active);
        if (inStock) {
          if (!productStats.has(offerRow.product_id)) {
            productStats.set(offerRow.product_id, { prices: [], id: offerRow.product_id });
          }
          productStats.get(offerRow.product_id)!.prices.push(newPrice);
        }
      }

      // ✅ BATCH UPDATE: Update all offers in batches of 500
      let offersUpdated = 0;
      let offersFailed = 0;
      const BATCH_SIZE = 500;

      for (let i = 0; i < offerUpdates.length; i += BATCH_SIZE) {
        const batch = offerUpdates.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from("offers")
          .upsert(batch as never, { onConflict: "id" });

        if (!error) {
          offersUpdated += batch.length;
        } else {
          offersFailed += batch.length;
          console.error("offers batch upsert failed:", error);
        }
      }

      // ✅ BATCH INSERT: Insert all snapshot records in batches
      let snapshotsInserted = 0;
      let snapshotsFailed = 0;

      for (let i = 0; i < snapshotRecords.length; i += BATCH_SIZE) {
        const batch = snapshotRecords.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from("price_snapshots")
          .insert(batch as never);

        if (!error) {
          snapshotsInserted += batch.length;
        } else {
          snapshotsFailed += batch.length;
          console.error("price_snapshots batch insert failed:", error);
        }
      }

      // ✅ BATCH UPDATE: Update product stats in batches
      const productUpdates: Array<{ id: string; lowest_price: number; highest_price: number; average_price: number; deal_score: number }> = [];

      for (const [productId, stats] of productStats) {
        if (stats.prices.length === 0) continue;

        const lowest = Math.min(...stats.prices);
        const highest = Math.max(...stats.prices);
        const avg = Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length);
        const score = Math.round(100 - ((avg - lowest) / avg) * 100);

        productUpdates.push({
          id: productId,
          lowest_price: lowest,
          highest_price: highest,
          average_price: avg,
          deal_score: score,
        });
      }

      let productsUpdated = 0;
      let productsFailed = 0;

      for (let i = 0; i < productUpdates.length; i += BATCH_SIZE) {
        const batch = productUpdates.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from("products")
          .upsert(batch as never, { onConflict: "id" });

        if (!error) {
          productsUpdated += batch.length;
        } else {
          productsFailed += batch.length;
          console.error("products batch upsert failed:", error);
        }
      }

      // Check and send price alerts (async, non-blocking)
      let alertsSent = 0;
      try {
        const { checkAndSendPriceAlerts } = await import("@/lib/email");
        const alertResult = await checkAndSendPriceAlerts();
        alertsSent = alertResult.sent;
      } catch (err) {
        console.error("Email alerts failed:", err);
        // Non-critical, continue
      }

      const totalFailed = offersFailed + snapshotsFailed + productsFailed;

      return {
        success: totalFailed === 0,
        processedCount: offerUpdates.length,
        successCount: offersUpdated + snapshotsInserted + productsUpdated,
        failedCount: totalFailed,
        errorSummary: totalFailed > 0 ? `${totalFailed} db operation(s) failed` : undefined,
        metadata: {
          offersUpdated,
          snapshotsInserted,
          productsUpdated,
          alertsSent,
          performance: "Optimized batch operations - reduced from 1500+ to ~5 queries",
        },
        result: {
          timestamp: new Date().toISOString(),
          products: products.length,
          offersUpdated,
          snapshotsInserted,
          productsUpdated,
          alertsSent,
        },
      };
    } catch (err) {
      console.error("Cron job error:", err);
      // Don't leak err.message to caller — it may contain internal SQL /
      // file path / Supabase error details that help attackers fingerprint
      // the schema. Full error is already logged server-side.
      throw err;
    }
  });

  if (!result) {
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
