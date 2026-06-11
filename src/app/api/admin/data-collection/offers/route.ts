import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/data-collection/offers
 * List offers with enhanced metadata from migration 110
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const validation_status = searchParams.get('validation_status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('offers')
      .select(`
        id,
        title,
        price,
        url,
        validation_status,
        confidence_label,
        image_url,
        category_hint,
        in_stock,
        created_at,
        updated_at,
        marketplace:marketplaces(name),
        product:products(name, slug)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (validation_status) {
      query = query.eq('validation_status', validation_status);
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
      pagination: {
        limit,
        offset,
        count: data?.length || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
