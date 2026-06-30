import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ingestion/matcher", () => ({
  findBestProductMatch: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: vi.fn(),
}));

import { runOrphanAutoLink } from "@/lib/cron/orphan-auto-link";
import { findBestProductMatch } from "@/lib/ingestion/matcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";

function mkSupabase(candidates: any[], products: any[], updateShouldFail = false) {
  return {
    from: (table: string) => {
      if (table === "offers") {
        return {
          select: () => ({
            is: () => ({
              gt: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: candidates, error: null }),
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: updateShouldFail ? { message: "test-fail" } : null }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            limit: () => Promise.resolve({ data: products, error: null }),
          }),
        };
      }
      return { select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) };
    },
  } as any;
}

describe("runOrphanAutoLink", () => {
  beforeEach(() => {
    vi.mocked(findBestProductMatch).mockReset();
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(logAdminAction).mockReset();
  });

  it("writes audit row even when zero candidates", async () => {
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase([], []));

    const r = await runOrphanAutoLink();
    expect(r.processed).toBe(0);
    expect(r.linked).toBe(0);
    expect(r.still_orphan).toBe(0);
    expect(vi.mocked(logAdminAction)).toHaveBeenCalledTimes(1);
  });

  it("links on 'high' confidence", async () => {
    const candidates = [{ id: "o1", title: "iPhone 16 128GB", price: 18_500_000, marketplace: "tokopedia", variant: "128GB Hitam" }];
    const products = [{ id: "p1", name: "Apple iPhone 16", brand: null, category: "phone" }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, products));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 85, confidence: "high", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(1);
    expect(r.still_orphan).toBe(0);
  });

  it("links on 'medium' confidence", async () => {
    const candidates = [{ id: "o2", title: "iPhone 16", price: 18_500_000, marketplace: "tokopedia", variant: null }];
    const products = [{ id: "p1", name: "Apple iPhone 16", brand: null, category: "phone" }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, products));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 65, confidence: "medium", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(1);
  });

  it("does NOT link on 'low' confidence", async () => {
    const candidates = [{ id: "o3", title: "x", price: 1, marketplace: "tokopedia", variant: null }];
    const products = [{ id: "p1", name: "x", brand: null, category: "phone" }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, products));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 20, confidence: "low", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(0);
    expect(r.still_orphan).toBe(1);
  });

  it("does NOT link on 'reject' confidence", async () => {
    const candidates = [{ id: "o4", title: "x", price: 1, marketplace: "tokopedia", variant: null }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, [{ id: "p1", name: "x", brand: null, category: "phone" }]));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 5, confidence: "reject", isMatch: false, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(0);
    expect(r.still_orphan).toBe(1);
  });

  it("counts errors when offer update fails", async () => {
    const candidates = [{ id: "o_fail", title: "x", price: 1, marketplace: "tokopedia", variant: null }];
    vi.mocked(createAdminClient).mockReturnValue(
      mkSupabase(candidates, [{ id: "p1", name: "x", brand: null, category: "phone" }], /* updateShouldFail */ true),
    );
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 80, confidence: "high", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.errors).toBe(1);
    expect(r.linked).toBe(0);
  });

  it("audit row carries cap and max_age_days in metadata", async () => {
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase([], []));
    await runOrphanAutoLink({ cap: 100, maxAgeDays: 30 });
    expect(vi.mocked(logAdminAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "orphan_auto_link",
        metadata: expect.objectContaining({
          cap: 100,
          max_age_days: 30,
        }),
      }),
    );
  });

  it("top_links holds highest-scoring matches", async () => {
    const candidates = [
      { id: "o1", title: "A", price: 1, marketplace: "tokopedia", variant: null },
      { id: "o2", title: "B", price: 1, marketplace: "tokopedia", variant: null },
      { id: "o3", title: "C", price: 1, marketplace: "tokopedia", variant: null },
    ];
    const products = [{ id: "p1", name: "x", brand: null, category: "phone" }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, products));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 80, confidence: "high", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(3);
    expect(r.top_links).toHaveLength(3);
  });
});
