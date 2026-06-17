/**
 * Unit tests: src/lib/price-conflict.ts
 *
 * Tests the price conflict detection and resolution helpers.
 * Critical for data quality — catches fake discounts, price spikes,
 * cross-marketplace anomalies.
 */
import { describe, it, expect } from "vitest";
import {
  detectPriceConflicts,
  calculatePriceVolatility,
  suggestConflictResolution,
} from "@/lib/price-conflict";

// Internal types not exported — mirror the source shape for typing
interface PriceSnapshot {
  offer_id: string;
  price: number;
  original_price?: number;
  captured_at: string;
  source: "browser_collector" | "manual_admin" | "api_scraper";
  confidence_score: number;
}

const snap = (overrides: Partial<PriceSnapshot>): PriceSnapshot => ({
  offer_id: "offer-1",
  price: 1000000,
  captured_at: "2026-06-10T10:00:00Z",
  source: "browser_collector",
  confidence_score: 80,
  ...overrides,
});


describe("detectPriceConflicts", () => {
  it("returns no conflict when fewer than 2 snapshots", () => {
    const result = detectPriceConflicts([], "prod-1");
    expect(result.hasConflict).toBe(false);
    expect(result.severity).toBe("low");
    expect(result.affectedOffers).toEqual([]);
  });

  it("returns no conflict with only 1 snapshot", () => {
    const result = detectPriceConflicts([snap({})], "prod-1");
    expect(result.hasConflict).toBe(false);
  });

  it("detects HUGE price jump >50% in <24h as high severity", () => {
    const result = detectPriceConflicts(
      [
        snap({ offer_id: "o1", price: 1000000, captured_at: "2026-06-10T10:00:00Z" }),
        snap({ offer_id: "o1", price: 2000000, captured_at: "2026-06-10T18:00:00Z" }),
      ],
      "prod-1"
    );
    expect(result.hasConflict).toBe(true);
    expect(result.severity).toBe("high");
    expect(result.affectedOffers).toContain("o1");
    expect(result.reason).toMatch(/lonjakan/i);
  });

  it("does NOT flag 50% jump if >24h apart", () => {
    const result = detectPriceConflicts(
      [
        snap({ offer_id: "o1", price: 1000000, captured_at: "2026-06-01T10:00:00Z" }),
        snap({ offer_id: "o1", price: 2000000, captured_at: "2026-06-10T10:00:00Z" }),
      ],
      "prod-1"
    );
    // No time-window conflict (cross-marketplace also unlikely with 1 offer)
    expect(result.hasConflict).toBe(false);
  });

  it("detects moderate price change >30% in <12h as medium severity", () => {
    const result = detectPriceConflicts(
      [
        snap({ offer_id: "o1", price: 1000000, captured_at: "2026-06-10T10:00:00Z" }),
        snap({ offer_id: "o1", price: 1400000, captured_at: "2026-06-10T15:00:00Z" }),
      ],
      "prod-1"
    );
    expect(result.hasConflict).toBe(true);
    expect(["medium", "high"]).toContain(result.severity);
    expect(result.affectedOffers).toContain("o1");
  });

  it("detects confidence drop (>80 to <50) as conflict", () => {
    const result = detectPriceConflicts(
      [
        snap({ offer_id: "o1", price: 1000000, confidence_score: 90 }),
        snap({ offer_id: "o1", price: 1000000, confidence_score: 30, captured_at: "2026-06-10T15:00:00Z" }),
      ],
      "prod-1"
    );
    expect(result.hasConflict).toBe(true);
    expect(result.reason).toMatch(/confidence/i);
  });

  it("detects fake discount pattern: original_price jumps >50% upward", () => {
    const result = detectPriceConflicts(
      [
        snap({
          offer_id: "o1",
          price: 1000000,
          original_price: 1200000,
          captured_at: "2026-06-10T10:00:00Z",
        }),
        snap({
          offer_id: "o1",
          price: 900000,
          original_price: 2500000, // sudden 2x jump
          captured_at: "2026-06-10T15:00:00Z",
        }),
      ],
      "prod-1"
    );
    expect(result.hasConflict).toBe(true);
    expect(result.severity).toBe("high");
    expect(result.reason).toMatch(/diskon palsu/i);
  });

  it("detects cross-marketplace >3x price difference as high severity", () => {
    const result = detectPriceConflicts(
      [
        snap({ offer_id: "tok", price: 1000000, captured_at: "2026-06-10T10:00:00Z" }),
        snap({ offer_id: "shopee", price: 1000000, captured_at: "2026-06-10T10:00:00Z" }),
        snap({ offer_id: "lazada", price: 4000000, captured_at: "2026-06-10T10:00:00Z" }),
      ],
      "prod-1"
    );
    expect(result.hasConflict).toBe(true);
    expect(result.severity).toBe("high");
    expect(result.reason).toMatch(/antar marketplace/i);
  });

  it("suggests action: high=flag, medium=recheck, low=review", () => {
    const high = detectPriceConflicts(
      [
        snap({ offer_id: "o1", price: 1000000, captured_at: "2026-06-10T10:00:00Z" }),
        snap({ offer_id: "o1", price: 2000000, captured_at: "2026-06-10T18:00:00Z" }),
      ],
      "prod-1"
    );
    expect(high.suggestedAction).toBe("flag");

    const none = detectPriceConflicts([], "prod-1");
    expect(none.suggestedAction).toBe("review");
  });
});

