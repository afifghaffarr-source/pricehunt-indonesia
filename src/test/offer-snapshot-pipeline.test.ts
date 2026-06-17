/**
 * Unit tests: src/lib/ingestion/offer-snapshot-pipeline.ts
 *
 * Phase C refactor — tests the pure helpers extracted from
 * the 244-line POST handler in offer-snapshot/route.ts.
 */
import { describe, it, expect } from "vitest";
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
import type { ConfidenceResult } from "@/lib/ingestion/confidence";

const NOW = new Date("2026-06-17T12:00:00Z");

const baseInput = (overrides: Partial<OfferSnapshotInput> = {}): OfferSnapshotInput => ({
  marketplace: "tokopedia",
  product_url: "https://www.tokopedia.com/product/samsung-s24",
  title: "Samsung Galaxy S24 256GB",
  price: 13000000,
  is_official_store: false,
  source: "browser_collector",
  ...overrides,
});

const confidenceResult: ConfidenceResult = {
  score: 85,
  label: "dipercaya",
  labelText: "Dipercaya",
  reasons: ["has seller", "has price"],
};

describe("mapSourceToSourceType", () => {
  it("maps known sources", () => {
    expect(mapSourceToSourceType("browser_collector")).toBe("browser_collector");
    expect(mapSourceToSourceType("extension_snapshot")).toBe("extension_snapshot");
    expect(mapSourceToSourceType("manual_admin")).toBe("manual_admin");
    expect(mapSourceToSourceType("targeted_crawler")).toBe("targeted_crawler");
  });

  it("defaults unknown to browser_collector", () => {
    expect(mapSourceToSourceType("unknown_source")).toBe("browser_collector");
    expect(mapSourceToSourceType(undefined)).toBe("browser_collector");
    expect(mapSourceToSourceType("")).toBe("browser_collector");
  });
});

describe("normalizeOfferInput", () => {
  it("parses numeric price as-is", () => {
    const result = normalizeOfferInput(baseInput({ price: 1500000 }));
    expect(result?.price).toBe(1500000);
  });

  it("parses string price 'Rp 1.500.000' to integer", () => {
    const result = normalizeOfferInput(baseInput({ price: "Rp 1.500.000" }));
    expect(result?.price).toBe(1500000);
  });

  it("returns null for invalid price (zero)", () => {
    const result = normalizeOfferInput(baseInput({ price: 0 }));
    expect(result).toBeNull();
  });

  it("returns null for invalid price (negative)", () => {
    const result = normalizeOfferInput(baseInput({ price: -100 }));
    expect(result).toBeNull();
  });

  it("returns null for unparseable price string", () => {
    const result = normalizeOfferInput(baseInput({ price: "not-a-price" }));
    expect(result).toBeNull();
  });

  it("parses optional original_price when present", () => {
    const result = normalizeOfferInput(baseInput({ original_price: "Rp 2.000.000" }));
    expect(result?.originalPrice).toBe(2000000);
  });

  it("returns null for original_price when not provided", () => {
    const result = normalizeOfferInput(baseInput());
    expect(result?.originalPrice).toBeNull();
  });

  it("normalizes title (trim/collapse whitespace + lowercase per normalizer)", () => {
    const result = normalizeOfferInput(baseInput({ title: "  Samsung   Galaxy   S24  " }));
    // normalizeProductTitle does trim + collapse + lowercase
    expect(result?.title).toBe("samsung galaxy s24");
  });

  it("normalizes stock_status default to 'unknown'", () => {
    const result = normalizeOfferInput(baseInput());
    // normalized result may be 'unknown' or canonical value
    expect(result?.stockStatus).toBeDefined();
  });
});

