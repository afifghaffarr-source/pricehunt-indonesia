/**
 * POST /api/ingestion/offer-snapshot
 *
 * Simplified endpoint for browser collector to send single offer snapshot.
 * This is the main endpoint Python collector will use.
 *
 * Security: INGESTION_SECRET for internal tools.
 *
 * Phase C refactor: route is now thin orchestration.
 * Pure data-shape logic lives in src/lib/ingestion/offer-snapshot-pipeline.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { getIngestionSecret } from "@/lib/env";
import { z } from "zod";
import { normalizeMarketplace } from "@/lib/ingestion/normalizer";
import { calculateConfidenceScore } from "@/lib/ingestion/confidence";
import { findBestProductMatch } from "@/lib/ingestion/matcher";
import {
  buildOfferInsertData,
  buildSnapshotInsertData,
  buildIngestionLogData,
  buildConfidenceInput,
  mapSourceToSourceType,
  normalizeOfferInput,
  calculateDiscountPercent,
  type OfferSnapshotInput,
} from "@/lib/ingestion/offer-snapshot-pipeline";

// Validation schema - matches Python collector output
const OfferSnapshotSchema = z.object({
  marketplace: z.string().min(1),
  product_url: z.string().url(),
  title: z.string().min(1),
  price: z.union([z.string(), z.number()]),

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

  source: z.string().default("browser_collector"),
  captured_at: z.string().datetime().optional(),
  parser_version: z.string().optional(),
});

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

// A-006: CORS is enforced by src/proxy.ts (allowed-origin allowlist).
// Returning ACAO: * here would let any origin call the ingestion endpoint
// once the CSRF/INGESTION_SECRET gate is satisfied — proxy already
// handles preflight + non-preflight headers for /api/ingestion/*.

/**
 * Authenticate request via INGESTION_SECRET bearer token.
 * (User session auth not implemented yet — TODO.)
 */
async function authenticateRequest(request: NextRequest): Promise<{ success: boolean; error?: string }> {
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");
  const expectedSecret = getIngestionSecret();

  if (expectedSecret && secret === expectedSecret) {
    return { success: true };
  }

  return {
    success: false,
    error: "Unauthorized. Valid INGESTION_SECRET required.",
  };
}

/**
 * Find or create marketplace record.
 * Returns the marketplace id and canonical name.
 */
