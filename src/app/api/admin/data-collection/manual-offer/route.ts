import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePrice } from "@/lib/ingestion/normalizer";
import { calculateConfidenceScore } from "@/lib/ingestion/confidence";

/**
 * POST /api/admin/data-collection/manual-offer
 * Submit manual offer input from admin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      marketplace,
      title,
      url,
      price,
      original_price,
      seller_name,
      stock_status,
      condition,
      image_url,
      category_hint,
    } = body;

    // Validate required fields
    if (!marketplace || !title || !url || !price) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Find marketplace
    let { data: marketplaceData, error: marketplaceError } = await supabase
      .from("marketplaces")
      .select("id")
      .eq("name", marketplace.toLowerCase())
      .single();

    // Cast to any to avoid TypeScript issues with generated types
    let marketplaceRecord: any = marketplaceData;

    if (marketplaceError || !marketplaceData) {
      // Create marketplace if not exists
      const { data: created, error: createError } = await supabase
        .from("marketplaces")
        .insert({
          name: marketplace.toLowerCase(),
          base_url: `${marketplace.toLowerCase()}.com`,
          display_name: marketplace,
          logo_url: null,
          color: "#000000",
          is_active: true,
        } as any)
        .select()
        .single();

      if (createError || !created) {
        return NextResponse.json(
          { success: false, message: "Failed to create marketplace: " + (createError?.message || "Unknown error") },
          { status: 500 }
        );
      }
      marketplaceRecord = created;
    }

    if (!marketplaceRecord) {
      return NextResponse.json(
        { success: false, message: "Failed to resolve marketplace" },
        { status: 500 }
      );
    }

    // 2. Normalize prices
    const normalizedPrice = normalizePrice(price);
    const normalizedOriginalPrice = original_price
      ? normalizePrice(original_price)
      : null;

    if (!normalizedPrice) {
      return NextResponse.json(
        { success: false, message: "Invalid price format" },
        { status: 400 }
      );
    }

    // 3. Calculate confidence score
    const confidenceResult = calculateConfidenceScore({
      sourceType: "manual_admin",
      capturedAt: new Date(),
      hasPrice: true,
      hasSeller: !!seller_name,
      hasStock: !!stock_status,
    });

    // 4. Create offer (product_id can be null - will be matched later)
    const { data: offerData, error: offerError } = await supabase
      .from("offers")
      .upsert({
        marketplace_id: marketplaceRecord.id,
        title,
        url,
        current_price: normalizedPrice,
        original_price: normalizedOriginalPrice,
        seller_name: seller_name || null,
        stock_status: stock_status || "in_stock",
        condition: condition || "unknown",
        image_url: image_url || null,
        category_hint: category_hint || null,
        confidence_score: confidenceResult.score,
        confidence_label: confidenceResult.label,
        validation_status: "pending",
        is_active: true,
        last_checked_at: new Date().toISOString(),
        source: "manual_admin",
      } as any, {
        onConflict: "url",
      })
      .select()
      .single();

    if (offerError || !offerData) {
      console.error("[Admin] Create offer error:", offerError);
      return NextResponse.json(
        { success: false, message: offerError?.message || "Failed to create offer" },
        { status: 500 }
      );
    }

    const offer = offerData as any;

    // 5. Create price snapshot
    const { error: snapshotError } = await supabase
      .from("price_snapshots")
      .insert({
        offer_id: offer.id,
        current_price: normalizedPrice,
        original_price: normalizedOriginalPrice,
        stock_status: stock_status || "in_stock",
        source: "manual_admin",
        confidence_score: confidenceResult.score,
        captured_at: new Date().toISOString(),
      } as any);

    if (snapshotError) {
      console.error("[Admin] Create snapshot error:", snapshotError);
      // Don't fail the request, snapshot is optional
    }

    return NextResponse.json({
      success: true,
      message: "Offer created successfully",
      data: {
        offer_id: offer.id,
        marketplace_id: marketplaceRecord.id,
        confidence_score: confidenceResult.score,
        confidence_label: confidenceResult.label,
      },
    });
  } catch (error) {
    console.error("[Admin] Manual offer exception:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error: " + (error as Error).message },
      { status: 500 }
    );
  }
}
