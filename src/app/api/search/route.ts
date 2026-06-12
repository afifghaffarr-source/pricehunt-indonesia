import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { discoverProducts } from "@/lib/marketplace/vexo-adapter";
import { isVexoConfigured } from "@/lib/vexo/client";

/**
 * Escape special characters for PostgreSQL ILIKE pattern matching
 * Prevents SQL injection and pattern injection attacks
 */
function escapeILIKEPattern(value: string): string {
  return value
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/%/g, "\\%")   // Escape % wildcard
    .replace(/_/g, "\\_");  // Escape _ wildcard
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const includeVexo = searchParams.get("vexo") === "true"; // Explicit opt-in

  if (!q && !category) {
    return NextResponse.json({ error: "Parameter 'q' atau 'category' diperlukan" }, { status: 400 });
  }

  let queryBuilder = supabase.from("products").select(`
    *,
    prices!inner (
      price,
      url,
      seller,
      seller_rating,
      in_stock,
      shipping_cost,
      last_updated,
      marketplaces (name)
    )
  `);

  if (q) {
    const escapedQ = escapeILIKEPattern(q);
    queryBuilder = queryBuilder.or(
      `name.ilike.%${escapedQ}%,category.ilike.%${escapedQ}%,description.ilike.%${escapedQ}%`
    );
  }

  if (category) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  queryBuilder = queryBuilder
    .order("deal_score", { ascending: false })
    .limit(limit);

  const { data, error } = await queryBuilder;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: Record<string, unknown> = {
    results: data,
    query: q,
    category,
    count: data?.length || 0,
    sources: [{ name: "database", count: data?.length || 0, status: "ok" }],
  };

  // Vexo only if explicitly requested AND user is authenticated
  if (q && includeVexo && isVexoConfigured()) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(response); // Skip Vexo for anonymous users
    }

    try {
      const vexoResults = await discoverProducts(q);
      if (vexoResults.length > 0) {
        response.discovered = vexoResults;
        (response.sources as Array<Record<string, unknown>>).push({
          name: "vexo",
          count: vexoResults.length,
          status: "ok",
        });
      }
    } catch {
      (response.sources as Array<Record<string, unknown>>).push({
        name: "vexo",
        count: 0,
        status: "error",
      });
    }
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'private, max-age=60', // Cache for 1 minute
    }
  });
}
