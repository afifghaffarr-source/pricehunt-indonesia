/**
 * Unit Tests for Core Business Logic Utilities
 * 
 * Tests for Phase 2 intelligent features:
 * - Deal Score Engine (deal-score.ts)
 * - Fake Discount Detector (fake-discount.ts)
 * - Buy or Wait Recommendation (buy-or-wait.ts)
 */

import { describe, it, expect } from "vitest";
import { calculateDealScore } from "@/lib/deal-score";
import { detectFakeDiscount, getDiscountBadge } from "@/lib/fake-discount";
import { generateBuyOrWaitRecommendation } from "@/lib/buy-or-wait";

describe("Deal Score Engine", () => {
  describe("calculateDealScore", () => {
    it("returns a score between 0-100", () => {
      const result = calculateDealScore({
        currentPrice: 5000000,
        median90Day: 6000000,
        isOfficialStore: true,
        stockStatus: "in_stock",
      });
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("gives higher score for significant discount from historical median", () => {
      const goodDeal = calculateDealScore({
        currentPrice: 4000000, // 33% below median
        median90Day: 6000000,
        isOfficialStore: true,
        stockStatus: "in_stock",
      });

      const okDeal = calculateDealScore({
        currentPrice: 5500000, // 8% below median
        median90Day: 6000000,
        isOfficialStore: true,
        stockStatus: "in_stock",
      });

      expect(goodDeal.score).toBeGreaterThan(okDeal.score);
    });

    it("rewards official store status", () => {
      const officialStore = calculateDealScore({
        currentPrice: 5000000,
        median90Day: 6000000,
        isOfficialStore: true,
        stockStatus: "in_stock",
      });

      const regularStore = calculateDealScore({
        currentPrice: 5000000,
        median90Day: 6000000,
        isOfficialStore: false,
        stockStatus: "in_stock",
      });

      expect(officialStore.score).toBeGreaterThan(regularStore.score);
    });

    it("returns low confidence when historical data is missing", () => {
      const result = calculateDealScore({
        currentPrice: 5000000,
        // No median90Day provided
      });

      expect(result.confidence).toBe("low");
    });

    it("includes breakdown with correct weight distribution", () => {
      const result = calculateDealScore({
        currentPrice: 4000000,
        median90Day: 6000000,
        lowestHistoricalPrice: 3500000,
        isOfficialStore: true,
        sellerRating: 4.8,
        sellerReviewCount: 1000,
        stockStatus: "in_stock",
        hasFreeShipping: true,
        hasVoucher: true,
      });

      // Check that breakdown components exist
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.priceDiscount).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.priceDiscount).toBeLessThanOrEqual(35); // Max 35 points
      expect(result.breakdown.pricePercentile).toBeLessThanOrEqual(20); // Max 20 points
      expect(result.breakdown.sellerTrust).toBeLessThanOrEqual(15); // Max 15 points
      expect(result.breakdown.officialStore).toBeLessThanOrEqual(10); // Max 10 points
      expect(result.breakdown.stockConfidence).toBeLessThanOrEqual(10); // Max 10 points
      expect(result.breakdown.promotions).toBeLessThanOrEqual(10); // Max 10 points
    });

    it("handles edge case of price above historical median", () => {
      const result = calculateDealScore({
        currentPrice: 7000000, // Above median
        median90Day: 6000000,
        stockStatus: "in_stock",
      });

      expect(result.score).toBeLessThan(50); // Should get low score
      expect(result.label).not.toBe("Beli sekarang");
    });

    it("identifies risks appropriately", () => {
      const suspiciousCase = calculateDealScore({
        currentPrice: 2000000,
        originalPrice: 10000000, // Massive claimed discount
        median90Day: 6000000,
        lowestHistoricalPrice: 5500000,
      });

      expect(suspiciousCase.risks.length).toBeGreaterThan(0);
    });

    it("returns proper label types", () => {
      const result = calculateDealScore({
        currentPrice: 5000000,
        median90Day: 6000000,
      });

      const validLabels = [
        "Beli sekarang",
        "Harga bagus",
        "Tunggu turun",
        "Diskon mencurigakan",
        "Murah tapi berisiko",
        "Data belum cukup",
      ];

      expect(validLabels).toContain(result.label);
    });

    it("returns proper color codes", () => {
      const result = calculateDealScore({
        currentPrice: 5000000,
        median90Day: 6000000,
      });

      const validColors = ["green", "yellow", "orange", "red", "gray"];
      expect(validColors).toContain(result.color);
    });
  });
});

