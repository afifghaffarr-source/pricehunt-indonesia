import { NextRequest, NextResponse } from "next/server";
import { discoverProducts } from "@/lib/marketplace/vexo-adapter";
import { isVexoConfigured } from "@/lib/vexo/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const marketplace = searchParams.get("marketplace") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  if (!q) {
    return NextResponse.json({ error: "Parameter 'q' diperlukan" }, { status: 400 });
  }

  if (!isVexoConfigured()) {
    return NextResponse.json({
      results: [],
      query: q,
      source: "vexo-unavailable",
      message: "VexoAPI belum dikonfigurasi",
    });
  }

  try {
    const products = await discoverProducts(q, marketplace);

    return NextResponse.json({
      results: products.slice(0, limit),
      query: q,
      marketplace,
      source: "vexo",
      count: products.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      results: [],
      query: q,
      source: "vexo-error",
      error: message,
    });
  }
}
