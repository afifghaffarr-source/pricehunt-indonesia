import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  if (!q && !category) {
    return NextResponse.json({ error: "Parameter 'q' atau 'category' diperlukan" }, { status: 400 });
  }

  let queryBuilder = supabase.from("products").select("*");

  if (q) {
    queryBuilder = queryBuilder.or(
      `name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`
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

  return NextResponse.json({
    results: data,
    query: q,
    category,
    count: data?.length || 0,
  });
}
