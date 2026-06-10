import { NextRequest, NextResponse } from "next/server";
import { generateBuyOrWaitRecommendation } from "@/lib/buy-or-wait";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

// GET handler for extension and simple usage - accepts slug
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    // Fetch product data with prices
    const supabase = await createClient();
    const { data: product, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        lowest_price,
        highest_price,
        average_price,
        prices(price, marketplace:marketplaces(name))
      `)
      .eq("slug", slug)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Use available data for recommendation
    // For MVP, we use what we have. Full data will come from price_snapshots later.
    const recommendation = generateBuyOrWaitRecommendation({
      currentPrice: product.lowest_price || 0,
      originalPrice: product.highest_price || product.lowest_price || 0,
      lowestHistoricalPrice: product.lowest_price,
      median30Day: product.average_price,
      median90Day: product.average_price,
      stockStatus: "in_stock", // Default for now
    });

    return NextResponse.json({
      success: true,
      product: {
        name: product.name,
        slug: product.slug,
      },
      recommendation,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error in buy-or-wait GET:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}

// POST handler for advanced usage with full control
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
