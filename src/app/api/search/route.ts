import { NextRequest, NextResponse } from "next/server";
import { searchProductsFromDB } from "@/lib/supabase/data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // P9 (audit 2026-06-17): proper DB range + count via the helper.
    // `total` = count of products matching the search (query + category),
    // independent of the page slice. The page slice comes from the helper
    // which already attaches live prices from the union view.
    const { products, total } = await searchProductsFromDB(query, category, limit, offset);

    return NextResponse.json({
      results: products,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mencari produk" },
      { status: 500 }
    );
  }
}
