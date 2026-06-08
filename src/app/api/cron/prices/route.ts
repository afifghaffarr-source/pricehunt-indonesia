import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require cron secret (fail closed)
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    // Type for price data from database
    interface PriceRow {
      id: string;
      product_id: string;
      marketplace_id: string;
      price: number;
      in_stock: boolean;
    }

    // ✅ Use admin client to bypass RLS for system operations
    const supabase = createAdminClient();
    const today = new Date().toISOString().split("T")[0];

    // ✅ PERFORMANCE FIX: Fetch all data in 2 queries instead of 1,500+
    const { data: products } = await supabase
      .from("products")
      .select("id, slug, lowest_price, highest_price");

    if (!products || products.length === 0) {
      return NextResponse.json({ message: "No products to update", updated: 0 });
    }

    // Fetch ALL prices at once (1 query instead of 100)
    const { data: allPrices } = await supabase
      .from("prices")
      .select("id, product_id, marketplace_id, price, in_stock");

    if (!allPrices || allPrices.length === 0) {
      return NextResponse.json({ message: "No prices to update", updated: 0 });
    }

    // ✅ Type assertion for Supabase query result
    const typedPrices = allPrices as PriceRow[];

    // ✅ Calculate updates in memory with proper types
    const priceUpdates: Array<{ id: string; price: number; last_updated: string }> = [];
    const historyRecords: Array<{ product_id: string; marketplace_id: string; price: number; recorded_at: string }> = [];
    const productStats = new Map<string, { prices: number[]; id: string }>();

    for (const priceRow of typedPrices) {
      // Simulate price fluctuation
      const fluctuation = 1 + (Math.random() - 0.5) * 0.06;
      const newPrice = Math.round(priceRow.price * fluctuation);

      // Collect price update
      priceUpdates.push({
        id: priceRow.id,
        price: newPrice,
        last_updated: new Date().toISOString(),
      });

      // Collect history record
      historyRecords.push({
        product_id: priceRow.product_id,
        marketplace_id: priceRow.marketplace_id,
        price: newPrice,
        recorded_at: today,
      });

      // Collect for product stats calculation
      if (priceRow.in_stock) {
        if (!productStats.has(priceRow.product_id)) {
          productStats.set(priceRow.product_id, { prices: [], id: priceRow.product_id });
        }
        productStats.get(priceRow.product_id)!.prices.push(newPrice);
      }
    }

    // ✅ BATCH UPDATE: Update all prices in batches of 500
    let pricesUpdated = 0;
    const BATCH_SIZE = 500;
    
    for (let i = 0; i < priceUpdates.length; i += BATCH_SIZE) {
      const batch = priceUpdates.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("prices")
        .upsert(batch as any, { onConflict: "id" });
      
      if (!error) {
        pricesUpdated += batch.length;
      }
    }

    // ✅ BATCH INSERT: Insert all history records in batches
    let historyInserted = 0;
    
    for (let i = 0; i < historyRecords.length; i += BATCH_SIZE) {
      const batch = historyRecords.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("price_history")
        .upsert(batch as any, { onConflict: "product_id,marketplace_id,recorded_at" });
      
      if (!error) {
        historyInserted += batch.length;
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
    
    for (let i = 0; i < productUpdates.length; i += BATCH_SIZE) {
      const batch = productUpdates.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("products")
        .upsert(batch as any, { onConflict: "id" });
      
      if (!error) {
        productsUpdated += batch.length;
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

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      products: products.length,
      pricesUpdated,
      historyInserted,
      productsUpdated,
      alertsSent,
      performance: "Optimized batch operations - reduced from 1500+ to ~5 queries",
    });
  } catch (err) {
    console.error("Cron job error:", err);
    return NextResponse.json(
      { error: "Cron job failed", details: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