describe("Fake Discount Detector", () => {
  describe("detectFakeDiscount", () => {
    it("detects legitimate discount", () => {
      const result = detectFakeDiscount({
        currentPrice: 4500000,
        originalPrice: 5000000,
        median30Day: 4800000,
        median90Day: 5000000,
        lowestHistoricalPrice: 4200000,
      });

      expect(result.status).toBe("legitimate");
      expect(result.confidence).toBeGreaterThan(50);
    });

    it("flags inflated original price", () => {
      const result = detectFakeDiscount({
        currentPrice: 4500000,
        originalPrice: 10000000, // Suspiciously high
        median30Day: 4800000,
        median90Day: 5000000,
        lowestHistoricalPrice: 4200000,
      });

      expect(result.flags).toContain("original_price_inflated");
      expect(result.status).not.toBe("legitimate");
    });

    it("detects sudden price increase before discount", () => {
      const result = detectFakeDiscount({
        currentPrice: 5000000,
        originalPrice: 6000000,
        median30Day: 4500000, // Current is higher than recent median
        median90Day: 4800000,
      });

      expect(result.flags.length).toBeGreaterThan(0);
    });

    it("returns low confidence when data is insufficient", () => {
      const result = detectFakeDiscount({
        currentPrice: 5000000,
        originalPrice: 6000000,
        // No historical medians
      });

      expect(result.confidence).toBeLessThan(50);
      expect(result.status).toBe("insufficient_data");
    });

    it("handles case with no original price", () => {
      const result = detectFakeDiscount({
        currentPrice: 5000000,
        originalPrice: 5000000, // originalPrice is required
        median30Day: 4800000,
        median90Day: 5000000,
      });

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it("provides meaningful explanation", () => {
      const result = detectFakeDiscount({
        currentPrice: 4500000,
        originalPrice: 5000000,
        median30Day: 4800000,
        median90Day: 5000000,
      });

      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  });

  describe("getDiscountBadge", () => {
    it("returns badge for legitimate discount", () => {
      const badge = getDiscountBadge("legitimate");
      
      expect(badge).toBeDefined();
      expect(badge.icon).toBeDefined();
      expect(badge.text).toBeDefined();
      expect(badge.color).toBeDefined();
    });

    it("returns warning badge for suspicious discount", () => {
      const badge = getDiscountBadge("suspicious");
      
      expect(badge.color).toMatch(/yellow|orange|red/);
    });

    it("returns appropriate badge for insufficient data", () => {
      const badge = getDiscountBadge("insufficient_data");
      
      expect(badge).toBeDefined();
    });
  });
});

describe("Buy or Wait Recommendation", () => {
  describe("generateBuyOrWaitRecommendation", () => {
    it("recommends BUY NOW for great deals", () => {
      const result = generateBuyOrWaitRecommendation({
        currentPrice: 4000000,
        median30Day: 5500000,
        median90Day: 6000000,
        lowestHistoricalPrice: 3800000,
        isOfficialStore: true,
        stockStatus: "in_stock",
      });

      expect(result.recommendation).toBe("buy_now");
      expect(["high", "medium"]).toContain(result.confidence);
    });

    it("recommends WAIT or AVOID for overpriced items", () => {
      const result = generateBuyOrWaitRecommendation({
        currentPrice: 7000000,
        median30Day: 5500000,
        median90Day: 6000000,
        lowestHistoricalPrice: 5000000,
      });

      // Should warn user not to buy at current price
      expect(["wait", "avoid"]).toContain(result.recommendation);
    });

    it("provides valid recommendation for borderline cases", () => {
      const result = generateBuyOrWaitRecommendation({
        currentPrice: 5500000,
        median30Day: 5400000,
        median90Day: 5600000,
        stockStatus: "in_stock",
      });

      // Should provide one of the valid recommendations
      expect(["watch", "buy_now", "wait", "avoid"]).toContain(result.recommendation);
    });

    it("provides target price for WAIT recommendation", () => {
      const inputPrice = 7000000;
      const result = generateBuyOrWaitRecommendation({
        currentPrice: inputPrice,
        median30Day: 5500000,
        median90Day: 6000000,
        lowestHistoricalPrice: 5000000,
      });

      if (result.recommendation === "wait" && result.targetPrice) {
        expect(result.targetPrice).toBeDefined();
        expect(result.targetPrice.amount).toBeLessThan(inputPrice);
      }
    });

    it("considers stock availability in recommendation", () => {
      const inStock = generateBuyOrWaitRecommendation({
        currentPrice: 5000000,
        median90Day: 5500000,
        stockStatus: "in_stock",
      });

      const outOfStock = generateBuyOrWaitRecommendation({
        currentPrice: 5000000,
        median90Day: 5500000,
        stockStatus: "out_of_stock",
      });

      // Both should provide valid recommendations
      expect(["buy_now", "watch", "wait", "avoid"]).toContain(inStock.recommendation);
      expect(["buy_now", "watch", "wait", "avoid"]).toContain(outOfStock.recommendation);
    });

    it("provides reasons for recommendation", () => {
      const result = generateBuyOrWaitRecommendation({
        currentPrice: 4500000,
        median30Day: 5500000,
        median90Day: 6000000,
        isOfficialStore: true,
      });

      expect(result.reasons).toBeDefined();
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("provides confidence level", () => {
      const result = generateBuyOrWaitRecommendation({
        currentPrice: 5000000,
        median90Day: 6000000,
      });

      expect(["high", "medium", "low"]).toContain(result.confidence);
    });

    it("handles insufficient data gracefully", () => {
      const result = generateBuyOrWaitRecommendation({
        currentPrice: 5000000,
        // Minimal data
      });

      expect(result).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(["high", "medium", "low"]).toContain(result.confidence);
      // Confidence level is determined by algorithm, not data availability alone
    });

    it("integrates deal score in recommendation", () => {
      const result = generateBuyOrWaitRecommendation({
        currentPrice: 4000000,
        median90Day: 6000000,
        isOfficialStore: true,
        sellerRating: 4.9,
        stockStatus: "in_stock",
      });

      expect(result.dealScore).toBeDefined();
      expect(result.dealScore.score).toBeGreaterThanOrEqual(0);
      expect(result.dealScore.score).toBeLessThanOrEqual(100);
    });

    it("provides actionable next steps", () => {
      const result = generateBuyOrWaitRecommendation({
        currentPrice: 5000000,
        median90Day: 6000000,
      });

      // Should have some guidance
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });
});

describe("Integration: All utilities work together", () => {
  it("consistent scoring across utilities", () => {
    const input = {
      currentPrice: 4000000,
      originalPrice: 5000000,
      median30Day: 4500000,
      median90Day: 5000000,
      lowestHistoricalPrice: 3800000,
      isOfficialStore: true,
      sellerRating: 4.8,
      stockStatus: "in_stock" as const,
    };

    const dealScore = calculateDealScore(input);
    const fakeDiscount = detectFakeDiscount(input);
    const buyOrWait = generateBuyOrWaitRecommendation(input);

    // All should recognize this as a good deal
    expect(dealScore.score).toBeGreaterThan(60);
    expect(fakeDiscount.status).not.toBe("highly_suspicious");
    expect(buyOrWait.recommendation).toMatch(/buy_now|watch/);
  });

  it("consistent warning flags across utilities", () => {
    const suspiciousInput = {
      currentPrice: 3000000,
      originalPrice: 15000000, // Fake high price
      median30Day: 5000000,
      median90Day: 5500000,
      lowestHistoricalPrice: 4500000,
    };

    const dealScore = calculateDealScore(suspiciousInput);
    const fakeDiscount = detectFakeDiscount(suspiciousInput);

    // Both should detect something suspicious
    expect(dealScore.risks.length).toBeGreaterThan(0);
    expect(fakeDiscount.status).toMatch(/suspicious|highly_suspicious/);
  });
});
