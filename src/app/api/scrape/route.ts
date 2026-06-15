import { NextRequest, NextResponse } from "next/server";
import { scrapeAllMarketplaces, generateScrapeReport } from "@/lib/scraper";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import type { Database } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  // ✅ SECURITY: Require admin authentication (expensive operation)
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  // ⚠️ DATA TRUST WARNING: This endpoint uses simulated/demo scraper
  // Real price data should come from ingestion API with proper source tracking
  // This is for development/testing only
  const enableSimulation = process.env.ENABLE_PRICE_SIMULATION === 'true';
  
  if (!enableSimulation) {
    return NextResponse.json({
      error: "Scrape simulation disabled",
      message: "Real scraping should be done via Python browser collector + ingestion API",
      simulation_enabled: false,
      note: "Set ENABLE_PRICE_SIMULATION=true to enable demo scraping"
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    // ✅ Use admin client since admin is already verified
    const supabase = createAdminClient();
    
    // Type for product query result
    interface ProductRow {
      id: string;
      name: string;
      lowest_price: number | null;
    }
    
    // Type for price upsert (Supabase types may be outdated)
    interface PriceUpsertData {
      product_id: string;
      marketplace_id: string;
      price: number;
      url: string;
      seller: string | null;
      seller_rating: number | null;
      in_stock: boolean;
      shipping_cost: number | null;
      last_updated: string;
    }
    
    const { data: productData } = await supabase
      .from("products")
      .select("id, name, lowest_price")
      .eq("id", productId)
      .single();

    if (!productData) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    const product = productData as ProductRow;
    const basePrice = product.lowest_price || 1000000;
    const results = await scrapeAllMarketplaces(product.name, basePrice);
    const report = generateScrapeReport(results);

    // Type for marketplace query result
    interface MarketplaceRow {
      id: string;
      name: string;
    }

    const { data: marketplacesData } = await supabase
      .from("marketplaces")
      .select("id, name");

    const marketplaces = (marketplacesData || []) as MarketplaceRow[];
    const mpMap = new Map(marketplaces.map((m) => [m.name, m.id]));

    let updated = 0;
    for (const result of results) {
      const mpId = mpMap.get(result.marketplace);
      if (!mpId) continue;

      // A-002: write to `offers` (post-114) instead of legacy `prices`.
      // Select an existing url for the (product, marketplace) tuple so the
      // upsert can target the unique url index. Fall back to a synthetic URL.
      const { data: existingOffers } = await supabase
        .from("offers")
        .select("id, url")
        .eq("product_id", product.id)
        .eq("marketplace_id", mpId)
        .maybeSingle();

      const offerUrl =
        result.url ||
        (existingOffers as { url: string | null } | null)?.url ||
        `simulation://${product.id}/${mpId}`;

      await supabase.from("offers").upsert(
        {
          product_id: product.id,
          marketplace_id: mpId,
          current_price: result.price,
          url: offerUrl,
          seller_name: result.seller,
          seller_rating: result.sellerRating,
          stock_status: result.inStock ? "in_stock" : "out_of_stock",
          shipping_estimate: result.shippingCost,
          source: "browser_collector",
          last_checked_at: result.scrapedAt,
          is_active: true,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "url" }
      );
      updated++;
    }

    if (report.lowest) {
      const allPrices = results.filter((r) => r.inStock).map((r) => r.price);
      if (allPrices.length > 0) {
        const lowest = Math.min(...allPrices);
        const highest = Math.max(...allPrices);
        const avg = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
        const score = Math.round(100 - ((avg - lowest) / avg) * 100);

        // Admin client bypasses type checking (defensive cast for the
        // chained .update().eq() call which supabase-js types as a builder).
        await (supabase.from("products") as unknown as {
          update: (values: Database["public"]["Tables"]["products"]["Update"]) => {
            eq: (col: string, val: string) => Promise<unknown>;
          };
        })
          .update({
            lowest_price: lowest,
            highest_price: highest,
            average_price: avg,
            deal_score: score,
          })
          .eq("id", product.id);
      }
    }

    return NextResponse.json({
      success: true,
      product: product.name,
      pricesUpdated: updated,
      report: {
        lowest: report.lowest ? { marketplace: report.lowest.marketplace, price: report.lowest.price } : null,
        highest: report.highest ? { marketplace: report.highest.marketplace, price: report.highest.price } : null,
        average: report.average,
        inStockCount: report.inStockCount,
      },
    });
  } catch (err) {
    console.error("Scrape error:", err);
    return NextResponse.json(
      { error: "Scrape failed", details: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
