import { NextRequest, NextResponse } from "next/server";
import { getApiSources, getCategories, getRegistryStats } from "@/lib/api-registry/data";
import { isVexoConfigured } from "@/lib/vexo/client";

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

    // RLS-friendliness: anon users see DB-registered sources only. But
    // we want to surface VexoAPI (configured via env var) so that the
    // registry matches what /api/registry/health reports. Audit 2026-06-22
    // found the two endpoints gave inconsistent totals (health: 1, list: 0).
    const sourcesWithVexo = [...sources];
    if (isVexoConfigured() && !sourcesWithVexo.some((s) => s.slug === "vexo-api")) {
      sourcesWithVexo.unshift({
        // Shape compatible with ApiSourceWithCategory — fields the UI reads.
        id: "vexo-api-env",
        slug: "vexo-api",
        name: "VexoAPI",
        description: "AI-powered deal verdict + discount authenticity (configured via VEXO_API_KEY).",
        category_id: null,
        base_url: null,
        auth_type: "api_key",
        status: "active",
        priority: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: null,
      } as unknown as (typeof sourcesWithVexo)[number]);
    }

    let filtered = sourcesWithVexo;
    if (category) filtered = filtered.filter((s) => s.category?.slug === category);
    if (status) filtered = filtered.filter((s) => s.status === status);
    return NextResponse.json({ sources: filtered, total: filtered.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch registry data" }, { status: 500 });
  }
}