import { NextRequest, NextResponse } from "next/server";
import { scrapeAllMarketplaces, generateScrapeReport } from "@/lib/scraper";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  // ✅ SECURITY: Require admin authentication (expensive operation)
  const authError = await requireAdmin(request);
  if (authError) return authError;

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

      // Supabase generated types outdated - using type assertion until regenerated
      await supabase.from("prices").upsert(
        {
          product_id: product.id,
          marketplace_id: mpId,
          price: result.price,
          url: result.url,
          seller: result.seller,
          seller_rating: result.sellerRating,
          in_stock: result.inStock,
          shipping_cost: result.shippingCost,
          last_updated: result.scrapedAt,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        { onConflict: "product_id,marketplace_id" }
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

        // Admin client bypasses type checking
        // TODO: Regenerate Supabase types after schema changes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("products") as any)
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
