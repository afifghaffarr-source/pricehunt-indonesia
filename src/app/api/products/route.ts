import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "deal_score";
    const order = searchParams.get("order") || "desc";

    // Validate pagination params — return 400 for invalid input rather
    // than letting parseInt → NaN → PostgREST 500.
    const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    if (!Number.isFinite(rawLimit) || rawLimit < 1 || rawLimit > 100) {
      return NextResponse.json(
        { error: "limit must be an integer between 1 and 100" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(rawOffset) || rawOffset < 0) {
      return NextResponse.json(
        { error: "offset must be a non-negative integer" },
        { status: 400 }
      );
    }
    const limit = rawLimit;
    const offset = rawOffset;

    let queryBuilder = supabase.from("products").select("*", { count: "exact" });

    if (category) {
      queryBuilder = queryBuilder.eq("category", category);
    }

    const validSorts = ["deal_score", "lowest_price", "highest_price", "name", "created_at"];
    const sortField = validSorts.includes(sort) ? sort : "deal_score";
    const ascending = order === "asc";

    queryBuilder = queryBuilder
      .order(sortField, { ascending })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error("Products query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      products: data,
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Products API error:", err);
    return NextResponse.json(
      { 
        error: "Failed to fetch products", 
        details: err instanceof Error ? err.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
