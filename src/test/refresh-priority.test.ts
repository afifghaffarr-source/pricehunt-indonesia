/**
 * Unit tests: src/lib/refresh-priority.ts
 *
 * Tests the refresh priority calculator used by Phase 5 crawl system.
 * Determines which products/offers to refresh first based on staleness,
 * engagement, volatility, business priority, and user requests.
 */
import { describe, it, expect } from "vitest";
import {
  calculateRefreshPriority,
  calculateNextCrawlTime,
  getCrawlFrequencyLabel,
} from "@/lib/refresh-priority";

describe("calculateRefreshPriority", () => {
  describe("data staleness scoring (0-30 points)", () => {
    it("gives 0 points for very fresh data (<12h)", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 1,
        wishlistCount: 0,
        activeAlertCount: 0,
        viewsLast7Days: 0,
        priceChangesLast30Days: 0,
        priceVolatility: 0,
        isPopularMarketplace: false,
        hasActivePromotion: false,
        hasOpenRecheckRequest: false,
      });
      // No staleness points, no other points
      expect(r.score).toBe(0);
    });

    it("gives 5 points for data 12-24h old", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 18,
        wishlistCount: 0,
        activeAlertCount: 0,
        viewsLast7Days: 0,
        priceChangesLast30Days: 0,
        priceVolatility: 0,
        isPopularMarketplace: false,
        hasActivePromotion: false,
        hasOpenRecheckRequest: false,
      });
      expect(r.score).toBe(5);
      expect(r.reason).toMatch(/fresh/i);
    });

    it("gives 30 points for very stale data (>72h)", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 96,
        wishlistCount: 0,
        activeAlertCount: 0,
        viewsLast7Days: 0,
        priceChangesLast30Days: 0,
        priceVolatility: 0,
        isPopularMarketplace: false,
        hasActivePromotion: false,
        hasOpenRecheckRequest: false,
      });
      expect(r.score).toBe(30);
      expect(r.reason).toMatch(/lama/i);
    });
  });

  describe("engagement scoring", () => {
    it("engagement >100 gives 25 points", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 1,
        // 30 wishlist * 3 + 5 alerts * 5 + 100 views * 0.1 = 90 + 25 + 10 = 125
        wishlistCount: 30,
        activeAlertCount: 5,
        viewsLast7Days: 100,
        priceChangesLast30Days: 0,
        priceVolatility: 0,
        isPopularMarketplace: false,
        hasActivePromotion: false,
        hasOpenRecheckRequest: false,
      });
      expect(r.score).toBe(25);
      expect(r.reason).toMatch(/engagement sangat tinggi/i);
    });
  });

  describe("price volatility scoring", () => {
    it("many price changes (>10) gives 20 points", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 1,
        wishlistCount: 0,
        activeAlertCount: 0,
        viewsLast7Days: 0,
        priceChangesLast30Days: 15,
        priceVolatility: 0,
        isPopularMarketplace: false,
        hasActivePromotion: false,
        hasOpenRecheckRequest: false,
      });
      expect(r.score).toBe(20);
      expect(r.reason).toMatch(/sering berubah/i);
    });
  });

  describe("user recheck request boost", () => {
    it("high-priority recheck adds 30 points (significant boost)", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 1,
        wishlistCount: 0,
        activeAlertCount: 0,
        viewsLast7Days: 0,
        priceChangesLast30Days: 0,
        priceVolatility: 0,
        isPopularMarketplace: false,
        hasActivePromotion: false,
        hasOpenRecheckRequest: true,
        recheckRequestPriority: "high",
      });
      expect(r.score).toBe(30);
      expect(r.reason).toMatch(/high/i);
    });

    it("normal recheck adds 20 points", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 1,
        wishlistCount: 0,
        activeAlertCount: 0,
        viewsLast7Days: 0,
        priceChangesLast30Days: 0,
        priceVolatility: 0,
        isPopularMarketplace: false,
        hasActivePromotion: false,
        hasOpenRecheckRequest: true,
        recheckRequestPriority: "normal",
      });
      expect(r.score).toBe(20);
    });
  });

  describe("score capping", () => {
    it("caps total score at 100 even with max factors", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 96, // +30
        wishlistCount: 100, // +25
        activeAlertCount: 100, // contributes via engagement total
        viewsLast7Days: 10000, // +25
        priceChangesLast30Days: 50, // +20
        priceVolatility: 1, // +10
        isPopularMarketplace: true, // +8
        hasActivePromotion: true, // +7
        hasOpenRecheckRequest: true, // +30
        recheckRequestPriority: "high",
      });
      expect(r.score).toBe(100);
    });
  });

  describe("suggested frequency based on score", () => {
    it("score >= 80 suggests 1 hour refresh", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 96,
        wishlistCount: 50,
        activeAlertCount: 20,
        viewsLast7Days: 500,
        priceChangesLast30Days: 15,
        priceVolatility: 0.5,
        isPopularMarketplace: true,
        hasActivePromotion: true,
        hasOpenRecheckRequest: true,
        recheckRequestPriority: "high",
      });
      expect(r.suggestedFrequency).toBe(1);
    });

    it("score < 20 suggests 48 hours refresh", () => {
      const r = calculateRefreshPriority({
        hoursSinceLastCheck: 1,
        wishlistCount: 0,
        activeAlertCount: 0,
        viewsLast7Days: 0,
        priceChangesLast30Days: 0,
        priceVolatility: 0,
        isPopularMarketplace: false,
        hasActivePromotion: false,
        hasOpenRecheckRequest: false,
      });
      expect(r.suggestedFrequency).toBe(48);
    });
  });
});