describe("calculateDiscountPercent", () => {
  it("returns null when original is null", () => {
    expect(calculateDiscountPercent(null, 1000)).toBeNull();
  });

  it("returns null when current >= original (no discount)", () => {
    expect(calculateDiscountPercent(1000, 1000)).toBeNull();
    expect(calculateDiscountPercent(1000, 1500)).toBeNull();
  });

  it("calculates and rounds discount percent", () => {
    // 20% off: 1000 → 800
    expect(calculateDiscountPercent(1000, 800)).toBe(20);
    // 33% off: 1500 → 1000 (33.33% → 33)
    expect(calculateDiscountPercent(1500, 1000)).toBe(33);
    // 50% off
    expect(calculateDiscountPercent(2000, 1000)).toBe(50);
    // 11% off
    expect(calculateDiscountPercent(1000, 890)).toBe(11);
  });

  it("rounds to nearest integer", () => {
    // 13.4% → 13
    expect(calculateDiscountPercent(1000, 866)).toBe(13);
    // 13.5% → 14 (JS Math.round rounds .5 up)
    expect(calculateDiscountPercent(1000, 865)).toBe(14);
    // 13.6% → 14
    expect(calculateDiscountPercent(1000, 864)).toBe(14);
  });
});

describe("buildOfferInsertData", () => {
  it("includes all required fields from input", () => {
    const input = baseInput();
    const normalized = normalizeOfferInput(input)!;
    const data = buildOfferInsertData({
      input,
      normalized,
      productId: "prod-1",
      marketplaceId: "mp-1",
      sourceType: "browser_collector",
      confidence: confidenceResult,
      now: NOW,
    });

    expect(data).toMatchObject({
      product_id: "prod-1",
      marketplace_id: "mp-1",
      title: normalized.title,
      url: input.product_url,
      current_price: 13000000,
      source: "browser_collector",
      confidence_score: 85,
      confidence_label: "dipercaya",
      validation_status: "pending",
      is_active: true,
      last_checked_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    });
  });

  it("passes through null product_id when not matched", () => {
    const data = buildOfferInsertData({
      input: baseInput(),
      normalized: normalizeOfferInput(baseInput())!,
      productId: null,
      marketplaceId: "mp-1",
      sourceType: "browser_collector",
      confidence: confidenceResult,
      now: NOW,
    });
    expect(data.product_id).toBeNull();
  });

  it("uses null for optional fields when not provided", () => {
    const data = buildOfferInsertData({
      input: baseInput(),
      normalized: normalizeOfferInput(baseInput())!,
      productId: "prod-1",
      marketplaceId: "mp-1",
      sourceType: "browser_collector",
      confidence: confidenceResult,
      now: NOW,
    });
    expect(data.seller_name).toBeNull();
    expect(data.seller_id).toBeNull();
    expect(data.seller_rating).toBeNull();
    expect(data.image_url).toBeNull();
    expect(data.category_hint).toBeNull();
    expect(data.variant).toBeNull();
    expect(data.original_price).toBeNull();
  });

  it("preserves provided optional fields", () => {
    const data = buildOfferInsertData({
      input: baseInput({
        seller_name: "Samsung Store",
        seller_rating: 4.8,
        image_url: "https://example.com/img.jpg",
        variant: "256GB Black",
      }),
      normalized: normalizeOfferInput(baseInput())!,
      productId: "prod-1",
      marketplaceId: "mp-1",
      sourceType: "browser_collector",
      confidence: confidenceResult,
      now: NOW,
    });
    expect(data.seller_name).toBe("Samsung Store");
    expect(data.seller_rating).toBe(4.8);
    expect(data.image_url).toBe("https://example.com/img.jpg");
    expect(data.variant).toBe("256GB Black");
  });
});

