import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/price-report
 * Submit a user report of incorrect price data
 * Requires authentication to prevent spam
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication - require user to be logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Anda harus login untuk melaporkan harga yang tidak sesuai" 
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { offer_id, product_id, report_type, message, reported_price } = body;

    // Validate required fields
    if (!offer_id || !report_type) {
      return NextResponse.json(
        { 
          success: false, 
          message: "offer_id dan report_type wajib diisi" 
        },
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
        { 
          success: false, 
          message: "Tipe laporan tidak valid. Pilih salah satu: " + validTypes.join(", ") 
        },
        { status: 400 }
      );
    }

    // Validate reported_price if provided
    if (reported_price !== undefined && reported_price !== null) {
      const priceNum = Number(reported_price);
      if (isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Harga yang dilaporkan harus berupa angka positif" 
          },
          { status: 400 }
        );
      }
    }

    // Insert price report with authenticated user_id
    const { data, error } = await supabase
      .from("price_reports")
      .insert({
        offer_id,
        product_id,
        user_id: user.id, // Use authenticated user ID
        report_type,
        message: message || null,
        reported_price: reported_price || null,
        report_status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Price report insert error:", error);
      return NextResponse.json(
        { 
          success: false, 
          message: "Gagal membuat laporan harga" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Laporan harga berhasil dikirim. Terima kasih atas kontribusinya! Kami akan verifikasi dalam 24-48 jam.",
    });
  } catch (error) {
    console.error("Price report error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Terjadi kesalahan sistem" 
      },
      { status: 500 }
    );
  }
}
