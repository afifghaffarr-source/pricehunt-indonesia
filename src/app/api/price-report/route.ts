import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/price-report
 * Submit a user report of incorrect price data
 * 
 * NOTE: Requires migration 110 (price_reports table).
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

    const { offer_id, report_type, description, reported_price } = body;

    if (!offer_id || !report_type) {
      return NextResponse.json(
        { error: "offer_id and report_type are required" },
        { status: 400 }
      );
    }

    // Validate report_type
    const validTypes = ["price_incorrect", "out_of_stock", "fake_discount", "other"];
    if (!validTypes.includes(report_type)) {
      return NextResponse.json(
        { error: "Invalid report_type" },
        { status: 400 }
      );
    }

    // Get current user (optional - can be anonymous)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // @ts-ignore - Migration 110 not applied yet
    const { data, error } = await supabase
      .from("price_reports")
      .insert({
        offer_id,
        user_id: user?.id || null,
        report_type,
        description: description || null,
        reported_price: reported_price || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Price report error:", error);
      return NextResponse.json(
        { error: "Gagal mengirim laporan" },
        { status: 500 }
      );
    }

    // TODO: Send notification to admin (optional)
    // TODO: If multiple reports on same offer, auto-flag for review

    return NextResponse.json({
      success: true,
      message: "Laporan berhasil dikirim. Tim kami akan memeriksanya segera.",
      data: {
        id: data.id,
        status: data.status,
      },
    });
  } catch (error) {
    console.error("Price report failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
*/