describe("calculatePriceVolatility", () => {
  it("returns 0 for empty array", () => {
    expect(calculatePriceVolatility([])).toBe(0);
  });

  it("returns 0 for single price (no variation possible)", () => {
    expect(calculatePriceVolatility([1000000])).toBe(0);
  });

  it("returns 0 when all prices are identical", () => {
    expect(calculatePriceVolatility([1000000, 1000000, 1000000])).toBe(0);
  });

  it("returns higher score for more volatile prices", () => {
    const stable = calculatePriceVolatility([1000, 1010, 990, 1005]);
    const volatile = calculatePriceVolatility([1000, 1500, 800, 1200]);
    expect(volatile).toBeGreaterThan(stable);
  });

  it("caps result at 1.0", () => {
    const extreme = calculatePriceVolatility([100, 10000, 50, 20000]);
    expect(extreme).toBeLessThanOrEqual(1);
  });
});

describe("suggestConflictResolution", () => {
  it("returns no_action for empty snapshots", () => {
    expect(suggestConflictResolution([])).toEqual({
      action: "no_action",
      reason: expect.stringMatching(/tidak ada data/i),
    });
  });

  it("prefers manual_admin source when its score is highest", () => {
    // The score blends confidence (70%) with recency (30%).
    // To force manual_admin to win, give it high confidence AND recency.
    const now = new Date().toISOString();
    const result = suggestConflictResolution([
      snap({ offer_id: "o1", source: "browser_collector", confidence_score: 95, captured_at: now }),
      snap({ offer_id: "o2", source: "manual_admin", confidence_score: 99, captured_at: now }),
    ]);
    expect(result.action).toBe("keep_manual");
  });

  it("does NOT pick manual_admin if its score is beaten by other source", () => {
    // browser_collector with very high confidence + recent will outscore manual_admin at 50
    const now = new Date().toISOString();
    const result = suggestConflictResolution([
      snap({ offer_id: "o1", source: "browser_collector", confidence_score: 95, captured_at: now }),
      snap({ offer_id: "o2", source: "manual_admin", confidence_score: 50, captured_at: now }),
    ]);
    // manual_admin is low score due to confidence 50, so keep_best wins
    expect(result.action).toBe("keep_best");
  });

  it("prefers highest confidence + recent when no manual data", () => {
    const result = suggestConflictResolution([
      snap({ offer_id: "o1", source: "browser_collector", confidence_score: 50 }),
      snap({ offer_id: "o2", source: "api_scraper", confidence_score: 90 }),
    ]);
    expect(result.action).toBe("keep_best");
    expect(result.reason).toMatch(/confidence/i);
  });

  it("suggests recheck_all when all sources have low confidence", () => {
    const result = suggestConflictResolution([
      snap({ offer_id: "o1", source: "browser_collector", confidence_score: 40 }),
      snap({ offer_id: "o2", source: "api_scraper", confidence_score: 30 }),
    ]);
    expect(result.action).toBe("recheck_all");
  });
});
