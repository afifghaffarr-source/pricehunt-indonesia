import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/admin/data-collection/rechecks/[id]
 * Update recheck request status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const { request_status, result_message } = body;

    if (!request_status) {
      return NextResponse.json(
        { success: false, error: "request_status is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('recheck_requests')
      .update({
        request_status,
        result_message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Recheck request updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
