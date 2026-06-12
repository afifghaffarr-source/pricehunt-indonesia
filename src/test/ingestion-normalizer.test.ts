/**
 * Unit Tests: Data Normalizer
 * 
 * Comprehensive tests for Indonesian data format normalization
 */

import { describe, it, expect } from "vitest";
import {
  normalizePrice,
  calculateDiscountPercent,
  normalizeMarketplace,
  normalizeStockStatus,
  normalizeCondition,
  normalizeProductTitle,
  normalizeOffer,
  generateOfferHash,
  type RawOfferInput,
} from "@/lib/ingestion/normalizer";

// ============================================================================
// PRICE NORMALIZATION TESTS
// ============================================================================

describe("normalizePrice", () => {
  describe("Indonesian formats", () => {
    it("handles 'Rp 1.299.000' format", () => {
      expect(normalizePrice("Rp 1.299.000")).toBe(1299000);
    });

    it("handles 'Rp1.299.000' format (no space)", () => {
      expect(normalizePrice("Rp1.299.000")).toBe(1299000);
    });

    it("handles '1.299.000' format (no currency)", () => {
      expect(normalizePrice("1.299.000")).toBe(1299000);
    });

    it("handles 'Rp 1,299,000' format (commas)", () => {
      expect(normalizePrice("Rp 1,299,000")).toBe(1299000);
    });

    it("handles '1299000' format (plain number)", () => {
      expect(normalizePrice("1299000")).toBe(1299000);
    });

    it("handles 'IDR 1.299.000' format", () => {
      expect(normalizePrice("IDR 1.299.000")).toBe(1299000);
    });

    it("handles 'Rp. 1.299.000' format (with period)", () => {
      expect(normalizePrice("Rp. 1.299.000")).toBe(1299000);
    });
  });

  describe("number inputs", () => {
    it("handles numeric input", () => {
      expect(normalizePrice(1299000)).toBe(1299000);
    });

    it("handles float and rounds", () => {
      expect(normalizePrice(1299.99)).toBe(1300);
    });

    it("handles negative as zero", () => {
      expect(normalizePrice(-1000)).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("returns 0 for empty string", () => {
      expect(normalizePrice("")).toBe(0);
    });

    it("returns 0 for null", () => {
      expect(normalizePrice(null)).toBe(0);
    });

    it("returns 0 for undefined", () => {
      expect(normalizePrice(undefined)).toBe(0);
    });

    it("returns 0 for non-numeric string", () => {
      expect(normalizePrice("abc")).toBe(0);
    });

    it("extracts first number from mixed string", () => {
      expect(normalizePrice("Harga: Rp 1.299.000 (diskon)")).toBe(1299000);
    });
  });

  describe("real-world examples", () => {
    it("handles Tokopedia format", () => {
      expect(normalizePrice("Rp2.499.000")).toBe(2499000);
    });

    it("handles Shopee format", () => {
      expect(normalizePrice("Rp1.299.000 - Rp1.499.000")).toBe(1299000); // Takes first
    });

    it("handles Lazada format", () => {
      expect(normalizePrice("RP 999.000")).toBe(999000);
    });
  });
});

// ============================================================================
// DISCOUNT CALCULATION TESTS
// ============================================================================

describe("calculateDiscountPercent", () => {
  it("calculates simple discount", () => {
    const result = calculateDiscountPercent(1299000, 1499000);
    expect(result).toBeCloseTo(13.34, 1);
  });

  it("calculates 50% discount", () => {
    const result = calculateDiscountPercent(500000, 1000000);
    expect(result).toBe(50);
  });

  it("returns null if no original price", () => {
    expect(calculateDiscountPercent(1299000, null)).toBeNull();
    expect(calculateDiscountPercent(1299000, undefined)).toBeNull();
  });

  it("returns null if current >= original", () => {
    expect(calculateDiscountPercent(1500000, 1499000)).toBeNull();
    expect(calculateDiscountPercent(1499000, 1499000)).toBeNull();
  });

  it("returns null if prices are zero/negative", () => {
    expect(calculateDiscountPercent(0, 1000000)).toBeNull();
    expect(calculateDiscountPercent(1000000, 0)).toBeNull();
  });

  it("rounds to 2 decimals", () => {
    const result = calculateDiscountPercent(1299999, 1500000);
    expect(result?.toString()).toMatch(/^\d+\.\d{1,2}$/);
  });
});

// ============================================================================
// MARKETPLACE NORMALIZATION TESTS
// ============================================================================

describe("normalizeMarketplace", () => {
  it("normalizes Tokopedia variants", () => {
    expect(normalizeMarketplace("tokopedia")).toBe("tokopedia");
    expect(normalizeMarketplace("Tokopedia")).toBe("tokopedia");
    expect(normalizeMarketplace("tokopedia.com")).toBe("tokopedia");
    expect(normalizeMarketplace("https://tokopedia.com/product")).toBe("tokopedia");
  });

  it("normalizes Shopee variants", () => {
    expect(normalizeMarketplace("shopee")).toBe("shopee");
    expect(normalizeMarketplace("Shopee")).toBe("shopee");
    expect(normalizeMarketplace("shopee.co.id")).toBe("shopee");
  });

  it("normalizes other marketplaces", () => {
    expect(normalizeMarketplace("lazada")).toBe("lazada");
    expect(normalizeMarketplace("blibli")).toBe("blibli");
    expect(normalizeMarketplace("bukalapak")).toBe("bukalapak");
    expect(normalizeMarketplace("jd.id")).toBe("jd.id");
  });

  it("handles unknown marketplace", () => {
    expect(normalizeMarketplace("unknown-store.com")).not.toBe("unknown");
    expect(normalizeMarketplace(null)).toBe("unknown");
    expect(normalizeMarketplace("")).toBe("unknown");
  });
});

// ============================================================================
// STOCK STATUS NORMALIZATION TESTS
// ============================================================================

describe("normalizeStockStatus", () => {
  describe("in_stock patterns", () => {
    it("handles Indonesian 'tersedia'", () => {
      expect(normalizeStockStatus("Tersedia")).toBe("in_stock");
      expect(normalizeStockStatus("tersedia")).toBe("in_stock");
    });

    it("handles 'ready' variants", () => {
      expect(normalizeStockStatus("Ready")).toBe("in_stock");
      expect(normalizeStockStatus("Siap kirim")).toBe("in_stock");
    });

    it("handles English 'in stock'", () => {
      expect(normalizeStockStatus("In Stock")).toBe("in_stock");
      expect(normalizeStockStatus("in stock")).toBe("in_stock");
    });
  });

  describe("low_stock patterns", () => {
    it("handles 'terbatas'", () => {
      expect(normalizeStockStatus("Stok terbatas")).toBe("low_stock");
      expect(normalizeStockStatus("Sisa 3")).toBe("low_stock");
    });

    it("handles 'hampir habis'", () => {
      expect(normalizeStockStatus("Hampir habis")).toBe("low_stock");
    });
  });

  describe("out_of_stock patterns", () => {
    it("handles 'habis'", () => {
      expect(normalizeStockStatus("Habis")).toBe("out_of_stock");
    });

    it("handles 'sold out'", () => {
      expect(normalizeStockStatus("Sold out")).toBe("out_of_stock");
    });

    it("handles 'pre order' as in_stock (FIXED: pre-order means available)", () => {
      expect(normalizeStockStatus("Pre order")).toBe("in_stock");
      expect(normalizeStockStatus("Preorder")).toBe("in_stock");
      expect(normalizeStockStatus("PO")).toBe("in_stock");
    });
  });

  describe("edge cases", () => {
    it("returns unknown for null/empty", () => {
      expect(normalizeStockStatus(null)).toBe("unknown");
      expect(normalizeStockStatus("")).toBe("unknown");
      expect(normalizeStockStatus(undefined)).toBe("unknown");
    });
  });
});

// ============================================================================
// CONDITION NORMALIZATION TESTS
// ============================================================================

describe("normalizeCondition", () => {
  describe("new condition", () => {
    it("handles 'baru'", () => {
      expect(normalizeCondition("Baru")).toBe("new");
      expect(normalizeCondition("baru")).toBe("new");
    });

    it("handles 'new'", () => {
      expect(normalizeCondition("New")).toBe("new");
      expect(normalizeCondition("Brand New")).toBe("new");
    });

    it("defaults to unknown (FIXED: don't assume new)", () => {
      expect(normalizeCondition("")).toBe("unknown");
      expect(normalizeCondition(null)).toBe("unknown");
      expect(normalizeCondition("tidak jelas")).toBe("unknown");
    });
  });

  describe("used condition", () => {
    it("handles 'bekas'", () => {
      expect(normalizeCondition("Bekas")).toBe("used");
    });

    it("handles 'second'", () => {
      expect(normalizeCondition("Second")).toBe("used");
      expect(normalizeCondition("Seken")).toBe("used");
    });

    it("handles English variants", () => {
      expect(normalizeCondition("Used")).toBe("used");
      expect(normalizeCondition("Pre-owned")).toBe("used");
    });
  });

  describe("refurbished condition", () => {
    it("handles 'refurbished'", () => {
      expect(normalizeCondition("Refurbished")).toBe("refurbished");
      expect(normalizeCondition("Rekondisi")).toBe("refurbished");
    });
  });
});

// ============================================================================
// PRODUCT TITLE NORMALIZATION TESTS
// ============================================================================

describe("normalizeProductTitle", () => {
  it("normalizes basic title", () => {
    const result = normalizeProductTitle("iPhone 14 Pro Max");
    expect(result).toBe("iphone 14 pro max");
  });

  it("removes special characters", () => {
    const result = normalizeProductTitle("iPhone 14 (Pro) [Max]!");
    expect(result).toBe("iphone 14 pro max");
  });

  it("normalizes whitespace", () => {
    const result = normalizeProductTitle("iPhone  14   Pro    Max");
    expect(result).toBe("iphone 14 pro max");
  });

  it("handles empty input", () => {
    expect(normalizeProductTitle("")).toBe("");
    expect(normalizeProductTitle(null)).toBe("");
  });
});

// ============================================================================
// MASTER NORMALIZER TESTS
// ============================================================================

describe("normalizeOffer", () => {
  it("normalizes complete offer", () => {
    const raw: RawOfferInput = {
      marketplace: "tokopedia",
      product_url: "https://tokopedia.com/product/123",
      marketplace_product_id: "12345",
      title: "iPhone 14 Pro Max 256GB",
      price: "Rp 18.999.000",
      original_price: "Rp 19.999.000",
      seller_name: "Apple Store Official",
      seller_rating: "4.9",
      seller_location: "Jakarta",
      is_official_store: "true",
      condition: "Baru",
      variant: "256GB Purple",
      stock_status: "Tersedia",
      rating: "4.8",
      review_count: "1250",
      sold_count: "500",
      shipping_estimate: "15000",
      voucher_text: "Cashback 10%",
      source: "extension_snapshot",
    };

    const result = normalizeOffer(raw);

    expect(result.marketplace).toBe("tokopedia");
    expect(result.current_price).toBe(18999000);
    expect(result.original_price).toBe(19999000);
    expect(result.discount_percent).toBeCloseTo(5, 0);
    expect(result.seller_name).toBe("Apple Store Official");
    expect(result.seller_rating).toBe(4.9);
    expect(result.is_official_store).toBe(true);
    expect(result.condition).toBe("new");
    expect(result.stock_status).toBe("in_stock");
    expect(result.rating).toBe(4.8);
    expect(result.review_count).toBe(1250);
    expect(result.sold_count).toBe(500);
    expect(result.shipping_estimate).toBe(15000);
    expect(result.source).toBe("extension_snapshot");
  });

  it("handles minimal offer", () => {
    const raw: RawOfferInput = {
      product_url: "https://shopee.co.id/product/456",
      price: "1299000",
      source: "system",
    };

    const result = normalizeOffer(raw);

    expect(result.product_url).toBe("https://shopee.co.id/product/456");
    expect(result.current_price).toBe(1299000);
    expect(result.original_price).toBeNull();
    expect(result.discount_percent).toBeNull();
    expect(result.seller_name).toBeNull();
    expect(result.is_official_store).toBe(false);
    expect(result.source).toBe("system");
  });

  it("handles captured_at parameter", () => {
    const testDate = new Date("2026-01-01T00:00:00Z");
    const raw: RawOfferInput = {
      product_url: "https://test.com",
      price: "1000000",
      source: "test",
      captured_at: testDate,
    };

    const result = normalizeOffer(raw);
    expect(result.captured_at).toEqual(testDate);
  });

  it("uses current date if captured_at not provided", () => {
    const raw: RawOfferInput = {
      product_url: "https://test.com",
      price: "1000000",
      source: "test",
    };

    const result = normalizeOffer(raw);
    expect(result.captured_at).toBeInstanceOf(Date);
    expect(Math.abs(Date.now() - result.captured_at.getTime())).toBeLessThan(1000);
  });
});

// ============================================================================
// HASH GENERATION TESTS
// ============================================================================

describe("generateOfferHash", () => {
  it("generates consistent hash for same offer", () => {
    const offer = normalizeOffer({
      product_url: "https://test.com",
      marketplace: "tokopedia",
      marketplace_product_id: "123",
      price: "1000000",
      seller_name: "Test Store",
      source: "test",
      captured_at: new Date("2026-01-01"),
    });

    const hash1 = generateOfferHash(offer);
    const hash2 = generateOfferHash(offer);

    expect(hash1).toBe(hash2);
    expect(hash1).toBeTruthy();
  });

  it("generates different hash for different offers", () => {
    const offer1 = normalizeOffer({
      product_url: "https://test.com/1",
      price: "1000000",
      source: "test",
      captured_at: new Date("2026-01-01"),
    });

    const offer2 = normalizeOffer({
      product_url: "https://test.com/2",
      price: "2000000",
      source: "test",
      captured_at: new Date("2026-01-01"),
    });

    const hash1 = generateOfferHash(offer1);
    const hash2 = generateOfferHash(offer2);

    expect(hash1).not.toBe(hash2);
  });

  it("generates same hash for same date (different time)", () => {
    const offer1 = normalizeOffer({
      product_url: "https://test.com",
      marketplace_product_id: "123",
      price: "1000000",
      source: "test",
      captured_at: new Date("2026-01-01T08:00:00Z"),
    });

    const offer2 = normalizeOffer({
      product_url: "https://test.com",
      marketplace_product_id: "123",
      price: "1000000",
      source: "test",
      captured_at: new Date("2026-01-01T14:00:00Z"),
    });

    // Hash uses date only, not time
    const hash1 = generateOfferHash(offer1);
    const hash2 = generateOfferHash(offer2);

    expect(hash1).toBe(hash2);
  });
});
