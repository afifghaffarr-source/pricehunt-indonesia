import { NextRequest, NextResponse } from "next/server";
import { searchImages, isVexoConfigured } from "@/lib/vexo/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const engine = (searchParams.get("engine") || "google") as "google" | "bing";

  if (!q) {
    return NextResponse.json({ error: "Parameter 'q' diperlukan" }, { status: 400 });
  }

  if (!isVexoConfigured()) {
    return NextResponse.json({
      results: [],
      query: q,
      source: "vexo-unavailable",
    });
  }

  try {
    const result = await searchImages(q, engine);

    return NextResponse.json({
      results: result.data?.results || [],
      query: q,
      engine,
      source: "vexo",
    });
  } catch (err) {
    return NextResponse.json({
      results: [],
      query: q,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
