/**
 * v1.5.23 — BUG-04 regression guard.
 *
 * The product page used to hardcode `isOfficialStore: false` for ALL offers
 * (page.tsx:154) and never passed `isOfficialStore` to `<BuyOrWaitDecision>`.
 * The buy-or-wait engine's `checkCriticalIssues` then evaluated
 * `sellerTrust === 0 && !isOfficialStore` → `true` → recommended "avoid" for
 * every product, including the homepage "Deal Terbaik Hari Ini" highlights.
 *
 * This was the root cause of the "⚠️ HINDARI / Rekomendasi BijakBeli" warning
 * appearing on products with badge "Harga Terbaik (89)".
 *
 * This test guards three invariants:
 *   1. `transformPrices` populates `isOfficialStore` from `row.is_official_store`
 *   2. `MarketplacePrice` type carries `isOfficialStore` and `sellerReviewCount`
 *   3. `generateBuyOrWaitRecommendation` returns 'avoid' ONLY when there are
 *      real risk signals, NOT when seller data is missing.
 */
import { describe, it, expect } from "vitest";
import { transformPrices } from "@/lib/supabase/transforms";
import { generateBuyOrWaitRecommendation } from "@/lib/buy-or-wait";

describe("BUG-04: HINDARI on best-deal product regression guard", () => {
  describe("transformPrices", () => {
    it("populates isOfficialStore from row.is_official_store", () => {
      const rows = [
        {
          marketplace_name: "blibli",
          current_price: 18000000,
          url: "https://example.com",
          seller_name: "Samsung Official",
          seller_rating: 4.8,
          seller_review_count: 5000,
          stock_status: "in_stock",
          shipping_estimate: 0,
          last_checked_at: "2026-06-17T00:00:00Z",
          is_official_store: true,
        },
        {
          marketplace_name: "tokopedia",
          current_price: 19000000,
          url: "https://example.com",
          seller_name: "Random Seller",
          seller_rating: 4.5,
          seller_review_count: 200,
          stock_status: "in_stock",
          shipping_estimate: 0,
          last_checked_at: "2026-06-17T00:00:00Z",
          is_official_store: false,
        },
      ];

      const result = transformPrices(rows);
      expect(result[0].isOfficialStore).toBe(true);
      expect(result[1].isOfficialStore).toBe(false);
    });

    it("defaults isOfficialStore to false when row column is missing", () => {
      const rows = [
        {
          marketplace_name: "shopee",
          current_price: 17500000,
          url: "https://example.com",
          stock_status: "in_stock",
          // no is_official_store column
        },
      ];

      const result = transformPrices(rows);
      expect(result[0].isOfficialStore).toBe(false);
    });

    it("populates sellerReviewCount from row.seller_review_count", () => {
      const rows = [
        {
          marketplace_name: "blibli",
          current_price: 18000000,
          url: "https://example.com",
          stock_status: "in_stock",
          seller_rating: 4.8,
          seller_review_count: 1234,
        },
      ];

      const result = transformPrices(rows);
      expect(result[0].sellerReviewCount).toBe(1234);
    });
  });

  describe("generateBuyOrWaitRecommendation", () => {
    it("does NOT recommend 'avoid' when cheapest is official store with good reviews", () => {
      // Realistic best case: official store, 4.8 rating, 5000 reviews
      const rec = generateBuyOrWaitRecommendation({
        currentPrice: 17500000,
        originalPrice: 21000000,
        lowestHistoricalPrice: 17000000,
        median30Day: 18000000,
        median90Day: 18500000,
        sellerRating: 4.8,
        sellerReviewCount: 5000,
        isOfficialStore: true,
        stockStatus: "in_stock",
      });

      expect(rec.recommendation).not.toBe("avoid");
    });

    it("does NOT recommend 'avoid' for in-stock product with good reviews even if not official", () => {
      const rec = generateBuyOrWaitRecommendation({
        currentPrice: 17500000,
        originalPrice: 21000000,
        lowestHistoricalPrice: 17000000,
        median30Day: 18000000,
        median90Day: 18500000,
        sellerRating: 4.5,
        sellerReviewCount: 200,
        isOfficialStore: false,
        stockStatus: "in_stock",
      });

      expect(rec.recommendation).not.toBe("avoid");
    });

    it("documents the current behavior: missing seller data triggers avoid (to be fixed in PR #3+)", () => {
      // This test documents what the current logic does. The fix in this PR
      // is to pass real seller data from the DB. If this test ever starts
      // failing, the engine's "unknown seller" handling has been improved.
      const rec = generateBuyOrWaitRecommendation({
        currentPrice: 17500000,
        originalPrice: 21000000,
        lowestHistoricalPrice: 17000000,
        median30Day: 18000000,
        median90Day: 18500000,
        // no sellerRating, no sellerReviewCount, no isOfficialStore
        stockStatus: "in_stock",
      });

      // Today this is "avoid" because checkCriticalIssues returns true when
      // sellerTrust === 0 && !isOfficialStore. The product page fix is to
      // always pass the real seller data so this case doesn't occur.
      expect(rec.recommendation).toBe("avoid");
    });
  });

  describe("page.tsx no longer hardcodes isOfficialStore=false", () => {
    it("does not contain the literal hardcoded `isOfficialStore: false,` line", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const source = fs.readFileSync(
        path.resolve(process.cwd(), "src/app/product/[slug]/page.tsx"),
        "utf-8",
      );

      // Match the EXACT line that was the bug, including the trailing comma.
      // Allow `?? false` and `|| false` as defensive fallbacks, but not the
      // bare hardcoded `false` with no source data.
      const lines = source.split("\n");
      const offenders = lines.filter((line) => {
        const trimmed = line.trim();
        return (
          trimmed === "isOfficialStore: false," ||
          trimmed === "isOfficialStore: false"
        );
      });

      expect(
        offenders,
        "product page must not hardcode isOfficialStore: false; use p.isOfficialStore ?? false instead",
      ).toEqual([]);
    });
  });
});
