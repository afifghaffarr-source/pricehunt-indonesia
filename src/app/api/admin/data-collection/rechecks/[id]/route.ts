import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/admin/data-collection/rechecks/[id]
 * Update recheck request status
 * 
 * NOTE: Requires migration 110.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  return NextResponse.json({
    success: false,
    message: "This endpoint requires migration 110 to be applied first.",
  }, { status: 503 });
}
