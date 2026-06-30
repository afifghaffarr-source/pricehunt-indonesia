import { NextRequest, NextResponse } from "next/server";
import { searchProductsFromDB, type VariantFilter } from "@/lib/supabase/data";

/**
 * Phase 4 — parse `?v=axis:value` query params.
 *
 * Each `?v=` may appear multiple times. Each value is `axis:value`
 * where axis ∈ {storage, color, connectivity}. Unknown axes / malformed
 * values are silently dropped (callers should never send them, but we
 * don't want a 500 for one bad value).
 *
 * Multiple values within an axis are OR-ed; the axes themselves are
 * AND-ed. Missing axis key = no filter on that axis.
 */
function parseVariantFilter(searchParams: URLSearchParams): VariantFilter | undefined {
  const values = searchParams.getAll("v");
  if (values.length === 0) return undefined;

  const filter: VariantFilter = {};
  for (const raw of values) {
    const sepIdx = raw.indexOf(":");
    if (sepIdx <= 0) continue;
    const axis = raw.slice(0, sepIdx).trim().toLowerCase();
    const value = raw.slice(sepIdx + 1).trim();
    if (!value) continue;
    if (axis !== "storage" && axis !== "color" && axis !== "connectivity") {
      continue;
    }
    if (!filter[axis]) filter[axis] = [];
    filter[axis]!.push(value);
  }
  // Drop empty axis arrays so the helper treats them as "no filter".
  if (!filter.storage?.length) delete filter.storage;
  if (!filter.color?.length) delete filter.color;
  if (!filter.connectivity?.length) delete filter.connectivity;
  if (!filter.storage && !filter.color && !filter.connectivity) return undefined;
  return filter;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const variantFilter = parseVariantFilter(searchParams);

    // P9 (audit 2026-06-17): proper DB range + count via the helper.
    // `total` = count of products matching the search (query + category),
    // independent of the page slice. The page slice comes from the helper
    // which already attaches live prices from the union view.
    //
    // Phase 4: `variantFilter` narrows the per-product offers array and
    // drops products with zero matching offers. `variantValues` returns
    // the distinct axis values across the (un-filtered) offer set so the
    // search UI can render the chip group with values that actually
    // exist in the result set.
    const { products, total, variantValues } = await searchProductsFromDB(
      query,
      category,
      limit,
      offset,
      variantFilter,
    );

    return NextResponse.json({
      results: products,
      total,
      limit,
      offset,
      variantValues,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mencari produk" },
      { status: 500 }
    );
  }
}
