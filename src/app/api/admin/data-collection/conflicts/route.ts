import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/data-collection/conflicts
 * List unresolved price conflicts
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('price_conflicts')
      .select(`
        id,
        offer_a_id,
        offer_b_id,
        price_a,
        price_b,
        price_diff_percentage,
        source_a,
        source_b,
        confidence_a,
        confidence_b,
        conflict_status,
        created_at,
        offer_a:offers!price_conflicts_offer_a_id_fkey(
          id,
          title,
          url,
          marketplace:marketplaces(name)
        ),
        offer_b:offers!price_conflicts_offer_b_id_fkey(
          id,
          title,
          url,
          marketplace:marketplaces(name)
        ),
        product:products(name, slug)
      `)
      .eq('conflict_status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform to match component expectations
    const transformed = data?.map((conflict: any) => ({
      id: conflict.id,
      offer_id: conflict.offer_a_id,
      conflicting_offer_id: conflict.offer_b_id,
      conflict_type: 'price_mismatch',
      price_diff_percent: parseFloat(conflict.price_diff_percentage || '0'),
      detected_at: conflict.created_at,
      resolved: conflict.conflict_status !== 'open',
      offer: {
        title: conflict.offer_a?.title || 'Unknown',
        price: parseFloat(conflict.price_a || '0'),
        marketplace: conflict.offer_a?.marketplace || { name: 'Unknown' },
      },
      conflicting_offer: {
        price: parseFloat(conflict.price_b || '0'),
        marketplace: conflict.offer_b?.marketplace || { name: 'Unknown' },
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
