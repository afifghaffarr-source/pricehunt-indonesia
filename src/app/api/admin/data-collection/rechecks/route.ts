/**
 * GET /api/admin/data-collection/rechecks
 *
 * Lists recheck requests. **Admin only.**
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const requestStatus = searchParams.get("request_status");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 200);

  const supabase = await createClient();
  let query = supabase
    .from("recheck_requests")
    .select(
      `
        id,
        reason,
        request_status,
        priority_score,
        created_at,
        processed_at,
        requested_by,
        offer_id,
        product_id,
        offer:offers(
          id,
          title,
          url,
          marketplace:marketplaces(name)
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (requestStatus) {
    query = query.eq("request_status", requestStatus);
  }

  const { data, error } = await query;

  if (error) {
    console.error("recheck list error", error);
    return NextResponse.json({ success: false, error: "Failed to fetch rechecks" }, { status: 500 });
  }

  const transformed = (data ?? []).map((recheck: Record<string, unknown>) => {
    const offer = recheck.offer as Record<string, unknown> | null;
    return {
      id: recheck.id,
      offer_id: recheck.offer_id,
      user_id: recheck.requested_by,
      reason: recheck.reason,
      status: recheck.request_status,
      priority_score: (recheck.priority_score as number | null) ?? 50,
      requested_at: recheck.created_at,
      offer: offer
        ? {
            title: offer.title,
            marketplace: (offer.marketplace as { name: string } | null) ?? { name: "Unknown" },
            url: offer.url,
          }
        : { title: "Offer not found", marketplace: { name: "Unknown" }, url: null },
    };
  });

  return NextResponse.json({ success: true, data: transformed });
}
