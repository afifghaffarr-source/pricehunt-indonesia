import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/data-collection/resolve-conflict
 * Resolve a price conflict by choosing the correct price
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { conflict_id, resolution_note } = body;

    if (!conflict_id) {
      return NextResponse.json(
        { success: false, error: "conflict_id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('price_conflicts')
      .update({
        conflict_status: 'resolved',
        resolution_note,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', conflict_id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conflict resolved successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
