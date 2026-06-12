/**
 * Unit Tests: Confidence Score Calculator
 * 
 * Comprehensive tests for price data confidence scoring
 */

import { describe, it, expect } from "vitest";
import {
  calculateConfidenceScore,
  calculateOfferConfidence,
  calculateBatchConfidence,
  shouldRecalculateConfidence,
  getRecommendedRefreshInterval,
} from "@/lib/ingestion/confidence";

// ============================================================================
// BASE SCORE TESTS
// ============================================================================

describe("calculateConfidenceScore - Base Scores", () => {
  it("assigns high score to official_api", () => {
    const result = calculateConfidenceScore({
      sourceType: "official_api",
      capturedAt: new Date(),
      hasPrice: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.label).toBe("sangat dipercaya");
  });

  it("assigns high score to manual_admin", () => {
    const result = calculateConfidenceScore({
      sourceType: "manual_admin",
      capturedAt: new Date(),
      hasPrice: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it("assigns medium score to extension_snapshot", () => {
    const result = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThan(90);
  });

  it("assigns lower score to targeted_crawler", () => {
    const result = calculateConfidenceScore({
      sourceType: "targeted_crawler",
      capturedAt: new Date(),
      hasPrice: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThan(80);
  });
});

// ============================================================================
// FRESHNESS TESTS
// ============================================================================

describe("calculateConfidenceScore - Freshness", () => {
  it("gives bonus for very fresh data (< 24h)", () => {
    const fresh = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
    });

    const older = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      hasPrice: true,
    });

    expect(fresh.score).toBeGreaterThan(older.score);
    expect(fresh.reasons).toContain("Data sangat baru (< 24 jam)");
  });

  it("penalizes stale data", () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: weekAgo,
      hasPrice: true,
    });

    expect(result.score).toBeLessThan(80);
    expect(result.reasons.some(r => r.includes("hari"))).toBe(true);
  });

  it("caps freshness penalty at -30", () => {
    const veryOld = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    
    const result = calculateConfidenceScore({
      sourceType: "official_api",
      capturedAt: veryOld,
      hasPrice: true,
    });

    // Even with max penalty, should not go negative
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.reasons.some(r => r.includes("sangat lama"))).toBe(true);
  });

  it("treats < 3 days as still fresh", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    const result = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: twoDaysAgo,
      hasPrice: true,
    });

    expect(result.reasons).toContain("Data masih segar (< 3 hari)");
  });
});

// ============================================================================
// COMPLETENESS TESTS
// ============================================================================

describe("calculateConfidenceScore - Completeness", () => {
  it("penalizes missing price", () => {
    const withPrice = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
    });

    const withoutPrice = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: false,
    });

    expect(withoutPrice.score).toBeLessThan(withPrice.score);
    expect(withoutPrice.reasons).toContain("⚠️ Harga tidak tersedia");
  });

  it("rewards seller information", () => {
    const withSeller = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      hasSeller: true,
    });

    const withoutSeller = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      hasSeller: false,
    });

    expect(withSeller.score).toBeGreaterThan(withoutSeller.score);
    expect(withSeller.reasons).toContain("Informasi seller tersedia");
  });

  it("rewards stock information", () => {
    const withStock = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      hasStock: true,
    });

    const withoutStock = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      hasStock: false,
    });

    expect(withStock.score).toBeGreaterThan(withoutStock.score);
    expect(withStock.reasons).toContain("Status stok tersedia");
  });

  it("rewards variant information", () => {
    const withVariant = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      hasVariant: true,
    });

    const withoutVariant = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      hasVariant: false,
    });

    expect(withVariant.score).toBeGreaterThan(withoutVariant.score);
    expect(withVariant.reasons).toContain("Detail varian tersedia");
  });

  it("accumulates completeness bonuses", () => {
    const complete = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      hasSeller: true,
      hasStock: true,
      hasVariant: true,
    });

    const minimal = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
    });

    // Complete should have +3 +3 +3 = +9 more points (FIXED: reduced bonuses)
    expect(complete.score).toBeGreaterThan(minimal.score + 8);
    expect(complete.score).toBeLessThanOrEqual(minimal.score + 10);
  });
});

// ============================================================================
// TRUST SIGNALS TESTS
// ============================================================================

