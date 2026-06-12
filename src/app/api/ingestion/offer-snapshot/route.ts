/**
 * POST /api/ingestion/offer-snapshot
 * 
 * Simplified endpoint for browser collector to send single offer snapshot
 * This is the main endpoint Python collector will use (BAGIAN 5)
 * 
 * Security: INGESTION_SECRET for internal tools, or user session for logged-in users
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { normalizePrice, normalizeMarketplace, normalizeStockStatus, normalizeCondition, normalizeProductTitle } from "@/lib/ingestion/normalizer";
import { calculateConfidenceScore } from "@/lib/ingestion/confidence";

// Validation schema - matches Python collector output
const OfferSnapshotSchema = z.object({
  // Required fields
  marketplace: z.string().min(1), // e.g., "tokopedia", "shopee"
  product_url: z.string().url(),
  title: z.string().min(1),
  price: z.union([z.string(), z.number()]), // Can be "Rp 1.299.000" or 1299000
  
  // Optional fields
  marketplace_product_id: z.string().optional(),
  original_price: z.union([z.string(), z.number()]).optional(),
  seller_name: z.string().optional(),
  seller_id: z.string().optional(),
  seller_rating: z.number().min(0).max(5).optional(),
  seller_location: z.string().optional(),
  is_official_store: z.boolean().default(false),
  condition: z.string().optional(),
  variant: z.string().optional(),
  stock_status: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  review_count: z.number().optional(),
  sold_count: z.number().optional(),
  shipping_estimate: z.union([z.string(), z.number()]).optional(),
  voucher_text: z.string().optional(),
  image_url: z.string().url().optional(),
  category_hint: z.string().optional(),
  
  // Metadata
  source: z.string().default("browser_collector"),
  captured_at: z.string().datetime().optional(),
  parser_version: z.string().optional(),
});

type OfferSnapshotInput = z.infer<typeof OfferSnapshotSchema>;

interface OfferSnapshotResponse {
  success: boolean;
  offer_id?: string;
  snapshot_id?: string;
  confidence_score?: number;
  confidence_label?: string;
  validation_status?: string;
  warnings?: string[];
  message?: string;
  code?: string;
}

/**
 * CORS headers for Chrome Extension support
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

/**
 * Authenticate request - either INGESTION_SECRET or user session
 */
async function authenticateRequest(request: NextRequest): Promise<{ success: boolean; error?: string }> {
  // Check for INGESTION_SECRET first (for Python collector)
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");
  const expectedSecret = process.env.INGESTION_SECRET;
  
  if (expectedSecret && secret === expectedSecret) {
    return { success: true };
  }
  
  // TODO: Check user session for logged-in users
  // For now, only allow INGESTION_SECRET
  
  return { 
    success: false, 
    error: "Unauthorized. Valid INGESTION_SECRET required." 
  };
}

/**
 * Find or create marketplace record
 */
async function findOrCreateMarketplace(supabase: ReturnType<typeof createAdminClient>, marketplaceName: string) {
  const normalized = normalizeMarketplace(marketplaceName);
  
  // Try to find existing marketplace (exact match since name is unique)
  const { data: existing, error: findError } = await supabase
    .from("marketplaces")
    .select("id, name")
    .eq("name", normalized)
    .maybeSingle();
  
  if (existing && !findError) {
    // Type assertion: we know the structure from our select
    return { 
      id: (existing as { id: string; name: string }).id, 
      name: (existing as { id: string; name: string }).name 
    };
  }
  
  // Create new marketplace if not found
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error } = await supabase
    .from("marketplaces")
    .insert({
      name: normalized,
      display_name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
      base_url: `https://${normalized}.com`,
      color: "#6B7280", // Default gray color
      is_active: true,
    } as any)
    .select("id, name")
    .single();
  
  if (error || !created) {
    throw new Error(`Failed to create marketplace: ${error?.message || "Unknown error"}`);
  }
  
  return { 
    id: (created as { id: string; name: string }).id, 
    name: (created as { id: string; name: string }).name 
  };
}

/**
 * Try to match product by title and marketplace
 */
async function findProductByTitle(
  supabase: ReturnType<typeof createAdminClient>, 
  title: string,
  marketplaceId: string
): Promise<string | null> {
  // Simple title-based matching
  // TODO: Use matcher.ts for smarter matching
  
  const normalized = normalizeProductTitle(title);
  
  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .ilike("name", `%${normalized.slice(0, 30)}%`)
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  // Type assertion: we know the structure from our select
  return (data as { id: string; name: string }).id;
}

