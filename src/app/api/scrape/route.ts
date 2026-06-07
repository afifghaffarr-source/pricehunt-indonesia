import { NextRequest, NextResponse } from "next/server";
import { scrapeAllMarketplaces, generateScrapeReport } from "@/lib/scraper";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("id, name, lowest_price")
      .eq("id", productId)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const basePrice = product.lowest_price || 1000000;
    const results = await scrapeAllMarketplaces(product.name as string, basePrice);
    const report = generateScrapeReport(results);

    const { data: marketplaces } = await supabase
      .from("marketplaces")
      .select("id, name");

    const mpMap = new Map((marketplaces || []).map((m) => [m.name, m.id]));

    let updated = 0;
    for (const result of results) {
      const mpId = mpMap.get(result.marketplace);
      if (!mpId) continue;

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
        },
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

        await supabase
          .from("products")
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
    return NextResponse.json(
      { error: "Scrape failed", details: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
