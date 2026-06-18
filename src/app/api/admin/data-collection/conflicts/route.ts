/**
 * GET /api/admin/data-collection/conflicts
 *
 * Lists unresolved price conflicts. **Admin only.**
 *
 * Security:
 * - Admin guard runs FIRST.
 * - No raw DB error details are returned to the client.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_conflicts")
    .select(
      `
        id,
        offer_id,
        price_a,
        price_b,
        difference_percent,
        difference_amount,
        source_a,
        source_b,
        status,
        detected_at,
        resolved_at,
        offer:offers!price_conflicts_offer_id_fkey(
          id,
          title,
          current_price,
          marketplace:marketplaces(name)
        )
      `
    )
    .eq("status", "open")
    .order("detected_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("conflicts list error", error);
    return NextResponse.json({ success: false, error: "Failed to fetch conflicts" }, { status: 500 });
  }

  // Transform to match component expectations
  const transformed = (data ?? []).map((conflict: Record<string, unknown>) => {
    const offer = (conflict as { offer?: Record<string, unknown> }).offer;
    return {
      id: conflict.id,
      offer_id: conflict.offer_id,
      conflicting_offer_id: null,
      conflict_type: "price_mismatch",
      price_diff_percent: parseFloat(String(conflict.difference_percent ?? "0")),
      detected_at: conflict.detected_at,
      resolved: conflict.status !== "open",
      offer: offer
        ? {
            title: offer.title as string,
            price: offer.current_price as number,
            marketplace: (offer.marketplace as { name: string } | null) ?? { name: "Unknown" },
          }
        : {
            title: "Offer not found",
            price: parseFloat(String(conflict.price_a ?? "0")),
            marketplace: { name: "Unknown" },
          },
      conflicting_offer: {
        price: parseFloat(String(conflict.price_b ?? "0")),
        marketplace: { name: String(conflict.source_b ?? "Unknown") },
      },
    };
  });

  return NextResponse.json({ success: true, data: transformed });
}
