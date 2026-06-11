import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/price-report
 * Submit a user report of incorrect price data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { offer_id, product_id, report_type, message, reported_price } = body;

    if (!offer_id || !report_type) {
      return NextResponse.json(
        { error: "offer_id and report_type are required" },
        { status: 400 }
      );
    }

    // Validate report_type
    const validTypes = [
      "harga_berbeda",
      "produk_salah",
      "stok_habis",
      "link_rusak",
      "varian_berbeda",
      "lainnya",
    ];
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

    const { data, error } = await supabase
      .from("price_reports")
      .insert({
        offer_id,
        product_id,
        user_id: user?.id || null,
        report_type,
        message: message || null,
        reported_price: reported_price || null,
        report_status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Price report error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Laporan harga berhasil dikirim. Terima kasih atas kontribusinya!",
    });
  } catch (error: any) {
    console.error("Price report exception:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
