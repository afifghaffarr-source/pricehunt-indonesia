import { NextRequest, NextResponse } from "next/server";
import { getApiSources, getCategories, getRegistryStats } from "@/lib/api-registry/data";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action") || "list";

  try {
    if (action === "stats") {
      const stats = await getRegistryStats();
      return NextResponse.json(stats);
    }
    if (action === "categories") {
      const categories = await getCategories();
      return NextResponse.json({ categories });
    }
    const sources = await getApiSources();
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    let filtered = sources;
    if (category) filtered = filtered.filter((s) => s.category?.slug === category);
    if (status) filtered = filtered.filter((s) => s.status === status);
    return NextResponse.json({ sources: filtered, total: filtered.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch registry data" }, { status: 500 });
  }
}