import { NextRequest, NextResponse } from "next/server";
import { searchProductsFromDB } from "@/lib/supabase/data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const products = await searchProductsFromDB(query, category, limit + offset, 0);
    
    // Filter out products without prices (no offers available)
    const productsWithPrices = products
      .filter(p => p.lowestPrice > 0)
      .slice(offset, offset + limit);

    return NextResponse.json({
      results: productsWithPrices,
      total: productsWithPrices.length,
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
