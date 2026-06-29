import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the upstream query helpers
vi.mock("@/lib/supabase/product-variants", () => ({
  listVariantsForProduct: vi.fn(),
  getDefaultVariantForProduct: vi.fn(),
}));

import { listVariantsForProduct, getDefaultVariantForProduct } from "@/lib/supabase/product-variants";
import { resolveAndAttachVariant } from "@/lib/ingestion/variant-resolver";

const unusedSupabase = {} as any;

beforeEach(() => {
  vi.mocked(listVariantsForProduct).mockReset();
  vi.mocked(getDefaultVariantForProduct).mockReset();
});

describe("resolveAndAttachVariant", () => {
  it("returns matched_existing when storage + color match an existing variant", async () => {
    vi.mocked(listVariantsForProduct).mockResolvedValue([
      { id: "v1", product_id: "p1", slug: "default", storage: null, color: null, connectivity: null, sku: null, is_default: true, is_active: true, created_at: "x", updated_at: "x" },
      { id: "v2", product_id: "p1", slug: "128gb-hitam", storage: "128GB", color: "hitam", connectivity: null, sku: null, is_default: false, is_active: true, created_at: "x", updated_at: "x" },
    ] as any);

    const res = await resolveAndAttachVariant(unusedSupabase, "p1", "128GB Hitam");
    expect(res.action).toBe("matched_existing");
    expect(res.variantId).toBe("v2");
  });

  it("returns created_new when no existing variant matches", async () => {
    vi.mocked(listVariantsForProduct).mockResolvedValue([
      { id: "v1", product_id: "p1", slug: "default", storage: null, color: null, connectivity: null, sku: null, is_default: true, is_active: true, created_at: "x", updated_at: "x" },
    ] as any);
    const stubSupabase = {
      from: () => ({
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "v_new" }, error: null }) }) }),
      }),
    } as any;

    const res = await resolveAndAttachVariant(stubSupabase, "p1", "256GB Putih");
    expect(res.action).toBe("created_new");
    expect(res.variantId).toBe("v_new");
  });

  it("returns unchanged_no_variant when variantText is null", async () => {
    vi.mocked(getDefaultVariantForProduct).mockResolvedValue({
      id: "v_default", product_id: "p1", slug: "default", storage: null, color: null,
      connectivity: null, sku: null, is_default: true, is_active: true,
      created_at: "x", updated_at: "x",
    } as any);

    const res = await resolveAndAttachVariant(unusedSupabase, "p1", null);
    expect(res.action).toBe("unchanged_no_variant");
    expect(res.variantId).toBe("v_default");
  });

  it("returns cap_exceeded when product has 100 variants and create would exceed", async () => {
    const variants = Array.from({ length: 100 }, (_, i) => ({
      id: `v${i}`, product_id: "p1", slug: `variant-${i}`, storage: "128GB", color: null,
      connectivity: null, sku: null, is_default: i === 0, is_active: true,
      created_at: "x", updated_at: "x",
    }));
    vi.mocked(listVariantsForProduct).mockResolvedValue(variants as any);
    // Supabase mock NOT consulted because cap-exceeded returns before insert
    const stubSupabase = { from: vi.fn() } as any;

    const res = await resolveAndAttachVariant(stubSupabase, "p1", "999GB Pink");
    expect(res.action).toBe("cap_exceeded");
    expect(res.variantId).toBe("v0");  // fallback to first (default) variant
  });

  it("uses slug derived from product slug base when creating new variant", async () => {
    vi.mocked(listVariantsForProduct).mockResolvedValue([] as any);  // empty list
    const stubSupabase = {
      from: (table: string) => {
        if (table === "products") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { slug: "apple-iphone-16" }, error: null }),
              }),
            }),
          };
        }
        if (table === "product_variants") {
          return {
            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "v_created" }, error: null }) }) }),
          };
        }
        return {};
      },
    } as any;

    const res = await resolveAndAttachVariant(stubSupabase, "p1", "512GB Blue");
    expect(res.action).toBe("created_new");
    expect(res.variantSlug).toMatch(/512gb.*blue/);
  });
});
