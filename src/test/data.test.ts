import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
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
          order: mockOrder.mockResolvedValue({ data: [], error: null }),
        }),
        order: mockOrder.mockResolvedValue({ data: [], error: null }),
      }),
    });
  });

  it("getProductsFromDB returns empty array on error", async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        order: mockOrder.mockResolvedValue({ data: null, error: new Error("fail") }),
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
