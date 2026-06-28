import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toPriceViews, type OfferRow } from "@/lib/ingestion/adapter";
import { fetchPriceHistoryByProductId } from "@/lib/supabase/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Support both UUID and slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq(isUUID ? "id" : "slug", id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    // A-002: read from `offers` (post-114 schema) instead of legacy `prices`.
    // Adapter maps offers -> legacy PriceView shape so existing component
    // types (`MarketplacePrice` in `src/lib/types.ts`) and any code that
    // uses `prices` field keep working.
    const { data: offers } = await supabase
      .from("offers")
      .select(
        "id, current_price, stock_status, is_active, seller_name, seller_rating, shipping_estimate, last_checked_at, url, marketplace_id, marketplaces(name, display_name, color)"
      )
      .eq("product_id", product.id)
      .order("current_price", { ascending: true });

    const prices = toPriceViews((offers ?? []) as OfferRow[]);

    // P7-Post: read from price_snapshots (via helper). The legacy
    // `price_history` table was dropped in migration 129. Helper returns
    // unified `PriceHistoryPoint[]` shape (date + per-marketplace prices),
    // which is what `PriceHistoryChart` and the median-30/90 day
    // calculators in `product/[slug]/page.tsx` expect.
    const priceHistory = await fetchPriceHistoryByProductId(product.id as string);

    return NextResponse.json({
      product,
      prices,
      priceHistory,
    });
  } catch (err) {
    console.error("Product detail API error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch product details",
        details: err instanceof Error ? err.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
