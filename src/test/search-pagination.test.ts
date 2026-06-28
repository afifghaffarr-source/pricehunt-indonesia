/**
 * Unit tests: src/lib/supabase/products.ts (searchProductsFromDB)
 *
 * Locks in the P9 audit fix: pagination must return an accurate `total`
 * via a head-only count query, NOT the slice length. The buggy version
 * fetched `limit+offset` and sliced locally, which reported a wrong total
 * that grew with the offset.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());

// The helper imports `createClient` AND `hasSupabaseEnv` from `./client`
// (browser client). The path resolves to `@/lib/supabase/client`.
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
  hasSupabaseEnv: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseEnv: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/prices", () => ({
  fetchPricesByProductIds: vi.fn(async () => ({})),
}));

vi.mock("@/lib/supabase/transforms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/transforms")>();
  return {
    transformProduct: vi.fn((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
      prices: [],
    })),
    transformPrices: vi.fn(() => []),
    escapeILIKEPattern: actual.escapeILIKEPattern,
  };
});

import { searchProductsFromDB } from "@/lib/supabase/products";

/**
 * Build a mock that tracks calls across BOTH the count and data paths.
 * The helper calls .from("products").select(...) twice: first with
 * { count, head } (count path), then with a column list (data path).
 */
function makeBuilder(opts: {
  count?: number;
  rows?: Array<{ id: string; name: string }>;
}) {
  const calls = { or: 0, eq: 0, range: 0, order: 0 };
  const orFilters: string[] = [];
  const eqFilters: Array<[string, unknown]> = [];
  let lastRangeArgs: [number, number] | null = null;

  // Count path: a thenable. or/eq return self, then resolves.
  const countChain = {
    or: vi.fn((f: string) => {
      calls.or++;
      orFilters.push(f);
      return countChain;
    }),
    eq: vi.fn((col: string, val: unknown) => {
      calls.eq++;
      eqFilters.push([col, val]);
      return countChain;
    }),
    then: (resolve: (v: unknown) => void) => {
      resolve({ data: null, error: null, count: opts.count ?? 0 });
    },
  };

  // Data path: chainable. .range() returns the rows.
  const dataChain: Record<string, unknown> = {};
  dataChain.select = vi.fn(() => dataChain);
  dataChain.or = vi.fn((f: string) => {
    calls.or++;
    orFilters.push(f);
    return dataChain;
  });
  dataChain.eq = vi.fn((col: string, val: unknown) => {
    calls.eq++;
    eqFilters.push([col, val]);
    return dataChain;
  });
  dataChain.order = vi.fn(() => {
    calls.order++;
    return dataChain;
  });
  dataChain.range = vi.fn((from: number, to: number) => {
    calls.range++;
    lastRangeArgs = [from, to];
    return Promise.resolve({ data: opts.rows ?? null, error: null });
  });

  // Dispatcher: first select() with head → count, otherwise → data
  const fromChain: Record<string, unknown> = {};
  fromChain.select = vi.fn((...args: unknown[]) => {
    // Check if any arg is the { count, head } signature
    const hasHead = args.some(
      (a) => typeof a === "object" && a !== null && "head" in (a as object),
    );
    return hasHead ? countChain : dataChain;
  });

  return { fromChain, calls, orFilters, eqFilters, lastRangeArgs: () => lastRangeArgs };
}

describe("searchProductsFromDB", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
  });

  it("returns { products, total } shape (not bare array)", async () => {
    const { fromChain } = makeBuilder({ count: 0, rows: [] });
    mockFrom.mockReturnValue(fromChain);

    const result = await searchProductsFromDB("", undefined, 50, 0);
    expect(result).toHaveProperty("products");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.products)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("returns total=0 and empty products when nothing matches", async () => {
    const { fromChain } = makeBuilder({ count: 0, rows: [] });
    mockFrom.mockReturnValue(fromChain);

    const result = await searchProductsFromDB("nonexistent-xyz", undefined, 50, 0);
    expect(result.total).toBe(0);
    expect(result.products).toEqual([]);
  });

  it("uses range(offset, offset+limit-1) for the data query", async () => {
    const { fromChain, lastRangeArgs } = makeBuilder({
      count: 100,
      rows: [{ id: "p1", name: "Product 1" }],
    });
    mockFrom.mockReturnValue(fromChain);

    await searchProductsFromDB("phone", undefined, 20, 40);
    // offset=40, limit=20 -> range(40, 59)
    expect(lastRangeArgs()).toEqual([40, 59]);
  });

  it("total reflects DB count, independent of page size", async () => {
    // 100 matching rows, but page only has 1
    const { fromChain } = makeBuilder({
      count: 100,
      rows: [{ id: "p1", name: "P1" }],
    });
    mockFrom.mockReturnValue(fromChain);

    const result = await searchProductsFromDB("phone", undefined, 20, 0);
    expect(result.total).toBe(100);
  });

  it("applies category filter (eq) to BOTH count and data queries", async () => {
    const { fromChain, calls } = makeBuilder({ count: 5, rows: [] });
    mockFrom.mockReturnValue(fromChain);

    await searchProductsFromDB("", "Electronics", 50, 0);
    expect(calls.eq).toBe(2);
  });

  it("applies search filter (or) to BOTH count and data queries", async () => {
    const { fromChain, calls } = makeBuilder({ count: 0, rows: [] });
    mockFrom.mockReturnValue(fromChain);

    await searchProductsFromDB("iphone", undefined, 50, 0);
    expect(calls.or).toBe(2);
  });

  it("escapes ILIKE pattern in search query (no injection)", async () => {
    const { fromChain, orFilters } = makeBuilder({ count: 0, rows: [] });
    mockFrom.mockReturnValue(fromChain);

    // User tries to inject ILIKE wildcards % and _
    await searchProductsFromDB("a%b_c", undefined, 50, 0);
    expect(orFilters.length).toBe(2);
    const filter = orFilters[0];
    expect(filter).toBeDefined();
    // The raw a%b_c must NOT appear unescaped inside any of the ILIKE wrappers
    expect(filter).not.toMatch(/name\.ilike\.%a%b_c%/);
    // Escaped forms: single backslash before each metachar
    // (TS string "\\%" = 2 chars: \ + %)
    expect(filter).toContain("\\%");
    expect(filter).toContain("\\_");
  });
});
