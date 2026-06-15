import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  hasSupabaseEnv: vi.fn(() => true),
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe("Supabase data queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: null, error: null }),
          order: mockOrder.mockReturnValue({
            range: mockRange.mockResolvedValue({ data: [], error: null }),
          }),
        }),
        order: mockOrder.mockReturnValue({
          range: mockRange.mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
  });

  it("getProductsFromDB returns empty array on error", async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        order: mockOrder.mockReturnValue({
          range: mockRange.mockResolvedValue({ data: null, error: new Error("fail") }),
        }),
      }),
    });

    const { getProductsFromDB } = await import("@/lib/supabase/data");
    const result = await getProductsFromDB();
    expect(result).toEqual([]);
  });

  it("getProductBySlugFromDB returns null when not found", async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: null, error: new Error("not found") }),
        }),
      }),
    });

    const { getProductBySlugFromDB } = await import("@/lib/supabase/data");
    const result = await getProductBySlugFromDB("nonexistent");
    expect(result).toBeNull();
  });
});

describe("P7: fetchPricesByProductIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty object when productIds is empty", async () => {
    const { fetchPricesByProductIds } = await import("@/lib/supabase/data");
    const result = await fetchPricesByProductIds([]);
    expect(result).toEqual({});
  });

  it("queries the product_prices_view with the given IDs", async () => {
    // Real Supabase: .in() returns a chainable that also has .eq()
    const terminal = { data: [], error: null };
    const chain: any = {};
    chain.in = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any) => resolve(terminal);

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue(chain),
    });

    const { fetchPricesByProductIds } = await import("@/lib/supabase/data");
    await fetchPricesByProductIds(["prod-1", "prod-2"]);

    expect(mockFrom).toHaveBeenCalledWith("product_prices_view");
    expect(chain.in).toHaveBeenCalledWith("product_id", ["prod-1", "prod-2"]);
    expect(chain.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("groups results by product_id", async () => {
    const rows = [
      { product_id: "p1", current_price: 100, seller_name: "A", stock_status: "in_stock", marketplace_name: "tokopedia" },
      { product_id: "p1", current_price: 200, seller_name: "B", stock_status: "in_stock", marketplace_name: "shopee" },
      { product_id: "p2", current_price: 300, seller_name: "C", stock_status: "in_stock", marketplace_name: "blibli" },
    ];
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    });

    const { fetchPricesByProductIds } = await import("@/lib/supabase/data");
    const result = await fetchPricesByProductIds(["p1", "p2"]);

    expect(result["p1"]).toHaveLength(2);
    expect(result["p2"]).toHaveLength(1);
    expect(result["p1"][0].current_price).toBe(100);
    expect(result["p2"][0].marketplace_name).toBe("blibli");
  });

  it("returns empty object on error", async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error("network") }),
        }),
      }),
    });

    const { fetchPricesByProductIds } = await import("@/lib/supabase/data");
    const result = await fetchPricesByProductIds(["p1"]);
    expect(result).toEqual({});
  });
});

describe("P7: transformPrices (unified view shape)", () => {
  // We test via getProductsFromDB since transformPrices is not exported.
  // It uses the new field names: current_price, seller_name, stock_status,
  // shipping_estimate, last_checked_at, marketplace_name.

  it("maps view rows to MarketplacePrice shape", async () => {
    const productRow = { id: "p1", slug: "iphone", name: "iPhone", deal_score: 50 };
    const priceRow = {
      product_id: "p1",
      current_price: 15000000,
      seller_name: "iBox Official",
      seller_rating: 4.8,
      url: "https://example.com",
      stock_status: "in_stock",
      shipping_estimate: 0,
      last_checked_at: "2026-06-15T10:00:00Z",
      marketplace_name: "tokopedia",
      is_active: true,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: [productRow], error: null }),
            }),
          }),
        };
      }
      if (table === "product_prices_view") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [priceRow], error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    const { getProductsFromDB } = await import("@/lib/supabase/data");
    const products = await getProductsFromDB();

    expect(products).toHaveLength(1);
    expect(products[0].prices).toHaveLength(1);
    expect(products[0].prices[0]).toMatchObject({
      price: 15000000,
      seller: "iBox Official",
      sellerRating: 4.8,
      inStock: true,
      shippingCost: 0,
      marketplace: "tokopedia",
    });
  });

  it("marks inStock=false when stock_status=out_of_stock", async () => {
    const productRow = { id: "p1", slug: "x", name: "X", deal_score: 0 };
    const priceRow = {
      product_id: "p1",
      current_price: 100,
      seller_name: null,
      seller_rating: null,
      url: "",
      stock_status: "out_of_stock",
      shipping_estimate: null,
      last_checked_at: null,
      marketplace_name: "tokopedia",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: [productRow], error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [priceRow], error: null }),
          }),
        }),
      };
    });

    const { getProductsFromDB } = await import("@/lib/supabase/data");
    const products = await getProductsFromDB();
    expect(products[0].prices[0].inStock).toBe(false);
  });
});