async function findOrCreateMarketplace(
  supabase: ReturnType<typeof createAdminClient>,
  marketplaceName: string
) {
  const normalized = normalizeMarketplace(marketplaceName);
  type MarketplaceName = Database["public"]["Enums"]["marketplace_name"];

  const { data: existing, error: findError } = await supabase
    .from("marketplaces")
    .select("id, name")
    .eq("name", normalized as MarketplaceName)
    .maybeSingle();

  if (existing && !findError) {
    return {
      id: (existing as { id: string; name: string }).id,
      name: (existing as { id: string; name: string }).name,
    };
  }

  const { data: created, error } = await supabase
    .from("marketplaces")
    .insert({
      name: normalized as Database["public"]["Enums"]["marketplace_name"],
      display_name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
      base_url: `https://${normalized}.com`,
      color: "#6B7280",
      is_active: true,
    })
    .select("id, name")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create marketplace: ${error?.message || "Unknown error"}`);
  }

  return {
    id: (created as { id: string; name: string }).id,
    name: (created as { id: string; name: string }).name,
  };
}

/**
 * Match an offer to an existing product using the smarter matcher.
 * Returns the matched product id, or null when no confident match.
 */
async function findProductByTitle(
  supabase: ReturnType<typeof createAdminClient>,
  title: string,
  price: number,
  marketplace: string,
  variant: string | null = null,
  condition: string = "new"
): Promise<string | null> {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category")
    .limit(200);

  if (error || !products || products.length === 0) {
    return null;
  }

  const { bestMatch } = findBestProductMatch(
    {
      title,
      price,
      marketplace,
      variant,
      condition: condition as "new" | "used" | "refurbished",
    },
    products.map((p) => ({
      id: p.id,
      title: p.name,
      brand: null,
      category: p.category,
    }))
  );

  if (!bestMatch) return null;

  if (bestMatch.result.warnings.length > 0) {
    console.log(
      `[OfferSnapshot] Match for "${title}": score=${bestMatch.result.score} (${bestMatch.result.confidence}) | ${bestMatch.result.warnings.join("; ")}`
    );
  }

  return bestMatch.productId;
}

// ──────────────────────────────────────────────────────────────────────────
// HTTP handler — thin orchestration
// ──────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<OfferSnapshotResponse>> {
  const startTime = Date.now();

  try {
    // 1. Authenticate
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.error || "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Parse + validate input
    const body = await request.json();
    const validationResult = OfferSnapshotSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input data",
          code: "VALIDATION_ERROR",
          warnings: validationResult.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`
          ),
        },
        { status: 400 }
      );
    }

    const input: OfferSnapshotInput = validationResult.data;
    const warnings: string[] = [];
    const now = new Date();

    // 3. Normalize input
    const normalized = normalizeOfferInput(input);
    if (!normalized) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid price. Cannot save offer without valid price.",
          code: "INVALID_PRICE",
        },
        { status: 400 }
      );
    }
    const discountPercent = calculateDiscountPercent(normalized.originalPrice, normalized.price);

    // 4. Lookup marketplace (DB) + match product (DB)
    const supabase = createAdminClient();
    const marketplace = await findOrCreateMarketplace(supabase, input.marketplace);
    const productId = await findProductByTitle(
      supabase,
      input.title,
      normalized.price,
      marketplace.name,
      input.variant ?? null,
      normalized.condition
    );
    if (!productId) {
      warnings.push("Could not match to existing product. Offer will be saved without product_id.");
    }

    // 5. Calculate confidence (pure)
    const sourceType = mapSourceToSourceType(input.source);
    const confidence = calculateConfidenceScore(buildConfidenceInput(input, normalized, sourceType));

    // 6. Upsert offer
    const offerInsert = buildOfferInsertData({
      input,
      normalized,
      productId,
      marketplaceId: marketplace.id,
      sourceType,
      confidence,
      now,
    });

    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .upsert(offerInsert as Database["public"]["Tables"]["offers"]["Insert"], {
        // (product_id, marketplace_id) UNIQUE constraint added in v1.5.3.
        onConflict: "product_id,marketplace_id",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();

    if (offerError || !offer) {
      console.error("[OfferSnapshot] Offer upsert failed:", offerError);
      return NextResponse.json(
        { success: false, message: "Failed to save offer", code: "OFFER_UPSERT_FAILED" },
        { status: 500 }
      );
    }
    const offerId = (offer as { id: string }).id;

    // 7. Insert price snapshot (best-effort)
    const snapshotInsert = buildSnapshotInsertData({
      input,
      normalized,
      offerId,
      confidence,
      discountPercent,
      now,
    });
    const { data: snapshot, error: snapshotError } = await supabase
      .from("price_snapshots")
      .insert(snapshotInsert as Database["public"]["Tables"]["price_snapshots"]["Insert"])
      .select("id")
      .single();

    if (snapshotError) {
      console.warn("[OfferSnapshot] Snapshot insert failed:", snapshotError);
      warnings.push("Failed to save price snapshot");
    }

    // 8. Log to ingestion_logs (best-effort)
    await supabase
      .from("ingestion_logs")
      .insert(
        buildIngestionLogData({
          input,
          marketplaceName: marketplace.name,
          startTime,
          endTime: Date.now(),
          success: true,
        }) as Database["public"]["Tables"]["ingestion_logs"]["Insert"]
      );

    // 9. Return success
    return NextResponse.json({
      success: true,
      offer_id: offerId,
      snapshot_id: snapshot ? (snapshot as { id: string }).id : undefined,
      confidence_score: confidence.score,
      confidence_label: confidence.label,
      validation_status: "pending",
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    console.error("[OfferSnapshot] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingestion/offer-snapshot
 *
 * Returns API documentation for the endpoint.
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