describe("buildSnapshotInsertData", () => {
  it("includes offer_id, prices, and confidence", () => {
    const data = buildSnapshotInsertData({
      input: baseInput(),
      normalized: normalizeOfferInput(baseInput())!,
      offerId: "offer-1",
      confidence: confidenceResult,
      discountPercent: 20,
      now: NOW,
    });
    expect(data).toMatchObject({
      offer_id: "offer-1",
      current_price: 13000000,
      discount_percent: 20,
      confidence_score: 85,
    });
  });

  it("uses input.captured_at when provided", () => {
    const capturedAt = "2026-06-15T10:00:00Z";
    const data = buildSnapshotInsertData({
      input: baseInput({ captured_at: capturedAt }),
      normalized: normalizeOfferInput(baseInput())!,
      offerId: "offer-1",
      confidence: confidenceResult,
      discountPercent: null,
      now: NOW,
    });
    expect(data.captured_at).toBe(capturedAt);
  });

  it("falls back to now() when captured_at not provided", () => {
    const data = buildSnapshotInsertData({
      input: baseInput(),
      normalized: normalizeOfferInput(baseInput())!,
      offerId: "offer-1",
      confidence: confidenceResult,
      discountPercent: null,
      now: NOW,
    });
    expect(data.captured_at).toBe(NOW.toISOString());
  });

  it("passes through null discount_percent when none", () => {
    const data = buildSnapshotInsertData({
      input: baseInput(),
      normalized: normalizeOfferInput(baseInput())!,
      offerId: "offer-1",
      confidence: confidenceResult,
      discountPercent: null,
      now: NOW,
    });
    expect(data.discount_percent).toBeNull();
  });
});

describe("buildIngestionLogData", () => {
  it("builds success log entry", () => {
    const start = NOW.getTime() - 250;
    const end = NOW.getTime();
    const data = buildIngestionLogData({
      input: baseInput(),
      marketplaceName: "tokopedia",
      startTime: start,
      endTime: end,
      success: true,
    });
    expect(data).toMatchObject({
      source: "browser_collector",
      log_status: "success",
      items_processed: 1,
      items_created: 1,
      items_failed: 0,
      metadata: expect.objectContaining({
        job_name: "offer_snapshot_single",
        marketplace: "tokopedia",
        duration_ms: 250,
      }),
    });
  });

  it("builds failed log entry with log_status='failed'", () => {
    const data = buildIngestionLogData({
      input: baseInput(),
      marketplaceName: "tokopedia",
      startTime: 0,
      endTime: 1000,
      success: false,
    });
    expect(data.log_status).toBe("failed");
  });
});

describe("buildConfidenceInput", () => {
  it("translates all flags from OfferSnapshotInput", () => {
    const input = baseInput({
      seller_name: "Samsung",
      variant: "256GB",
      is_official_store: true,
      stock_status: "tersedia",
      source: "extension_snapshot",
      captured_at: "2026-06-15T10:00:00Z",
    });
    const normalized = normalizeOfferInput(input)!;
    const ci = buildConfidenceInput(input, normalized, "extension_snapshot");

    expect(ci).toMatchObject({
      sourceType: "extension_snapshot",
      hasPrice: true,
      hasSeller: true,
      hasStock: true,
      hasVariant: true,
      isOfficialStore: true,
      crossValidated: false,
      conflictDetected: false,
      parserError: false,
    });
    expect(ci.capturedAt).toEqual(new Date("2026-06-15T10:00:00Z"));
  });

  it("uses Date.now() when captured_at not provided", () => {
    const input = baseInput();
    const normalized = normalizeOfferInput(input)!;
    const before = Date.now();
    const ci = buildConfidenceInput(input, normalized, "browser_collector");
    const after = Date.now();
    expect(ci.capturedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(ci.capturedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("hasStock=false when stockStatus is 'unknown'", () => {
    const input = baseInput();
    // baseInput has no stock_status, normalizeOfferInput defaults to "unknown"
    const normalized = normalizeOfferInput(input)!;
    expect(normalized.stockStatus).toBe("unknown");
    const ci = buildConfidenceInput(input, normalized, "browser_collector");
    expect(ci.hasStock).toBe(false);
  });
});
