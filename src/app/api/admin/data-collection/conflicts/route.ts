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
        price_a,
        price_b,
        price_diff_percentage,
        source_a,
        source_b,
        confidence_a,
        confidence_b,
        conflict_status,
        created_at,
        product:products(name, slug),
        marketplace:marketplaces(name)
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
