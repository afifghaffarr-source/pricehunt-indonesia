import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/recheck-request
 * Submit a user request to recheck product prices
 * 
 * NOTE: Requires migration 110 (recheck_requests table).
 * Returns 503 until migration applied.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Migration 110 belum diterapkan. Fitur ini akan aktif setelah migration.",
    },
    { status: 503 }
  );
}

/*
// FULL IMPLEMENTATION (uncomment after migration 110):

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { product_id, marketplace_id, reason } = body;

    if (!product_id) {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 }
      );
    }

    // Get current user (optional - can be anonymous)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Calculate priority based on user tier (future: premium users get higher priority)
    const priority = "normal"; // Default

    // @ts-ignore - Migration 110 not applied yet
    const { data, error } = await supabase
      .from("recheck_requests")
      .insert({
        product_id,
        marketplace_id,
        user_id: user?.id || null,
        reason: reason || "user_requested",
        priority,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Recheck request error:", error);
      return NextResponse.json(
        { error: "Gagal membuat permintaan recheck" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Permintaan recheck berhasil dikirim",
      data: {
        id: data.id,
        status: data.status,
      },
    });
  } catch (error) {
    console.error("Recheck request failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
*/