export async function POST(request: NextRequest): Promise<NextResponse<OfferSnapshotResponse>> {
  const startTime = Date.now();
  
  try {
    // 1. Authenticate
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: auth.error || "Unauthorized",
          code: "UNAUTHORIZED"
        },
        { 
          status: 401,
          headers: getCorsHeaders(),
        }
      );
    }
    
    // 2. Parse and validate input
    const body = await request.json();
    const validationResult = OfferSnapshotSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input data",
          code: "VALIDATION_ERROR",
          warnings: validationResult.error.issues.map(i => `${i.path.join(".")}: ${i.message}`),
        },
        { 
          status: 400,
          headers: getCorsHeaders(),
        }
      );
    }
    
    const input: OfferSnapshotInput = validationResult.data;
    const warnings: string[] = [];
    
    // 3. Normalize data
    const normalizedPrice = normalizePrice(input.price);
    const normalizedOriginalPrice = input.original_price ? normalizePrice(input.original_price) : null;
    const normalizedStockStatus = normalizeStockStatus(input.stock_status || "unknown");
    const normalizedCondition = normalizeCondition(input.condition); // Don't default to "new", normalizer handles it
    const normalizedTitle = normalizeProductTitle(input.title);
    
    // Validate price
    if (!normalizedPrice || normalizedPrice <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid price. Cannot save offer without valid price.",
          code: "INVALID_PRICE",
        },
        { status: 400 }
      );
    }
    
    // Calculate discount
    const discountPercent = normalizedOriginalPrice && normalizedOriginalPrice > normalizedPrice
      ? Math.round(((normalizedOriginalPrice - normalizedPrice) / normalizedOriginalPrice) * 100)
      : null;
    
    // 4. Find or create marketplace
    const supabase = createAdminClient();
    const marketplace = await findOrCreateMarketplace(supabase, input.marketplace);
    
    // 5. Try to match existing product
    let productId = await findProductByTitle(supabase, input.title, marketplace.id);
    
    if (!productId) {
      warnings.push("Could not match to existing product. Offer will be saved without product_id.");
    }
    
    // 6. Calculate confidence score
    // Map source string to proper sourceType
    let sourceType: "browser_collector" | "extension_snapshot" | "manual_admin" | "targeted_crawler" = "browser_collector";
    if (input.source === "manual_admin") {
      sourceType = "manual_admin";
    } else if (input.source === "extension_snapshot") {
      sourceType = "extension_snapshot";
    } else if (input.source === "targeted_crawler") {
      sourceType = "targeted_crawler";
    } else if (input.source === "browser_collector") {
      sourceType = "browser_collector";
    }
    
    const confidenceResult = calculateConfidenceScore({
      sourceType,
      capturedAt: input.captured_at ? new Date(input.captured_at) : new Date(),
      hasPrice: normalizedPrice > 0,
      hasSeller: !!input.seller_name,
      hasStock: normalizedStockStatus !== "unknown",
      hasVariant: !!input.variant,
      isOfficialStore: input.is_official_store,
      crossValidated: false,
      conflictDetected: false,
      parserError: false,
    });
    
    // 7. Upsert offer
    const offerData = {
      product_id: productId,
      marketplace_id: marketplace.id,
      marketplace_product_id: input.marketplace_product_id || null,
      title: normalizedTitle,
      image_url: input.image_url || null,
      category_hint: input.category_hint || null,
      url: input.product_url,
      seller_name: input.seller_name || null,
      seller_id: input.seller_id || null,
      seller_rating: input.seller_rating || null,
      seller_location: input.seller_location || null,
      is_official_store: input.is_official_store,
      condition: normalizedCondition,
      variant: input.variant || null,
      current_price: normalizedPrice,
      original_price: normalizedOriginalPrice,
      stock_status: normalizedStockStatus,
      shipping_estimate: input.shipping_estimate ? normalizePrice(input.shipping_estimate) : null,
      source: input.source,
      confidence_score: confidenceResult.score,
      confidence_label: confidenceResult.label,
      validation_status: "pending" as const,
      is_active: true,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .upsert(offerData as any, {
        onConflict: "url",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();
    
    if (offerError || !offer) {
      console.error("[OfferSnapshot] Offer upsert failed:", offerError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to save offer",
          code: "OFFER_UPSERT_FAILED",
        },
        { status: 500 }
      );
    }
    
    // Type assertion for offer ID
    const offerId = (offer as { id: string }).id;
    
    // 8. Insert price snapshot
    const snapshotData = {
      offer_id: offerId,
      price: normalizedPrice,
      original_price: normalizedOriginalPrice,
      discount_percent: discountPercent,
      stock_status: normalizedStockStatus,
      voucher_text: input.voucher_text || null,
      shipping_estimate: input.shipping_estimate ? normalizePrice(input.shipping_estimate) : null,
      source: input.source,
      confidence_score: confidenceResult.score,
      captured_at: input.captured_at || new Date().toISOString(),
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: snapshot, error: snapshotError } = await supabase
      .from("price_snapshots")
      .insert(snapshotData as any)
      .select("id")
      .single();
    
    if (snapshotError) {
      console.warn("[OfferSnapshot] Snapshot insert failed:", snapshotError);
      warnings.push("Failed to save price snapshot");
    }
    
    // 9. Log to ingestion_logs
    const duration = Date.now() - startTime;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("ingestion_logs").insert({
      source: input.source,
      job_name: "offer_snapshot_single",
      status: "success",
      processed_count: 1,
      success_count: 1,
      failed_count: 0,
      started_at: new Date(startTime).toISOString(),
      finished_at: new Date().toISOString(),
      metadata: {
        marketplace: marketplace.name,
        product_url: input.product_url,
        duration_ms: duration,
      },
    } as any);
    
    // 10. Return success
    return NextResponse.json({
      success: true,
      offer_id: offerId,
      snapshot_id: snapshot ? (snapshot as { id: string }).id : undefined,
      confidence_score: confidenceResult.score,
      confidence_label: confidenceResult.label,
      validation_status: "pending",
      warnings: warnings.length > 0 ? warnings : undefined,
    }, {
      headers: getCorsHeaders(),
    });
    
  } catch (error) {
    console.error("[OfferSnapshot] Unexpected error:", error);
    
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { 
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}

/**
 * GET /api/ingestion/offer-snapshot
 * 
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ingestion/offer-snapshot",
    method: "POST",
    description: "Simplified endpoint for browser collector to send single offer snapshot",
    authentication: "Bearer token in Authorization header (INGESTION_SECRET)",
    
    request: {
      marketplace: "string (required) - e.g., 'tokopedia', 'shopee'",
      product_url: "string (required) - Full product URL",
      title: "string (required) - Product title from marketplace",
      price: "string|number (required) - e.g., 'Rp 1.299.000' or 1299000",
      
      marketplace_product_id: "string (optional) - Marketplace's internal ID",
      original_price: "string|number (optional) - Before discount",
      seller_name: "string (optional)",
      seller_rating: "number (optional) - 0-5",
      seller_location: "string (optional)",
      is_official_store: "boolean (optional, default: false)",
      condition: "string (optional, default: 'new')",
      variant: "string (optional) - e.g., '128GB Black'",
      stock_status: "string (optional) - 'tersedia', 'habis', etc",
      rating: "number (optional) - Product rating 0-5",
      review_count: "number (optional)",
      sold_count: "number (optional)",
      shipping_estimate: "string|number (optional)",
      voucher_text: "string (optional)",
      image_url: "string (optional) - Product image URL",
      category_hint: "string (optional) - For template fallback",
      source: "string (optional, default: 'browser_collector')",
      captured_at: "string (optional) - ISO datetime",
      parser_version: "string (optional)",
    },
    
    response: {
      success: "boolean",
      offer_id: "string (uuid) - Created/updated offer ID",
      snapshot_id: "string (uuid) - Created snapshot ID",
      confidence_score: "number (0-100)",
      confidence_label: "string - sangat dipercaya, dipercaya, etc",
      validation_status: "string - pending, valid, conflict, etc",
      warnings: "array (optional) - Non-fatal warnings",
    },
    
    example: {
      authorization: "Bearer your-ingestion-secret-here",
      body: {
        marketplace: "tokopedia",
        product_url: "https://www.tokopedia.com/store/samsung-s24-ultra",
        title: "Samsung Galaxy S24 Ultra 12/256 Garansi Resmi",
        price: "Rp 13.250.000",
        original_price: "Rp 15.000.000",
        seller_name: "Samsung Official Store",
        is_official_store: true,
        stock_status: "tersedia",
        image_url: "https://images.tokopedia.net/...",
        category_hint: "smartphone",
      },
    },
  });
}
