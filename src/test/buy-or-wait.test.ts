/**
 * Unit tests: src/lib/buy-or-wait.ts
 *
 * Tests edge cases not covered by business-logic.test.ts.
 * Focus on: formatRupiah, recommendation boundaries, target price logic.
 */
import { describe, it, expect } from "vitest";
import {
  generateBuyOrWaitRecommendation,
  formatRupiah,
  type BuyOrWaitInput,
} from "@/lib/buy-or-wait";

describe("formatRupiah", () => {
  // Normalize NBSP (\u00A0) used by id-ID locale to regular space for stable assertions
  const norm = (s: string) => s.replace(/\u00A0/g, " ");

  it("formats whole numbers with dot thousands", () => {
    expect(norm(formatRupiah(1500000))).toBe("Rp 1.500.000");
  });

  it("formats small numbers", () => {
    expect(norm(formatRupiah(500))).toBe("Rp 500");
  });

  it("formats zero", () => {
    expect(norm(formatRupiah(0))).toBe("Rp 0");
  });

  it("formats millions with proper dot separators", () => {
    expect(norm(formatRupiah(25000000))).toBe("Rp 25.000.000");
  });

  it("formats billions (12-digit numbers)", () => {
    expect(norm(formatRupiah(1500000000))).toBe("Rp 1.500.000.000");
  });

  it("output contains 'Rp' prefix and Indonesian dot thousands separator", () => {
    const out = norm(formatRupiah(1234567));
    expect(out).toMatch(/^Rp 1\.234\.567$/);
  });
});

describe("generateBuyOrWaitRecommendation", () => {
  describe("happy path: clear BUY_NOW", () => {
    it("recommends buy_now with high confidence for excellent deal", () => {
      const input: BuyOrWaitInput = {
        currentPrice: 800000,
        lowestHistoricalPrice: 850000,
        median90Day: 1200000, // 33% below median
        isOfficialStore: true,
        stockStatus: "in_stock",
        sellerRating: 4.8,
        sellerReviewCount: 5000,
      };
      const result = generateBuyOrWaitRecommendation(input);
      expect(result.recommendation).toBe("buy_now");
      expect(result.confidence).toBe("high");
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe("happy path: clear WAIT for upcoming campaign", () => {
    it("suggests target price below current when sale is upcoming", () => {
      const input: BuyOrWaitInput = {
        currentPrice: 5000000,
        lowestHistoricalPrice: 3500000,
        median90Day: 4000000, // current is 25% above median
        daysUntilNextCampaign: 5,
        campaignName: "7.7",
        stockStatus: "in_stock",
      };
      const result = generateBuyOrWaitRecommendation(input);
      // Should not recommend buy_now for overpriced product with upcoming sale
      expect(result.recommendation).not.toBe("buy_now");
      // If a target price is suggested, it should be below current
      if (result.targetPrice) {
        expect(result.targetPrice.amount).toBeLessThan(input.currentPrice);
      }
    });
  });

  describe("fake discount detection", () => {
    it("flags fake discount when original price recently inflated", () => {
      const input: BuyOrWaitInput = {
        currentPrice: 1000000,
        originalPrice: 2000000, // 50% off
        lowestHistoricalPrice: 900000, // but historical price was 900k
        median90Day: 950000,
        stockStatus: "in_stock",
      };
      const result = generateBuyOrWaitRecommendation(input);
      // Should detect that "discount" is fake
      expect(result.recommendation).not.toBe("buy_now");
    });
  });

  describe("stock status impact", () => {
    it("does not recommend buy_now when out of stock", () => {
      const input: BuyOrWaitInput = {
        currentPrice: 800000,
        lowestHistoricalPrice: 850000,
        median90Day: 1200000,
        stockStatus: "out_of_stock",
      };
      const result = generateBuyOrWaitRecommendation(input);
      // Even with great price, can't buy if out of stock
      expect(result.recommendation).not.toBe("buy_now");
    });
  });

  describe("reasons array", () => {
    it("returns 1-5 reasons in Indonesian", () => {
      const input: BuyOrWaitInput = {
        currentPrice: 800000,
        lowestHistoricalPrice: 850000,
        median90Day: 1200000,
        isOfficialStore: true,
        stockStatus: "in_stock",
      };
      const result = generateBuyOrWaitRecommendation(input);
      expect(result.reasons.length).toBeGreaterThanOrEqual(1);
      expect(result.reasons.length).toBeLessThanOrEqual(5);
      // Reasons should be in Indonesian (contain common Indonesian words)
      const hasIndonesianWord = result.reasons.some(
        (r) => /harga|diskon|stock|gratis|resmi|kualitas/i.test(r)
      );
      expect(hasIndonesianWord).toBe(true);
    });
  });

  describe("confidence levels", () => {
    it("returns high confidence with multiple strong signals", () => {
      const input: BuyOrWaitInput = {
        currentPrice: 500000,
        lowestHistoricalPrice: 500000, // at historical low
        median90Day: 800000, // 37.5% below median
        isOfficialStore: true,
        sellerRating: 4.9,
        sellerReviewCount: 10000,
        stockStatus: "in_stock",
        hasVoucher: true,
        hasFreeShipping: true,
      };
      const result = generateBuyOrWaitRecommendation(input);
      expect(result.confidence).toBe("high");
    });
  });

  describe("edge case: minimum input", () => {
    it("works with only currentPrice (no other context)", () => {
      const input: BuyOrWaitInput = {
        currentPrice: 1000000,
      };
      const result = generateBuyOrWaitRecommendation(input);
      expect(result.recommendation).toBeDefined();
      expect(result.dealScore).toBeDefined();
      // Should return a valid recommendation (could be any of the 4)
      expect(["buy_now", "watch", "wait", "avoid"]).toContain(result.recommendation);
    });
  });
});
