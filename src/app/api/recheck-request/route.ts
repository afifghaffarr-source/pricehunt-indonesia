import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/recheck-request
 * Submit a user request to recheck product prices
 */
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
    const priority = 50; // Default

    const { data, error } = await supabase
      .from("recheck_requests")
      .insert({
        product_id,
        requested_by: user?.id || null,
        reason: reason || "user_requested",
        priority_score: priority,
        request_status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Recheck request error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Permintaan cek ulang harga berhasil dikirim",
    });
  } catch (error: any) {
    console.error("Recheck request exception:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
