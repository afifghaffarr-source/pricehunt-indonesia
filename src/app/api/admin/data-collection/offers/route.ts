/**
 * GET /api/admin/data-collection/offers
 *
 * Lists offers with enhanced metadata. **Admin only.**
 *
 * Security:
 * - Admin guard runs FIRST.
 * - No raw DB error details are returned to the client.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const validationStatus = searchParams.get("validation_status");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

  const supabase = await createClient();
  let query = supabase
    .from("offers")
    .select(
      `
        id,
        title,
        current_price,
        url,
        validation_status,
        confidence_score,
        confidence_label,
        source,
        image_url,
        category_hint,
        stock_status,
        is_active,
        last_checked_at,
        created_at,
        updated_at,
        marketplace:marketplaces(name),
        product:products(name, slug)
      `,
      { count: "estimated" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (validationStatus) {
    query = query.eq("validation_status", validationStatus);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("offers list error", error);
    return NextResponse.json({ success: false, error: "Failed to fetch offers" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      limit,
      offset,
      count: count ?? data?.length ?? 0,
    },
  });
}

// UUID sanity check helper (kept for future ad-hoc usage; not used here yet).
export const _isUuid = (s: string): boolean => UUID_RE.test(s);
