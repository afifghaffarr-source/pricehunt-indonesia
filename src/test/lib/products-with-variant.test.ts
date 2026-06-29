/**
 * TDD: src/lib/supabase/products.ts — getProductBySlugFromDB (Task 7).
 *
 * Verifies getProductBySlugFromDB surfaces the new `defaultVariant` field on
 * the returned Product. Phase 1 plumbing check: the function must call the
 * new `getDefaultVariantForProduct` helper in parallel with prices + history,
 * and attach its result to the product — so consumers (e.g. /product/[slug]
 * page badge) can read `product.defaultVariant`.
 *
 * Mocks both the browser client (used by products.ts + prices.ts) and the
 * server client (used by product-variants.ts) because both modules are
 * exercised in this single fetch path. The product_variants chain resolves
 * to `{ data: null, error: null }` (no default yet), so the call exercises
 * the `result.defaultVariant = null` branch.
 *
 * NOTE diverges from the brief on one detail: the brief's mock has a
 * `price_history` chain, but post-migration 129 the code uses
 * `price_snapshots` (see src/lib/supabase/prices.ts P7-Post note).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

interface FakeProductRow {
  id: string;
  slug: string;
  name: string;
  category?: string;
}

// Centralised mock shapes so each table gets the right chain terminal.
const FAKE_PRODUCT: FakeProductRow = {
  id: "p1",
  slug: "apple-iphone-16",
  name: "Apple iPhone 16",
  category: "phones",
};

vi.mock("@/lib/supabase/client", () => {
  // Recursive chainable — any depth of .select/.eq/.in/.order returns self,
  // then a terminal method (.single / .maybeSingle / .then) resolves with
  // the right shape per-table.
  const makeBuilder = (table: string, columnArgs: Array<[string, unknown]>) => {
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = (col: string, val: unknown) => {
      columnArgs.push([col, val]);
      return builder;
    };
    builder.in = (col: string, val: unknown) => {
      columnArgs.push([col, val]);
      return builder;
    };
    builder.order = () => builder;
    // Per-table terminal:
    builder.then = (resolve: (v: unknown) => void, _reject?: (e: unknown) => void) => {
      if (table === "product_prices_view") {
        resolve({ data: [], error: null });
      } else if (table === "price_snapshots") {
        resolve({ data: [], error: null });
      } else {
        // Default — empty awaitable
        resolve({ data: null, error: null });
      }
    };
    return builder;
  };
  return {
    createClient: vi.fn(async () => ({
      from: (table: string) => {
        const columnArgs: Array<[string, unknown]> = [];
        // Products uses .select(...).eq(...).single() terminal — append
        // a .single override by detecting this specific path.
        const b = makeBuilder(table, columnArgs);
        b.single = () =>
          Promise.resolve({
            data: table === "products" ? FAKE_PRODUCT : null,
            error: null,
          });
        return b;
      },
    })),
    hasSupabaseEnv: vi.fn(() => true),
  };
});

vi.mock("@/lib/supabase/server", () => {
  const nullTerminal = Promise.resolve({ data: null, error: null });
  const makeBuilder = () => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.order = () => b;
    b.single = () => nullTerminal;
    b.maybeSingle = () => nullTerminal;
    return b;
  };
  return {
    createClient: vi.fn(async () => ({
      from: (_table: string) => ({ select: () => makeBuilder() }),
    })),
  };
});

import { getProductBySlugFromDB } from "@/lib/supabase/products";

describe("getProductBySlugFromDB default-variant surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a defaultVariant field on the returned product", async () => {
    const product = await getProductBySlugFromDB("apple-iphone-16");
    expect(product).not.toBeNull();
    // The new field exists. May be null because the product_variants mock
    // returns null — but the SHAPE must include the field on every successful
    // fetch. (Type-narrowing on Product.defaultVariant is intentionally
    // avoided: the field is not on the global Product type until Phase 3
    // lands the picker UI; see src/lib/supabase/products.ts inline cast.)
    expect(product).toHaveProperty("defaultVariant");
  });
});
