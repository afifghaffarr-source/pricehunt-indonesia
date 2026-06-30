import { describe, it, expect } from "vitest";
import { extractVariantFromTitle } from "@/lib/ingestion/extract-variant";

describe("extractVariantFromTitle", () => {
  it("returns null for empty/null/whitespace", () => {
    expect(extractVariantFromTitle(null)).toBeNull();
    expect(extractVariantFromTitle("")).toBeNull();
    expect(extractVariantFromTitle("   ")).toBeNull();
  });

  it("extracts storage from title", () => {
    expect(extractVariantFromTitle("iPhone 15 Pro Max 256GB - Official Store")).toBe("256GB");
    expect(extractVariantFromTitle("Samsung Galaxy S24 Ultra 512GB Titanium Black")).toContain("512GB");
  });

  it("extracts storage + color from title with multiple tokens", () => {
    const result = extractVariantFromTitle("apple iphone 16 128gb black");
    expect(result).not.toBeNull();
    expect(result).toContain("128GB");
    expect(result).toContain("black");
  });

  it("extracts TB storage unit", () => {
    expect(extractVariantFromTitle("iPhone 17 Pro Max 1TB")).toBe("1TB");
  });

  it("returns null when no variant-defining attributes found", () => {
    expect(extractVariantFromTitle("Product from Tokopedia")).toBeNull();
    expect(extractVariantFromTitle("synced test")).toBeNull();
    expect(extractVariantFromTitle("promo keyboard mechanical 68 keys rgb")).toBeNull();
  });

  it("extracts connectivity (5g)", () => {
    const result = extractVariantFromTitle("Samsung Galaxy S25 Ultra 5G 256GB");
    expect(result).toContain("256GB");
    expect(result?.toLowerCase()).toContain("5g");
  });

  it("handles lowercase and mixedcase titles", () => {
    expect(extractVariantFromTitle("IPHONE 15 PRO MAX 256GB")).toBe("256GB");
    expect(extractVariantFromTitle("iphone 15 pro max 256gb")).toBe("256GB");
    expect(extractVariantFromTitle("Iphone 15 Pro Max 256Gb")).toBe("256GB");
  });
});
