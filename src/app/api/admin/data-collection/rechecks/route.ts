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
        requested_by,
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

    // Transform to match component expectations
    // Since we can't join to offers without FK constraints,
    // return simplified data structure
    const transformed = data?.map((recheck: any) => ({
      id: recheck.id,
      offer_id: recheck.offer_id,
      user_id: recheck.requested_by,
      reason: recheck.reason,
      status: recheck.request_status,
      priority_score: recheck.priority_score || 50,
      requested_at: recheck.created_at,
      offer: {
        title: 'Offer ' + (recheck.offer_id || 'Unknown').substring(0, 8),
        marketplace: { name: 'Unknown' },
        url: null,
      },
    }));

    return NextResponse.json({
      success: true,
      data: transformed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
