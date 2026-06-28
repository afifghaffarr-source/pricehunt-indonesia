/**
 * Pure helpers for the offer-snapshot ingestion pipeline.
 *
 * Extracted from src/app/api/ingestion/offer-snapshot/route.ts during
 * Phase C refactor (was 244 lines of inline POST handler).
 *
 * Pure functions only (no I/O, no React, no Supabase client). Side-effecting
 * parts (DB lookups, upserts) stay in the route handler so this file is
 * fully unit-testable.
 */

import { normalizePrice, normalizeStockStatus, normalizeCondition, normalizeProductTitle } from "./normalizer";
import type { ConfidenceInput, ConfidenceResult } from "./confidence";

/**
 * Raw input shape from the collector (after Zod validation).
 * Mirror of OfferSnapshotInput inferred from the schema in route.ts.
 */
export interface OfferSnapshotInput {
  marketplace: string;
  product_url: string;
  title: string;
  price: string | number;
  marketplace_product_id?: string;
  original_price?: string | number;
  seller_name?: string;
  seller_id?: string;
  seller_rating?: number;
  seller_location?: string;
  is_official_store: boolean;
  condition?: string;
  variant?: string;
  stock_status?: string;
  rating?: number;
  review_count?: number;
  sold_count?: number;
  shipping_estimate?: string | number;
  voucher_text?: string;
  image_url?: string;
  category_hint?: string;
  source: string;
  captured_at?: string;
  parser_version?: string;
}

export interface NormalizedOffer {
  price: number;
  originalPrice: number | null;
  shippingEstimate: number | null;
  stockStatus: string;
  condition: string;
  title: string;
}

export type SourceType =
  | "browser_collector"
  | "extension_snapshot"
  | "manual_admin"
  | "targeted_crawler";

/**
 * Map raw source string to the DB enum.
 * Defaults to "browser_collector" for unknown values.
 */
export function mapSourceToSourceType(source: string | undefined): SourceType {
  switch (source) {
    case "manual_admin":
      return "manual_admin";
    case "extension_snapshot":
      return "extension_snapshot";
    case "targeted_crawler":
      return "targeted_crawler";
    case "browser_collector":
      return "browser_collector";
    default:
      return "browser_collector";
  }
}

/**
 * Normalize all numeric and string fields from raw input.
 * - price: parse "Rp 1.299.000" or 1299000 → integer
 * - original_price: same, may be null/undefined
 * - shipping_estimate: same, may be null/undefined
 * - stock_status: normalize to canonical enum
 * - condition: normalize (don't default to "new" — see normalizer)
 * - title: trim, collapse whitespace
 *
 * Returns null if price is invalid (caller decides how to handle).
 */
export function normalizeOfferInput(input: OfferSnapshotInput): NormalizedOffer | null {
  const price = normalizePrice(input.price);
  if (!price || price <= 0) return null;

  return {
    price,
    originalPrice: input.original_price ? normalizePrice(input.original_price) : null,
    shippingEstimate: input.shipping_estimate ? normalizePrice(input.shipping_estimate) : null,
    stockStatus: normalizeStockStatus(input.stock_status || "unknown"),
    condition: normalizeCondition(input.condition),
    title: normalizeProductTitle(input.title),
  };
}

/**
 * Calculate discount percent (0-100, rounded) from original + current price.
 * Returns null when no discount (original null, equal, or higher than current).
 */
export function calculateDiscountPercent(original: number | null, current: number): number | null {
  if (!original || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

/**
 * Build the row to upsert into the offers table.
 * Pure — caller handles the actual DB call.
 */
export function buildOfferInsertData(params: {
  input: OfferSnapshotInput;
  normalized: NormalizedOffer;
  productId: string | null;
  marketplaceId: string;
  sourceType: SourceType;
  confidence: ConfidenceResult;
  now: Date;
}) {
  const { input, normalized, productId, marketplaceId, sourceType, confidence, now } = params;
  const nowIso = now.toISOString();

  return {
    product_id: productId,
    marketplace_id: marketplaceId,
    marketplace_product_id: input.marketplace_product_id || null,
    title: normalized.title,
    image_url: input.image_url || null,
    category_hint: input.category_hint || null,
    url: input.product_url,
    seller_name: input.seller_name || null,
    seller_id: input.seller_id || null,
    seller_rating: input.seller_rating || null,
    seller_location: input.seller_location || null,
    is_official_store: input.is_official_store,
    condition: normalized.condition,
    variant: input.variant || null,
    current_price: normalized.price,
    original_price: normalized.originalPrice,
    stock_status: normalized.stockStatus,
    shipping_estimate: normalized.shippingEstimate,
    source: sourceType,
    confidence_score: confidence.score,
    confidence_label: confidence.label,
    validation_status: "pending" as const,
    is_active: true,
    last_checked_at: nowIso,
    updated_at: nowIso,
  };
}

/**
 * Build the row to insert into price_snapshots.
 * Pure — caller handles the actual DB call.
 */
export function buildSnapshotInsertData(params: {
  input: OfferSnapshotInput;
  normalized: NormalizedOffer;
  offerId: string;
  confidence: ConfidenceResult;
  discountPercent: number | null;
  now: Date;
}) {
  const { input, normalized, offerId, confidence, discountPercent, now } = params;

  return {
    offer_id: offerId,
    current_price: normalized.price,
    original_price: normalized.originalPrice,
    discount_percent: discountPercent,
    stock_status: normalized.stockStatus,
    voucher_text: input.voucher_text || null,
    shipping_estimate: normalized.shippingEstimate,
    source: mapSourceToSourceType(input.source),
    confidence_score: confidence.score,
    captured_at: input.captured_at || now.toISOString(),
  };
}

/**
 * Build the row to insert into ingestion_logs.
 * Pure — caller handles the actual DB call.
 */
export function buildIngestionLogData(params: {
  input: OfferSnapshotInput;
  marketplaceName: string;
  startTime: number;
  endTime: number;
  success: boolean;
}) {
  const { input, marketplaceName, startTime, endTime, success } = params;

  return {
    source: input.source,
    log_status: success ? "success" : "failed",
    items_processed: 1,
    items_created: 1,
    items_failed: 0,
    started_at: new Date(startTime).toISOString(),
    completed_at: new Date(endTime).toISOString(),
    metadata: {
      job_name: "offer_snapshot_single",
      marketplace: marketplaceName,
      product_url: input.product_url,
      duration_ms: endTime - startTime,
    },
  };
}

/**
 * Build the ConfidenceInput object for the confidence scorer from raw input.
 * Pure — caller passes result to calculateConfidenceScore.
 */
export function buildConfidenceInput(
  input: OfferSnapshotInput,
  normalized: NormalizedOffer,
  sourceType: SourceType
): ConfidenceInput {
  return {
    sourceType,
    capturedAt: input.captured_at ? new Date(input.captured_at) : new Date(),
    hasPrice: normalized.price > 0,
    hasSeller: !!input.seller_name,
    hasStock: normalized.stockStatus !== "unknown",
    hasVariant: !!input.variant,
    isOfficialStore: input.is_official_store,
    crossValidated: false,
    conflictDetected: false,
    parserError: false,
  };
}
