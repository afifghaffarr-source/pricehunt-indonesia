import { NextRequest, NextResponse } from "next/server";
import { generateBuyOrWaitRecommendation } from "@/lib/buy-or-wait";

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
      sellerRating,
      sellerReviewCount,
      isOfficialStore,
      stockStatus,
      hasVoucher,
      hasFreeShipping,
      daysUntilNextCampaign,
      campaignName,
      priceVolatility,
    } = body;

    // Validate required fields
    if (!currentPrice || typeof currentPrice !== "number") {
      return NextResponse.json(
        { error: "currentPrice is required and must be a number" },
        { status: 400 }
      );
    }

    // Get recommendation using our buy-or-wait engine
    const recommendation = generateBuyOrWaitRecommendation({
      currentPrice,
      originalPrice,
      lowestHistoricalPrice,
      median30Day,
      median90Day,
      sellerRating,
      sellerReviewCount,
      isOfficialStore,
      stockStatus,
      hasVoucher,
      hasFreeShipping,
      daysUntilNextCampaign,
      campaignName,
      priceVolatility,
    });

    return NextResponse.json(recommendation, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error in buy-or-wait recommendation:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}
