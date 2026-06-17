/**
 * Unit tests: src/lib/offer-mapping.ts
 *
 * Extracted from src/app/product/[slug]/page.tsx during Phase C refactor.
 * Pure function — tests the "best offer match" + enum mapping logic.
 */
import { describe, it, expect } from "vitest";
import { enrichPricesWithOffers, type OfferRow } from "@/lib/offer-mapping";
import type { MarketplacePrice } from "@/lib/types";

const basePrice = (overrides: Partial<MarketplacePrice> = {}): MarketplacePrice => ({
  marketplace: "tokopedia",
  price: 1000000,
  url: "https://tokopedia.com/product/123",
  seller: "Test Seller",
  sellerRating: 4.5,
  inStock: true,
  shippingCost: 10000,
  lastUpdated: "2026-06-10T10:00:00Z",
  ...overrides,
});

const baseOffer = (overrides: Partial<OfferRow> = {}): OfferRow => ({
  id: "offer-1",
  marketplace: "tokopedia",
  confidence_score: 80,
  confidence_label: "dipercaya",
  validation_status: "valid",
  last_checked_at: "2026-06-10T10:00:00Z",
  source: "browser_collector",
  ...overrides,
});

describe("enrichPricesWithOffers", () => {
  describe("no offer match", () => {
    it("returns prices with all enrichment fields undefined when no offer matches", () => {
      const prices = [basePrice({ marketplace: "tokopedia" })];
      const offers: OfferRow[] = [];
      const result = enrichPricesWithOffers(prices, offers);

      expect(result).toHaveLength(1);
      expect(result[0].offer_id).toBeUndefined();
      expect(result[0].confidence_score).toBeUndefined();
      expect(result[0].validation_status).toBeUndefined();
      expect(result[0].source).toBeUndefined();
      // Original fields preserved
      expect(result[0].marketplace).toBe("tokopedia");
      expect(result[0].price).toBe(1000000);
      expect(result[0].shippingCost).toBe(10000);
    });

    it("returns empty array for empty prices", () => {
      expect(enrichPricesWithOffers([], [])).toEqual([]);
    });
  });

  describe("offer match by marketplace", () => {
    it("matches offer to price by marketplace", () => {
      const result = enrichPricesWithOffers(
        [basePrice({ marketplace: "tokopedia" })],
        [baseOffer({ id: "tok-offer", marketplace: "tokopedia" })]
      );
      expect(result[0].offer_id).toBe("tok-offer");
    });

    it("does NOT match offer to price when marketplace differs", () => {
      const result = enrichPricesWithOffers(
        [basePrice({ marketplace: "tokopedia" })],
        [baseOffer({ id: "shopee-offer", marketplace: "shopee" })]
      );
      expect(result[0].offer_id).toBeUndefined();
    });

    it("preserves original price fields when enriching", () => {
      const result = enrichPricesWithOffers(
        [basePrice({ marketplace: "tokopedia", price: 500000 })],
        [baseOffer({ marketplace: "tokopedia" })]
      );
      expect(result[0].price).toBe(500000);
      expect(result[0].shippingCost).toBe(10000);
      expect(result[0].offer_id).toBe("offer-1");
    });
  });

  describe("best offer selection", () => {
    it("picks the offer with highest confidence_score", () => {
      const result = enrichPricesWithOffers(
        [basePrice({ marketplace: "tokopedia" })],
        [
          baseOffer({ id: "low", confidence_score: 30 }),
          baseOffer({ id: "high", confidence_score: 90 }),
          baseOffer({ id: "mid", confidence_score: 60 }),
        ]
      );
      expect(result[0].offer_id).toBe("high");
    });

    it("breaks confidence tie with most recent last_checked_at", () => {
      const result = enrichPricesWithOffers(
        [basePrice({ marketplace: "tokopedia" })],
        [
          baseOffer({ id: "old", confidence_score: 80, last_checked_at: "2026-06-01T10:00:00Z" }),
          baseOffer({ id: "new", confidence_score: 80, last_checked_at: "2026-06-15T10:00:00Z" }),
        ]
      );
      expect(result[0].offer_id).toBe("new");
    });

    it("only considers offers for matching marketplace when picking best", () => {
      const result = enrichPricesWithOffers(
        [basePrice({ marketplace: "tokopedia" })],
        [
          baseOffer({ id: "wrong-mp", marketplace: "shopee", confidence_score: 99 }),
          baseOffer({ id: "right-mp", marketplace: "tokopedia", confidence_score: 50 }),
        ]
      );
      // Should pick "right-mp" (only matching marketplace), not "wrong-mp" (higher score but different mp)
      expect(result[0].offer_id).toBe("right-mp");
    });
  });

  describe("validation_status mapping", () => {
    it.each([
      ["valid", "verified"],
      ["conflict", "flagged"],
      ["parser_error", "rejected"],
      ["stale", "flagged"],
      ["rejected", "rejected"],
      ["pending", "pending"],
    ])("maps DB '%s' to component '%s'", (dbValue, componentValue) => {
      const result = enrichPricesWithOffers(
        [basePrice()],
        [baseOffer({ validation_status: dbValue })]
      );
      expect(result[0].validation_status).toBe(componentValue);
    });

    it("falls back to 'pending' for unknown validation_status", () => {
      const result = enrichPricesWithOffers(
        [basePrice()],
        [baseOffer({ validation_status: "unknown_future_value" })]
      );
      expect(result[0].validation_status).toBe("pending");
    });
  });

  describe("source mapping", () => {
    it.each([
      ["official_api", "api_scraper"],
      ["affiliate_feed", "api_scraper"],
      ["browser_collector", "browser_collector"],
      ["extension_snapshot", "browser_collector"],
      ["targeted_crawler", "browser_collector"],
      ["community_proof", "manual_admin"],
      ["manual_admin", "manual_admin"],
      ["api_scraper", "api_scraper"],
    ])("maps DB source '%s' to component '%s'", (dbValue, componentValue) => {
      const result = enrichPricesWithOffers(
        [basePrice()],
        [baseOffer({ source: dbValue })]
      );
      expect(result[0].source).toBe(componentValue);
    });

    it("falls back to 'api_scraper' for unknown source", () => {
      const result = enrichPricesWithOffers(
        [basePrice()],
        [baseOffer({ source: "future_source" })]
      );
      expect(result[0].source).toBe("api_scraper");
    });
  });

  describe("multiple prices", () => {
    it("enriches each price independently", () => {
      const result = enrichPricesWithOffers(
        [
          basePrice({ marketplace: "tokopedia" }),
          basePrice({ marketplace: "shopee" }),
          basePrice({ marketplace: "lazada" }),
        ],
        [
          baseOffer({ id: "tok", marketplace: "tokopedia" }),
          baseOffer({ id: "shop", marketplace: "shopee" }),
          // no lazada offer
        ]
      );
      expect(result[0].offer_id).toBe("tok");
      expect(result[1].offer_id).toBe("shop");
      expect(result[2].offer_id).toBeUndefined();
    });
  });
});
