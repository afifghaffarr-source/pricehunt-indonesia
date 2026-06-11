import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// Validation schema for ingestion data
const OfferSchema = z.object({
  product_id: z.string().uuid(),
  marketplace_id: z.string().uuid(),
  marketplace_product_id: z.string().optional(),
  title: z.string().optional(), // NEW: Product title from marketplace
  image_url: z.string().url().optional(), // NEW: Product image URL
  category_hint: z.string().optional(), // NEW: For template image fallback
  seller_name: z.string().optional(),
  seller_id: z.string().optional(),
  seller_rating: z.number().min(0).max(5).optional(),
  seller_location: z.string().optional(),
  is_official_store: z.boolean().default(false),
  condition: z.enum(["new", "used", "refurbished", "unknown"]).default("new"),
  variant: z.string().optional(),
  url: z.string().url(),
  current_price: z.number().int().min(0),
  original_price: z.number().int().min(0).optional(),
  stock_status: z.enum(["in_stock", "low_stock", "out_of_stock", "unknown"]).default("unknown"),
  location: z.string().optional(),
  shipping_estimate: z.number().int().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  review_count: z.number().int().min(0).optional(),
  sold_count: z.number().int().min(0).optional(),
  voucher_text: z.string().optional(),
  source: z.string().default("collector"),
  confidence_score: z.number().int().min(0).max(100).default(80),
  confidence_label: z.string().optional(), // NEW: Human-readable confidence
  validation_status: z.enum(["pending", "valid", "conflict", "parser_error", "stale", "rejected"]).default("pending"), // NEW
});

const PriceSnapshotSchema = z.object({
  offer_id: z.string().uuid(),
  price: z.number().int().min(0),
  original_price: z.number().int().min(0).optional(),
  discount_percent: z.number().optional(),
  stock_status: z.enum(["in_stock", "low_stock", "out_of_stock", "unknown"]).optional(),
  voucher_text: z.string().optional(),
  shipping_estimate: z.number().int().min(0).optional(),
  source: z.string().default("collector"),
  confidence_score: z.number().int().min(0).max(100).optional(),
  raw_hash: z.string().optional(),
});

const IngestionRequestSchema = z.object({
  job_name: z.string().min(1),
  source: z.string().default("collector"),
  offers: z.array(OfferSchema).optional(),
  price_snapshots: z.array(PriceSnapshotSchema).optional(),
  metadata: z.record(z.any()).optional(),
});

type IngestionRequest = z.infer<typeof IngestionRequestSchema>;