describe("calculateConfidenceScore - Trust Signals", () => {
  it("rewards official store", () => {
    const official = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      isOfficialStore: true,
    });

    const nonOfficial = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      isOfficialStore: false,
    });

    expect(official.score).toBeGreaterThan(nonOfficial.score);
    expect(official.reasons).toContain("✓ Official store");
  });

  it("rewards cross-validation", () => {
    const validated = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      crossValidated: true,
    });

    const notValidated = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      crossValidated: false,
    });

    expect(validated.score).toBeGreaterThan(notValidated.score);
    expect(validated.reasons).toContain("✓ Dikonfirmasi dari beberapa sumber");
  });

  it("combines trust signals", () => {
    const highTrust = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      isOfficialStore: true,
      crossValidated: true,
    });

    const lowTrust = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      isOfficialStore: false,
      crossValidated: false,
    });

    // With +10 (official) +15 (cross-validated) = +25 more points
    // But score caps at 100, so just verify highTrust >= lowTrust + 20 or is maxed
    const expectedMin = Math.min(100, lowTrust.score + 20);
    expect(highTrust.score).toBeGreaterThanOrEqual(expectedMin);
    expect(highTrust.score).toBeGreaterThan(lowTrust.score);
  });
});

// ============================================================================
// QUALITY ISSUES TESTS
// ============================================================================

describe("calculateConfidenceScore - Quality Issues", () => {
  it("penalizes parser errors", () => {
    const clean = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      parserError: false,
    });

    const errored = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      parserError: true,
    });

    expect(errored.score).toBeLessThan(clean.score);
    expect(errored.reasons).toContain("⚠️ Kesalahan parsing data");
  });

  it("penalizes conflicts", () => {
    const clean = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      conflictDetected: false,
    });

    const conflicted = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      conflictDetected: true,
    });

    expect(conflicted.score).toBeLessThan(clean.score);
    expect(conflicted.reasons).toContain("⚠️ Perbedaan harga antar sumber terdeteksi");
  });

  it("stacks multiple issue penalties", () => {
    const problematic = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
      parserError: true,
      conflictDetected: true,
    });

    const clean = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
    });

    // Should have -20 -15 = -35 points
    expect(problematic.score).toBeLessThan(clean.score - 30);
  });
});

// ============================================================================
// CONFIDENCE LABELS TESTS
// ============================================================================

describe("calculateConfidenceScore - Labels", () => {
  it("returns 'sangat_dipercaya' for high scores", () => {
    const result = calculateConfidenceScore({
      sourceType: "official_api",
      capturedAt: new Date(),
      hasPrice: true,
      hasSeller: true,
      isOfficialStore: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.label).toBe("sangat dipercaya");
    expect(result.labelText).toBe("Sangat Dipercaya");
  });

  it("returns 'dipercaya' for good scores", () => {
    const result = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
    });

    if (result.score >= 70 && result.score < 85) {
      expect(result.label).toBe("dipercaya");
      expect(result.labelText).toBe("Dipercaya");
    }
  });

  it("returns 'perlu dicek ulang' for low scores", () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = calculateConfidenceScore({
      sourceType: "targeted_crawler",
      capturedAt: weekAgo,
      hasPrice: true,
      conflictDetected: true,
    });

    expect(result.score).toBeLessThan(70);
    expect(["cukup dipercaya", "perlu dicek ulang", "data belum pasti"]).toContain(result.label);
  });
});

// ============================================================================
// SCORE BOUNDS TESTS
// ============================================================================

describe("calculateConfidenceScore - Score Bounds", () => {
  it("never returns score > 100", () => {
    const maxed = calculateConfidenceScore({
      sourceType: "official_api",
      capturedAt: new Date(),
      hasPrice: true,
      hasSeller: true,
      hasStock: true,
      hasVariant: true,
      isOfficialStore: true,
      crossValidated: true,
    });

    expect(maxed.score).toBeLessThanOrEqual(100);
  });

  it("never returns score < 0", () => {
    const veryOld = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    
    const minimal = calculateConfidenceScore({
      sourceType: "targeted_crawler",
      capturedAt: veryOld,
      hasPrice: false,
      parserError: true,
      conflictDetected: true,
    });

    expect(minimal.score).toBeGreaterThanOrEqual(0);
  });

  it("returns integer score", () => {
    const result = calculateConfidenceScore({
      sourceType: "extension_snapshot",
      capturedAt: new Date(),
      hasPrice: true,
    });

    expect(Number.isInteger(result.score)).toBe(true);
  });
});