describe("calculateNextCrawlTime", () => {
  // Use a future-relative lastCrawledAt (1s in the future) so the
  // function's internal `now = new Date()` is always earlier than
  // `lastCrawledAt + interval`. This keeps results deterministic
  // regardless of when the test body runs relative to describe.
  const last = new Date(Date.now() + 1000);

  it("returns lastCrawledAt + 1h for very high priority (>=80)", () => {
    const next = calculateNextCrawlTime(last, 80);
    expect(next.getTime()).toBe(last.getTime() + 60 * 60 * 1000);
  });

  it("uses 6-hour interval for priority 60-79", () => {
    const next = calculateNextCrawlTime(last, 65);
    expect(next.getTime()).toBe(last.getTime() + 6 * 60 * 60 * 1000);
  });

  it("uses 12-hour interval for priority 40-59", () => {
    const next = calculateNextCrawlTime(last, 45);
    expect(next.getTime()).toBe(last.getTime() + 12 * 60 * 60 * 1000);
  });

  it("uses 24-hour interval for priority 20-39", () => {
    const next = calculateNextCrawlTime(last, 25);
    expect(next.getTime()).toBe(last.getTime() + 24 * 60 * 60 * 1000);
  });

  it("uses 48-hour interval for priority <20", () => {
    const next = calculateNextCrawlTime(last, 10);
    expect(next.getTime()).toBe(last.getTime() + 48 * 60 * 60 * 1000);
  });

  it("returns now() when lastCrawledAt + interval is already past", () => {
    const longAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const next = calculateNextCrawlTime(longAgo, 80); // 1h interval — way past
    // Should return roughly now (within 1s tolerance for execution delay)
    expect(Math.abs(next.getTime() - Date.now())).toBeLessThan(1000);
  });
});

describe("getCrawlFrequencyLabel", () => {
  it("returns 'Setiap jam' for <=1 hour", () => {
    expect(getCrawlFrequencyLabel(1)).toBe("Setiap jam");
    expect(getCrawlFrequencyLabel(0.5)).toBe("Setiap jam");
  });

  it("returns 'Setiap 6 jam' for 2-6 hours", () => {
    expect(getCrawlFrequencyLabel(6)).toBe("Setiap 6 jam");
    expect(getCrawlFrequencyLabel(3)).toBe("Setiap 6 jam");
  });

  it("returns 'Setiap 12 jam' for 7-12 hours", () => {
    expect(getCrawlFrequencyLabel(12)).toBe("Setiap 12 jam");
    expect(getCrawlFrequencyLabel(8)).toBe("Setiap 12 jam");
  });

  it("returns 'Setiap hari' for 13-24 hours", () => {
    expect(getCrawlFrequencyLabel(24)).toBe("Setiap hari");
    expect(getCrawlFrequencyLabel(18)).toBe("Setiap hari");
  });

  it("returns 'Setiap 2 hari' for >24 hours", () => {
    expect(getCrawlFrequencyLabel(48)).toBe("Setiap 2 hari");
    expect(getCrawlFrequencyLabel(72)).toBe("Setiap 2 hari");
  });
});
