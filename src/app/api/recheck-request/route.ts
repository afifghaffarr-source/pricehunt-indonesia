import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/recheck-request
 * Submit a user request to recheck product prices
 * Requires authentication
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
          message: "Anda harus login untuk meminta pengecekan ulang harga" 
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { product_id, offer_id, reason } = body;

    // Validate request
    if (!product_id) {
      return NextResponse.json(
        { 
          success: false, 
          message: "product_id wajib diisi" 
        },
        { status: 400 }
      );
    }

    // Insert recheck request with authenticated user_id
    const { data, error } = await supabase
      .from("recheck_requests")
      .insert({
        product_id,
        offer_id: offer_id || null, // Can be null (recheck all offers for product)
        requested_by: user.id, // Use authenticated user ID
        request_status: "pending",
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Recheck request insert error:", error);
      return NextResponse.json(
        { 
          success: false, 
          message: "Gagal membuat permintaan pengecekan ulang" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Permintaan pengecekan ulang berhasil dibuat. Kami akan memperbarui data dalam waktu 24 jam.",
      data,
    });
  } catch (error) {
    console.error("Recheck request error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Terjadi kesalahan sistem" 
      },
      { status: 500 }
    );
  }
}
