import { NextRequest, NextResponse } from "next/server";
import { detectFakeDiscount } from "@/lib/fake-discount";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      currentPrice,
      originalPrice,
      lowestHistoricalPrice,
      median30Day,
      median90Day,
      discountPercent: _discountPercent,
    } = body;

    // Validate required fields
    if (!currentPrice || typeof currentPrice !== "number") {
      return NextResponse.json(
        { error: "currentPrice is required and must be a number" },
        { status: 400 }
      );
    }

    if (!originalPrice || typeof originalPrice !== "number") {
      return NextResponse.json(
        { error: "originalPrice is required and must be a number" },
        { status: 400 }
      );
    }

    // Analyze fake discount using our engine
    const analysis = detectFakeDiscount({
      currentPrice,
      originalPrice,
      lowestHistoricalPrice,
      median30Day,
      median90Day,
    });

    return NextResponse.json(analysis, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error in fake discount analysis:", error);
    return NextResponse.json(
      { error: "Failed to analyze discount" },
      { status: 500 }
    );
  }
}
