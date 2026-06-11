import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/data-collection/rechecks
 * List recheck requests
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const request_status = searchParams.get('request_status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('recheck_requests')
      .select(`
        id,
        reason,
        request_status,
        priority_score,
        created_at,
        processed_at,
        result_message,
        offer_id,
        product_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (request_status) {
      query = query.eq('request_status', request_status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
