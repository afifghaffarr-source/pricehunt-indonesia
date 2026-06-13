import { NextRequest, NextResponse } from "next/server";
import { searchProductsFromDB } from "@/lib/supabase/data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const products = await searchProductsFromDB(query, category, limit, offset);

    return NextResponse.json({
      results: products,
      total: products.length,
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