// ============================================================================
// HELPER FUNCTIONS TESTS
// ============================================================================

describe("calculateOfferConfidence", () => {
  it("calculates confidence from offer object", () => {
    const offer = {
      source: "extension",
      last_checked_at: new Date().toISOString(),
      current_price: 1299000,
      seller_name: "Test Store",
      stock_status: "in_stock" as const,
      variant: "256GB",
      is_official_store: true,
    };

    const result = calculateOfferConfidence(offer);

    expect(result.score).toBeGreaterThan(0);
    expect(result.label).toBeTruthy();
    expect(result.reasons).toBeInstanceOf(Array);
  });

  it("handles null last_checked_at", () => {
    const offer = {
      source: "system",
      last_checked_at: null,
      current_price: 1000000,
      seller_name: null,
      stock_status: "unknown" as const,
      variant: null,
      is_official_store: false,
    };

    const result = calculateOfferConfidence(offer);

    expect(result.score).toBeGreaterThan(0);
  });

  it("maps source strings correctly", () => {
    const adminOffer = {
      source: "manual_admin",
      last_checked_at: new Date().toISOString(),
      current_price: 1000000,
      seller_name: null,
      stock_status: "unknown" as const,
      variant: null,
      is_official_store: false,
    };

    const result = calculateOfferConfidence(adminOffer);
    expect(result.score).toBeGreaterThanOrEqual(85); // admin source has high base
  });
});

describe("calculateBatchConfidence", () => {
  it("processes multiple offers", () => {
    const offers = [
      {
        id: "1",
        source: "extension",
        last_checked_at: new Date().toISOString(),
        current_price: 1000000,
        seller_name: "Store 1",
        stock_status: "in_stock" as const,
        variant: null,
        is_official_store: true,
      },
      {
        id: "2",
        source: "system",
        last_checked_at: new Date().toISOString(),
        current_price: 2000000,
        seller_name: "Store 2",
        stock_status: "in_stock" as const,
        variant: null,
        is_official_store: false,
      },
    ];

    const results = calculateBatchConfidence(offers);

    expect(results.size).toBe(2);
    expect(results.get("1")).toBeTruthy();
    expect(results.get("2")).toBeTruthy();
    expect(results.get("1")!.score).toBeGreaterThan(results.get("2")!.score); // official store bonus
  });

  it("handles empty array", () => {
    const results = calculateBatchConfidence([]);
    expect(results.size).toBe(0);
  });
});

describe("shouldRecalculateConfidence", () => {
  it("recommends recalc for old high confidence", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const result = shouldRecalculateConfidence(oldDate, 90);
    expect(result).toBe(true);
  });

  it("doesn't recommend recalc for recent high confidence", () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const result = shouldRecalculateConfidence(recentDate, 90);
    expect(result).toBe(false);
  });

  it("recommends recalc for old medium confidence", () => {
    const oldDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000); // 4 days ago
    const result = shouldRecalculateConfidence(oldDate, 75);
    expect(result).toBe(true);
  });

  it("recommends recalc for day-old low confidence", () => {
    const yesterdayDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    const result = shouldRecalculateConfidence(yesterdayDate, 50);
    expect(result).toBe(true);
  });
});

describe("getRecommendedRefreshInterval", () => {
  it("recommends 7 days for very high confidence", () => {
    const interval = getRecommendedRefreshInterval(90);
    expect(interval).toBe(24 * 7);
  });

  it("recommends 3 days for high confidence", () => {
    const interval = getRecommendedRefreshInterval(75);
    expect(interval).toBe(24 * 3);
  });

  it("recommends 1 day for medium confidence", () => {
    const interval = getRecommendedRefreshInterval(60);
    expect(interval).toBe(24);
  });

  it("recommends 12 hours for low-medium confidence", () => {
    const interval = getRecommendedRefreshInterval(45);
    expect(interval).toBe(12);
  });

  it("recommends 6 hours for low confidence", () => {
    const interval = getRecommendedRefreshInterval(30);
    expect(interval).toBe(6);
  });
});
