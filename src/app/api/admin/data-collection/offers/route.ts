import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/data-collection/offers
 * List offers with filters
 * 
 * NOTE: Requires migration 110. Returns mock data until applied.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Mock data - migration 110 not applied yet",
    data: [
      {
        id: "mock-1",
        title: "Samsung Galaxy S24 Ultra (Mock Data)",
        marketplace: { name: "tokopedia" },
        price: 13250000,
        confidence_score: 85,
        confidence_label: "high",
        validation_status: "pending",
        last_checked_at: new Date().toISOString(),
        is_available: true,
        url: "https://tokopedia.com/example",
      },
    ],
  });
}
