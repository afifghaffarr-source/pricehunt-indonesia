import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  formatCompactRupiah,
  getDealScoreInfo,
  getMarketplaceColor,
  getMarketplaceName,
  generateSlug,
  getDiscountPercent,
} from "@/lib/utils";

describe("formatRupiah", () => {
  it("formats positive numbers correctly", () => {
    expect(formatRupiah(1500000)).toContain("1.500.000");
    expect(formatRupiah(100000)).toContain("100.000");
    expect(formatRupiah(0)).toContain("0");
  });

  it("formats large numbers", () => {
    expect(formatRupiah(19999000)).toContain("19.999.000");
  });
});

describe("formatCompactRupiah", () => {
  it("formats millions", () => {
    expect(formatCompactRupiah(1500000)).toBe("Rp1.5jt");
    expect(formatCompactRupiah(10000000)).toBe("Rp10.0jt");
  });

  it("formats thousands", () => {
    expect(formatCompactRupiah(50000)).toBe("Rp50rb");
  });

  it("formats small amounts", () => {
    expect(formatCompactRupiah(500)).toBe("Rp500");
  });
});

describe("getDealScoreInfo", () => {
  // Background colors are WCAG 2.1 AA compliant (700+ shades for 4.5:1
  // contrast on 12px white text). See tests/e2e/a11y.spec.ts.
  it("returns great deal for score >= 85", () => {
    const info = getDealScoreInfo(90);
    expect(info.label).toBe("Harga Terbaik");
    expect(info.bgColor).toBe("bg-emerald-700");
  });

  it("returns good deal for score >= 70", () => {
    const info = getDealScoreInfo(75);
    expect(info.label).toBe("Deal Bagus");
    expect(info.bgColor).toBe("bg-green-700");
  });

  it("returns OK deal for score >= 50", () => {
    const info = getDealScoreInfo(55);
    expect(info.label).toBe("Harga Wajar");
    expect(info.bgColor).toBe("bg-amber-700");
  });

  it("returns expensive for score < 50", () => {
    const info = getDealScoreInfo(30);
    expect(info.label).toBe("Mahal");
    expect(info.bgColor).toBe("bg-red-700");
  });
});

describe("getMarketplaceColor", () => {
  it("returns correct colors", () => {
    expect(getMarketplaceColor("tokopedia")).toBe("#42b549");
    expect(getMarketplaceColor("shopee")).toBe("#ee4d2d");
    expect(getMarketplaceColor("lazada")).toBe("#0f146d");
  });
});

describe("getMarketplaceName", () => {
  it("returns correct names", () => {
    expect(getMarketplaceName("tokopedia")).toBe("Tokopedia");
    expect(getMarketplaceName("tiktok")).toBe("TikTok Shop");
  });
});

describe("generateSlug", () => {
  it("generates valid slugs", () => {
    expect(generateSlug("Samsung Galaxy S24")).toBe("samsung-galaxy-s24");
    expect(generateSlug("iPhone 15 Pro Max!")).toBe("iphone-15-pro-max");
  });

  it("handles edge cases", () => {
    expect(generateSlug("  Hello  World  ")).toBe("hello-world");
    expect(generateSlug("a")).toBe("a");
  });
});

describe("getDiscountPercent", () => {
  it("calculates discount correctly", () => {
    expect(getDiscountPercent(80, 100)).toBe(20);
    expect(getDiscountPercent(90, 100)).toBe(10);
    expect(getDiscountPercent(100, 100)).toBe(0);
  });

  it("handles zero highest price", () => {
    expect(getDiscountPercent(0, 0)).toBe(0);
  });
});
