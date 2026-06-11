import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/data-collection/conflicts
 * List unresolved price conflicts
 * 
 * NOTE: Requires migration 110. Returns mock data until applied.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Mock data - migration 110 not applied yet",
    data: [],
  });
}
