import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePrice } from "@/lib/ingestion/normalizer";
import { calculateConfidenceScore } from "@/lib/ingestion/confidence";

/**
 * POST /api/admin/data-collection/manual-offer
 * Submit manual offer input from admin
 * 
 * NOTE: This endpoint requires migration 110 to be applied first.
 * Until then, use the browser collector tool instead.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      message: "This endpoint requires migration 110 to be applied. Please run the migration first or use the browser collector tool." 
    },
    { status: 503 }
  );
}

/* IMPLEMENTATION READY - Uncomment after migration 110 is applied:

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

    // 1. Find or create marketplace
    let { data: marketplaceData, error: marketplaceError } = await supabase
      .from("marketplaces")
      .select("id")
      .eq("name", marketplace.toLowerCase())
      .single();

    if (marketplaceError || !marketplaceData) {
      // Create marketplace if not exists
      // @ts-ignore - Migration 110 not applied yet, types will be correct after migration
      const { data: created, error: createError } = await supabase
        .from("marketplaces")
        .insert({
          name: marketplace.toLowerCase(),
          url: `https://${marketplace.toLowerCase()}.com`,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { success: false, message: "Failed to create marketplace" },
          { status: 500 }
        );
      }
      marketplaceData = created;
    }

    // 2. Find or create product (simple title matching)
    let { data: productData, error: productError } = await supabase
      .from("products")
      .select("id")
      .ilike("name", title)
      .limit(1)
      .single();

    if (productError || !productData) {
      // Create new product
      // @ts-ignore - Migration 110 not applied yet
      const { data: created, error: createError } = await supabase
        .from("products")
        .insert({
          name: title,
          category: category_hint || "general",
          image_url: image_url || null,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { success: false, message: "Failed to create product" },
          { status: 500 }
        );
      }
      productData = created;
    }

    // 3. Normalize prices
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

    // 4. Calculate confidence score
    // @ts-ignore - Migration 110 not applied yet
    const confidenceResult = calculateConfidenceScore({
      sourceType: "manual_admin",
      capturedAt: new Date(),
      hasPrice: true,
      hasTitle: true,
      hasImage: !!image_url,
      hasSeller: !!seller_name,
    });

    // 5. Create offer
    // @ts-ignore - Migration 110 fields not in generated types yet
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert({
        product_id: productData!.id,
        marketplace_id: marketplaceData!.id,
        title,
        url,
        price: normalizedPrice,
        original_price: normalizedOriginalPrice,
        seller_name: seller_name || null,
        stock_status: stock_status || "in_stock",
        condition: condition || "new",
        image_url: image_url || null,
        category_hint: category_hint || null,
        confidence_score: confidenceResult.score,
        confidence_label: confidenceResult.label,
        validation_status: "validated",
        is_available: true,
        last_checked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (offerError) {
      console.error("[Admin] Create offer error:", offerError);
      return NextResponse.json(
        { success: false, message: offerError.message },
        { status: 500 }
      );
    }

    // 6. Create price snapshot
    // @ts-ignore - Migration 110 not applied yet
    const { error: snapshotError } = await supabase
      .from("price_snapshots")
      .insert({
        offer_id: offer!.id,
        price: normalizedPrice,
        original_price: normalizedOriginalPrice,
        discount_percent:
          normalizedOriginalPrice && normalizedPrice
            ? Math.round(
                ((normalizedOriginalPrice - normalizedPrice) /
                  normalizedOriginalPrice) *
                  100
              )
            : null,
        captured_at: new Date().toISOString(),
        confidence_score: confidenceResult.score,
      });

    if (snapshotError) {
      console.error("[Admin] Create snapshot error:", snapshotError);
    }

    return NextResponse.json({
      success: true,
      message: "Offer created successfully",
      data: {
        offer_id: offer!.id,
        product_id: productData!.id,
        marketplace_id: marketplaceData!.id,
      },
    });
  } catch (error) {
    console.error("[Admin] Manual offer exception:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
*/
