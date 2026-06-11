import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/data-collection/resolve-conflict
 * Resolve price conflict by choosing which offer to keep
 * 
 * NOTE: Requires migration 110.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: "This endpoint requires migration 110 to be applied first.",
  }, { status: 503 });
}
