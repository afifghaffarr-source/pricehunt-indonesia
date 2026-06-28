import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/extension/current-price?url=<encoded>
 *
 * Returns the most-recent scraped price for a given product URL.
 * Used by the BijakBeli extension's price-drop alert watcher.
 *
 * Auth: requires INGESTION_SECRET as `Authorization: Bearer <secret>`,
 * same as /api/ingestion routes. Returns 401 otherwise.
 *
 * Response shape:
 * {
 *   url: string,
 *   title: string | null,
 *   marketplace: string | null,
 *   price: number | null,
 *   last_seen_at: string | null,
 * }
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.INGESTION_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    // Query the products view for the most-recent snapshot for this URL.
    // The schema uses a denormalized `products` table with one row per URL;
    // `lowest_price` is the cheapest offer seen for that product.
    const { data, error } = await supabase
      .from("products")
      .select("url, title, marketplace, lowest_price, updated_at")
      .eq("url", url)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // PostgREST errors → 502 (extension should retry).
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    if (!data) {
      return NextResponse.json(
        { url, title: null, marketplace: null, price: null, last_seen_at: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      url: data.url,
      title: data.title ?? null,
      marketplace: data.marketplace ?? null,
      price: data.lowest_price ?? null,
      last_seen_at: data.updated_at ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
