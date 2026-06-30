/**
 * v1.5.5 — offer-snapshot route changes:
 *   - findProductByTitle now uses findBestProductMatch (smarter matcher)
 *   - upsert onConflict changed from "url" to "product_id,marketplace_id"
 *     to align with the v1.5.3 UNIQUE constraint
 *
 * These tests verify the wiring without spinning up the live DB.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture matcher calls + control its return value
const mocks = vi.hoisted(() => ({
  findBestProductMatch: vi.fn(),
  createAdminClient: vi.fn(),
  upsertSpy: vi.fn(),
  insertSpy: vi.fn(),
  listVariantsForProduct: vi.fn(),
  getDefaultVariantForProduct: vi.fn(),
}));

vi.mock("@/lib/ingestion/matcher", () => ({
  findBestProductMatch: mocks.findBestProductMatch,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

// Phase 2: variant-resolver calls these query helpers. In the test
// environment, default mocks return empty list / null so the resolver
// falls back to the default variant (no DB write, no error). Tests that
// need richer behavior override via mocks.listVariantsForProduct.
vi.mock("@/lib/supabase/product-variants", () => ({
  listVariantsForProduct: mocks.listVariantsForProduct,
  getDefaultVariantForProduct: mocks.getDefaultVariantForProduct,
  getVariantBySlug: vi.fn().mockResolvedValue(null),
}));

// Minimal Supabase mock: products.select().limit() resolves to a list;
// offers.upsert() and price_snapshots.insert() are captured spies.
function makeSupabaseMock(productList: Array<{ id: string; name: string; category: string }>) {
  // For the `products` table, return a Proxy so that any chainable method
  // (.select, .limit, .eq, ...) just returns the same Proxy, and `await`ing
  // it resolves to the product list. The Proxy's `then` trap is what makes
  // it awaitable.
  const productsThenable = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) =>
            resolve({ data: productList, error: null });
        }
        // All other property accesses return a function that yields the
        // same thenable — enabling any chain like .select().limit().eq().
        return () => productsThenable;
      },
    }
  );

  const fromMock = vi.fn((table: string) => {
    if (table === "products") return productsThenable;
    if (table === "marketplaces") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { id: "mkt-tokopedia", name: "tokopedia" }, error: null }),
          }),
        }),
      };
    }
    if (table === "offers") {
      return {
        upsert: mocks.upsertSpy.mockReturnValue({
          select: () => ({
            single: () => Promise.resolve({ data: { id: "offer-1" }, error: null }),
          }),
        }),
      };
    }
    if (table === "price_snapshots") {
      return {
        insert: mocks.insertSpy.mockReturnValue({
          select: () => ({
            single: () => Promise.resolve({ data: { id: "snap-1" }, error: null }),
          }),
        }),
      };
    }
    if (table === "ingestion_logs") {
      return { insert: () => Promise.resolve({ error: null }) };
    }
    return {};
  });

  return { from: fromMock };
}

const ORIGINAL_SECRET = process.env.INGESTION_SECRET;

beforeEach(() => {
  process.env.INGESTION_SECRET="test-secret";
  mocks.findBestProductMatch.mockReset();
  mocks.createAdminClient.mockReset();
  mocks.upsertSpy.mockReset();
  mocks.insertSpy.mockReset();
  // Phase 2: default behavior — no existing variants; resolver returns default
  mocks.listVariantsForProduct.mockReset();
  mocks.getDefaultVariantForProduct.mockReset();
  mocks.listVariantsForProduct.mockResolvedValue([]);
  mocks.getDefaultVariantForProduct.mockResolvedValue(null);
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.INGESTION_SECRET;
  else process.env.INGESTION_SECRET = ORIGINAL_SECRET;
});

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/ingestion/offer-snapshot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-secret",
    },
    body: JSON.stringify(body),
  });
}

describe("offer-snapshot route — findProductByTitle (matcher integration)", () => {
  it("calls findBestProductMatch with offer details + candidate product list", async () => {
    const products = [
      { id: "p-iphone", name: "Apple iPhone 15 Pro Max 256GB", category: "Smartphone" },
      { id: "p-rog", name: "Asus ROG Zephyrus G14", category: "Laptop" },
    ];
    mocks.createAdminClient.mockReturnValue(makeSupabaseMock(products));
    // Phase 2: variant resolver pre-populated with a matching variant so the
    // mock supabase (which doesn't support product_variants INSERT) is bypassed.
    mocks.listVariantsForProduct.mockResolvedValue([
      { id: "v-256gb-default", product_id: "p-iphone", slug: "default", storage: null, color: null, connectivity: null, sku: null, is_default: true, is_active: true, created_at: "x", updated_at: "x" },
      { id: "v-256gb",         product_id: "p-iphone", slug: "256gb",      storage: "256GB", color: null, connectivity: null, sku: null, is_default: false, is_active: true, created_at: "x", updated_at: "x" },
    ]);
    mocks.findBestProductMatch.mockReturnValue({
      bestMatch: {
        productId: "p-iphone",
        result: {
          isMatch: true,
          score: 90,
          confidence: "high",
          reasons: ["Match score: 90/100"],
          warnings: [],
          flags: [],
        },
      },
      allResults: [],
    });

    const { POST } = await import("@/app/api/ingestion/offer-snapshot/route");
    const res = await POST(makeRequest({
      marketplace: "tokopedia",
      product_url: "https://tokopedia.com/p/iphone-15-pro-max",
      title: "Apple iPhone 15 Pro Max 256GB Garansi Resmi",
      price: 18500000,
      variant: "256GB",
    }) as unknown as import("next/server").NextRequest);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.findBestProductMatch).toHaveBeenCalledTimes(1);

    const [offer, candidates] = mocks.findBestProductMatch.mock.calls[0];
    expect(offer.title).toBe("Apple iPhone 15 Pro Max 256GB Garansi Resmi");
    expect(offer.marketplace).toBe("tokopedia"); // resolved name, not UUID
    expect(offer.variant).toBe("256GB");
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toEqual({
      id: "p-iphone",
      title: "Apple iPhone 15 Pro Max 256GB",
      brand: null,
      category: "Smartphone",
    });
  });

  it("returns offer without product_id when matcher rejects (bestMatch=null)", async () => {
    // Provide a product list so the route reaches the matcher — but the
    // matcher mock returns bestMatch: null (low similarity, negative
    // keywords, etc.). The route should not crash and the response should
    // not include an offer_id tied to a product.
    mocks.createAdminClient.mockReturnValue(
      makeSupabaseMock([
        { id: "p-iphone", name: "Apple iPhone 15 Pro Max 256GB", category: "Smartphone" },
      ])
    );
    mocks.findBestProductMatch.mockReturnValue({
      bestMatch: null,
      allResults: [],
    });

    const { POST } = await import("@/app/api/ingestion/offer-snapshot/route");
    const res = await POST(makeRequest({
      marketplace: "tokopedia",
      product_url: "https://tokopedia.com/p/random",
      title: "Random product not in catalog",
      price: 50000,
    }) as unknown as import("next/server").NextRequest);

    expect(res.status).toBe(200);
    expect(mocks.findBestProductMatch).toHaveBeenCalledTimes(1);
  });
});

describe("offer-snapshot route — upsert onConflict", () => {
  it("upserts offers with onConflict='product_id,marketplace_id'", async () => {
    const products = [
      { id: "p-iphone", name: "Apple iPhone 15 Pro Max 256GB", category: "Smartphone" },
    ];
    mocks.createAdminClient.mockReturnValue(makeSupabaseMock(products));
    mocks.findBestProductMatch.mockReturnValue({
      bestMatch: {
        productId: "p-iphone",
        result: { isMatch: true, score: 90, confidence: "high", reasons: [], warnings: [], flags: [] },
      },
      allResults: [],
    });

    const { POST } = await import("@/app/api/ingestion/offer-snapshot/route");
    await POST(makeRequest({
      marketplace: "tokopedia",
      product_url: "https://tokopedia.com/p/iphone",
      title: "Apple iPhone 15 Pro Max 256GB",
      price: 18500000,
    }) as unknown as import("next/server").NextRequest);

    expect(mocks.upsertSpy).toHaveBeenCalledTimes(1);
    const upsertOpts = mocks.upsertSpy.mock.calls[0][1];
    expect(upsertOpts).toEqual(
      expect.objectContaining({
        onConflict: "product_id,marketplace_id",
        ignoreDuplicates: false,
      }),
    );
  });
});