/**
 * POST /api/ingestion
 * 
 * Secure endpoint for ingesting price data from collectors
 * Requires INGESTION_SECRET for authentication
 * Uses admin client to bypass RLS
 * 
 * Request body:
 * {
 *   "job_name": "tokopedia_hourly",
 *   "source": "python_collector",
 *   "offers": [...],
 *   "price_snapshots": [...],
 *   "metadata": { ... }
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Authenticate with INGESTION_SECRET
    const authHeader = request.headers.get("authorization");
    const secret = authHeader?.replace("Bearer ", "");
    
    const expectedSecret = process.env.INGESTION_SECRET;
    
    if (!expectedSecret) {
      console.error("[Ingestion] INGESTION_SECRET not configured");
      return NextResponse.json(
        { error: "Ingestion endpoint not configured" },
        { status: 500 }
      );
    }
    
    if (!secret || secret !== expectedSecret) {
      console.warn("[Ingestion] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized. Valid INGESTION_SECRET required." },
        { status: 401 }
      );
    }
    
    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = IngestionRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request body", 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }
    
    const data: IngestionRequest = validationResult.data;
    
    // 3. Create admin client for RLS bypass
    const supabase = createAdminClient();
    
    let offersProcessed = 0;
    let offersFailed = 0;
    let snapshotsProcessed = 0;
    let snapshotsFailed = 0;
    const errors: string[] = [];
    
    // 4. Process offers (upsert to prevent duplicates)
    if (data.offers && data.offers.length > 0) {
      for (const offer of data.offers) {
        try {
          // TODO: Regenerate Supabase types after migrations 107+108
          const { error } = await supabase
            .from("offers")
            .upsert({
              ...offer,
              last_checked_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any, {
              onConflict: "product_id,marketplace_id,marketplace_product_id",
              ignoreDuplicates: false, // Update existing
            });
          
          if (error) {
            offersFailed++;
            errors.push(`Offer upsert failed: ${error.message}`);
            console.error("[Ingestion] Offer error:", error);
          } else {
            offersProcessed++;
          }
        } catch (err) {
          offersFailed++;
          errors.push(`Offer exception: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    
    // 5. Process price snapshots
    if (data.price_snapshots && data.price_snapshots.length > 0) {
      for (const snapshot of data.price_snapshots) {
        try {
          // TODO: Regenerate Supabase types after migrations 107+108
          const { error } = await supabase
            .from("price_snapshots")
            .insert({
              ...snapshot,
              captured_at: new Date().toISOString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
          
          if (error) {
            snapshotsFailed++;
            errors.push(`Snapshot insert failed: ${error.message}`);
            console.error("[Ingestion] Snapshot error:", error);
          } else {
            snapshotsProcessed++;
          }
        } catch (err) {
          snapshotsFailed++;
          errors.push(`Snapshot exception: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    
    // 6. Log ingestion job to ingestion_logs
    const duration = Date.now() - startTime;
    const status = (offersFailed === 0 && snapshotsFailed === 0) ? "success" : 
                   (offersProcessed > 0 || snapshotsProcessed > 0) ? "partial" : "failed";
    
    try {
      // TODO: Regenerate Supabase types after migrations 107+108
      await supabase
        .from("ingestion_logs")
        .insert({
          job_name: data.job_name,
          source: data.source,
          status,
        items_processed: offersProcessed + snapshotsProcessed,
        items_failed: offersFailed + snapshotsFailed,
        duration_ms: duration,
        error_summary: errors.length > 0 ? errors.slice(0, 10).join("; ") : null,
        metadata: data.metadata || {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    } catch (logError) {
      console.error("[Ingestion] Failed to log job:", logError);
      // Don't fail the request if logging fails
    }
    
    // 7. Return results
    return NextResponse.json({
      success: status !== "failed",
      status,
      summary: {
        offers: {
          processed: offersProcessed,
          failed: offersFailed,
          total: data.offers?.length || 0,
        },
        price_snapshots: {
          processed: snapshotsProcessed,
          failed: snapshotsFailed,
          total: data.price_snapshots?.length || 0,
        },
      },
      duration_ms: duration,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    }, {
      status: status === "failed" ? 500 : 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
    
  } catch (error) {
    console.error("[Ingestion] Unexpected error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error during ingestion",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingestion
 * 
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ingestion",
    method: "POST",
    description: "Secure endpoint for ingesting price data from collectors",
    authentication: "Bearer token in Authorization header (INGESTION_SECRET)",
    rateLimit: "No limit (trusted source)",
    request: {
      job_name: "string (required) - Name of the ingestion job",
      source: "string (default: 'collector') - Data source identifier",
      offers: "array (optional) - Array of offer objects to upsert",
      price_snapshots: "array (optional) - Array of price snapshot objects to insert",
      metadata: "object (optional) - Additional metadata about the job",
    },
    response: {
      success: "boolean - Overall success status",
      status: "'success' | 'partial' | 'failed'",
      summary: "Object with processed/failed counts",
      duration_ms: "number - Processing time in milliseconds",
      errors: "array (optional) - Error messages if any failures",
    },
    example: {
      authorization: "Bearer your-ingestion-secret-here",
      body: {
        job_name: "tokopedia_electronics_hourly",
        source: "python_playwright_collector",
        offers: [
          {
            product_id: "uuid-here",
            marketplace_id: "uuid-here",
            marketplace_product_id: "tokopedia-12345",
            seller_name: "Official Store",
            is_official_store: true,
            url: "https://tokopedia.com/product/12345",
            current_price: 5000000,
            original_price: 6000000,
            stock_status: "in_stock",
            source: "collector",
            confidence_score: 95,
          },
        ],
      },
    },
  });
}
