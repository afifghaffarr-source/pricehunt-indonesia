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
        offer_id,
        price_a,
        price_b,
        difference_percent,
        difference_amount,
        source_a,
        source_b,
        status,
        detected_at,
        resolved_at,
        offer:offers(
          id,
          title,
          current_price,
          marketplace:marketplaces(name)
        )
      `)
      .eq('status', 'open')
      .order('detected_at', { ascending: false })
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
      offer_id: conflict.offer_id,
      conflicting_offer_id: null, // Schema only has one offer_id
      conflict_type: 'price_mismatch',
      price_diff_percent: parseFloat(conflict.difference_percent || '0'),
      detected_at: conflict.detected_at,
      resolved: conflict.status !== 'open',
      offer: conflict.offer ? {
        title: conflict.offer.title,
        price: conflict.offer.current_price,
        marketplace: conflict.offer.marketplace || { name: 'Unknown' },
      } : {
        title: 'Offer not found',
        price: parseFloat(conflict.price_a || '0'),
        marketplace: { name: 'Unknown' },
      },
      conflicting_offer: {
        price: parseFloat(conflict.price_b || '0'),
        marketplace: { name: conflict.source_b || 'Unknown' },
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
