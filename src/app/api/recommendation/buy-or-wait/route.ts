import { NextRequest, NextResponse } from "next/server";
import { generateBuyOrWaitRecommendation } from "@/lib/buy-or-wait";
import { createClient } from "@/lib/supabase/server";
import { checkPersistentRateLimit, getRequestIdentifier } from "@/lib/rate-limit";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per identifier

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
    // Rate limit: 30 req/min per user/IP (public endpoint, abuse protection)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const rateLimit = await checkPersistentRateLimit({
      identifier: getRequestIdentifier(user?.id ?? null, request),
      endpoint: "buy-or-wait",
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi nanti." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.retryAfterMs ?? RATE_LIMIT_WINDOW_MS) / 1000)),
            "Cache-Control": "no-store",
          },
        }
      );
    }

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
