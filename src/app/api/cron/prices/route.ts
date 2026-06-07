import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, slug, lowest_price, highest_price");

  if (!products || products.length === 0) {
    return NextResponse.json({ message: "No products to update", updated: 0 });
  }

  const { data: marketplaces } = await supabase
    .from("marketplaces")
    .select("id, name");

  if (!marketplaces) {
    return NextResponse.json({ error: "No marketplaces found" }, { status: 500 });
  }

  let pricesUpdated = 0;
  let historyInserted = 0;
  const today = new Date().toISOString().split("T")[0];

  for (const product of products) {
    const { data: existingPrices } = await supabase
      .from("prices")
      .select("id, marketplace_id, price")
      .eq("product_id", product.id);

    if (!existingPrices) continue;

    for (const priceRow of existingPrices) {
      const fluctuation = 1 + (Math.random() - 0.5) * 0.06;
      const newPrice = Math.round(priceRow.price * fluctuation);

      await supabase
        .from("prices")
        .update({
          price: newPrice,
          last_updated: new Date().toISOString(),
        })
        .eq("id", priceRow.id);

      pricesUpdated++;

      await supabase.from("price_history").upsert(
        {
          product_id: product.id,
          marketplace_id: priceRow.marketplace_id,
          price: newPrice,
          recorded_at: today,
        },
        { onConflict: "product_id,marketplace_id,recorded_at" }
      );
      historyInserted++;
    }

    const { data: updatedPrices } = await supabase
      .from("prices")
      .select("price")
      .eq("product_id", product.id)
      .eq("in_stock", true);

    if (updatedPrices && updatedPrices.length > 0) {
      const vals = updatedPrices.map((p) => p.price);
      const lowest = Math.min(...vals);
      const highest = Math.max(...vals);
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
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

  let alertsSent = 0;
  try {
    const { checkAndSendPriceAlerts } = await import("@/lib/email");
    const alertResult = await checkAndSendPriceAlerts();
    alertsSent = alertResult.sent;
  } catch {
    // Email check failed, non-critical
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    products: products.length,
    pricesUpdated,
    historyInserted,
    alertsSent,
  });
}
