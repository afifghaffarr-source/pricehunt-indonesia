import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findBestMatchingProduct } from "@/lib/offer-product-link";

/**
 * Minimal mock of the slice of SupabaseClient that findBestMatchingProduct
 * uses: `.from().select().or().limit()`. Captures the or-filter so we can
 * assert what tokens were extracted from the title.
 */
type CapturingMock = SupabaseClient & {
  _lastOr: string | null;
  _fakeProducts: Array<{ id: string; name: string; slug: string }>;
};

function makeMock(products: Array<{ id: string; name: string; slug: string }>): CapturingMock {
  const m = {
    _lastOr: null as string | null,
    _fakeProducts: products,
    from() {
      const query: Record<string, unknown> = {};
      query.select = () => query;
      query.select = () => query;
      query.or = (filters: string) => {
        m._lastOr = filters;
        return query;
      };
      query.limit = () => {
        query._then = (resolve: (v: unknown) => unknown) =>
          resolve({ data: m._fakeProducts, error: null });
        return query;
      };
      // Make query awaitable (a thenable) so `await supabase.from(...).select(...).or(...).limit(...)` works
      query.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: m._fakeProducts, error: null });
      return query;
    },
  };
  return m as CapturingMock;
}

describe("findBestMatchingProduct", () => {
  it("returns null when title is empty", async () => {
    const m = makeMock([
      { id: "p1", name: "Apple iPhone 16 Pro", slug: "apple-iphone-16-pro" },
    ]);
    const match = await findBestMatchingProduct(m, "");
    expect(match).toBeNull();
  });

  it("returns null when title has only stopwords / claims", async () => {
    const m = makeMock([
      { id: "p1", name: "Apple iPhone 16 Pro", slug: "apple-iphone-16-pro" },
    ]);
    const match = await findBestMatchingProduct(m, "resmi original promo");
    expect(match).toBeNull();
  });

  it("links apple iphone 15 to Apple iPhone 15 Pro Max 256GB when title mentions both", async () => {
    const m = makeMock([
      { id: "p15pm", name: "Apple iPhone 15 Pro Max 256GB", slug: "apple-iphone-15-pro-max" },
      { id: "p16", name: "Apple iPhone 16", slug: "apple-iphone-16" },
      { id: "p24u", name: "Samsung Galaxy S24 Ultra 256GB", slug: "samsung-galaxy-s24-ultra" },
    ]);
    const match = await findBestMatchingProduct(
      m,
      "resmi apple iphone 15 pro max 256gb - official store",
    );
    expect(match).not.toBeNull();
    expect(match!.product_id).toBe("p15pm");
    expect(match!.product_slug).toBe("apple-iphone-15-pro-max");
    expect(match!.matched_tokens.length).toBeGreaterThanOrEqual(2);
  });

  it("returns null when there is no clear winner (matches ambiguous catalog)", async () => {
    const m = makeMock([
      { id: "pA", name: "Apple iPhone 15", slug: "iphone-15" },
      { id: "pB", name: "Apple iPhone 16", slug: "iphone-16" },
    ]);
    // Title says "iPhone" but no version → tokens ["iphone"].
    // identifyingTokens dedupes -> 1 token; threshold requires >=2.
    const match = await findBestMatchingProduct(m, "Apple iPhone");
    expect(match).toBeNull();
  });

  it("extracts enough identifying tokens to drive the OR query", async () => {
    const m = makeMock([
      { id: "p1", name: "Apple iPhone 16 Pro Max 256GB", slug: "apple-iphone-16-pro-max" },
    ]);
    await findBestMatchingProduct(
      m,
      "resmi Apple iPhone 16 Pro Max 256gb - 256 GB natural titanium",
    );
    expect(m._lastOr).toBeTruthy();
    expect(m._lastOr).toContain("apple");
    expect(m._lastOr).toContain("iphone");
    expect(m._lastOr).toContain("16");
    expect(m._lastOr).toContain("pro");
    expect(m._lastOr).toContain("max");
    // Storage-size token "256gb" is a substring of "256GB" → kept; should be in the filter
    expect(m._lastOr).toMatch(/256/);
  });

  it("returns null when best candidate has no margin over runner-up", async () => {
    const m = makeMock([
      { id: "pA", name: "Apple iPhone 15 Pro Max", slug: "iphone-15-pro-max" },
      { id: "pB", name: "Apple iPhone 16 Pro Max", slug: "iphone-16-pro-max" },
    ]);
    // "pro max" + iphone shared → both candidates have identical token scores.
    const match = await findBestMatchingProduct(m, "resmi Apple iPhone Pro Max");
    expect(match).toBeNull();
  });
});
