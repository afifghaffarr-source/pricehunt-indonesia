/**
 * Phase 7 — fetchVariantPriceStats + fetchVariantPriceHistory tests.
 *
 * Verifies the two new data-layer functions build the right Supabase
 * queries and aggregate the right values. We mock both the browser
 * client (used by prices.ts) so the test runs in isolation.
 *
 * The aggregation logic is the highest-risk part of Phase 7 — if a
 * formula is off by one, the variant stats table will mis-display
 * "Termurah" on the wrong row, and the chart will be wrong everywhere.
 * So we test:
 *   1. Per-variant min/max is computed from active in-stock offers.
 *   2. offerCount counts non-null positive prices; inStockCount only
 *      counts `stock_status = "in_stock"`.
 *   3. lastPrice is the most recent in-stock price (or the latest
 *      overall if none are in stock).
 *   4. fetchVariantPriceHistory only includes in-stock snapshots and
 *      keeps the per-(date, variant) min price.
 *   5. Supabase returns zero rows -> we return zero rows.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Track which methods are called and with what.
const calls: { table: string; method: string; args: unknown[] }[] = [];

const offersRowsByTable: Record<string, unknown[]> = {};
const priceSnapshotsRowsByTable: Record<string, unknown[]> = {};

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = (...args: unknown[]) => {
    calls.push({ table, method: "eq", args });
    return builder;
  };
  builder.not = (...args: unknown[]) => {
    calls.push({ table, method: "not", args });
    return builder;
  };
  builder.gte = (...args: unknown[]) => {
    calls.push({ table, method: "gte", args });
    return builder;
  };
  builder.then = (
    resolve: (v: unknown) => void,
    _reject?: (e: unknown) => void,
  ) => {
    if (table === "offers") {
      resolve({ data: offersRowsByTable[table] ?? [], error: null });
    } else if (table === "price_snapshots") {
      resolve({
        data: priceSnapshotsRowsByTable[table] ?? [],
        error: null,
      });
    } else {
      resolve({ data: [], error: null });
    }
  };
  return builder;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => makeBuilder(table),
  })),
  hasSupabaseEnv: () => true,
}));

import {
  fetchVariantPriceStats,
  fetchVariantPriceHistory,
} from "@/lib/supabase/prices";

beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(offersRowsByTable)) delete offersRowsByTable[k];
  for (const k of Object.keys(priceSnapshotsRowsByTable))
    delete priceSnapshotsRowsByTable[k];
});

describe("fetchVariantPriceStats", () => {
  it("returns empty when product has no offers", async () => {
    offersRowsByTable["offers"] = [];
    const stats = await fetchVariantPriceStats("p1");
    expect(stats).toEqual([]);
  });

  it("aggregates min/max/offerCount per variant (in-stock only for min/max)", async () => {
    offersRowsByTable["offers"] = [
      { id: "o1", variant_id: "v256", current_price: 15_000_000, last_checked_at: "2026-06-01T00:00:00Z", stock_status: "in_stock" },
      { id: "o2", variant_id: "v256", current_price: 16_000_000, last_checked_at: "2026-06-02T00:00:00Z", stock_status: "in_stock" },
      { id: "o3", variant_id: "v512", current_price: 18_000_000, last_checked_at: "2026-06-01T00:00:00Z", stock_status: "in_stock" },
      // Out of stock — counts in offerCount but excluded from min/max
      // so the "Termurah" badge can never point at an unbuyable price.
      { id: "o4", variant_id: "v512", current_price: 20_000_000, last_checked_at: "2026-06-02T00:00:00Z", stock_status: "out_of_stock" },
      // Null variant_id — should be filtered out.
      { id: "o5", variant_id: null, current_price: 9_999_999, last_checked_at: "2026-06-01T00:00:00Z", stock_status: "in_stock" },
    ];
    const stats = await fetchVariantPriceStats("p1");
    expect(stats).toHaveLength(2);
    const v256 = stats.find((s) => s.variantId === "v256")!;
    const v512 = stats.find((s) => s.variantId === "v512")!;
    expect(v256.minPrice).toBe(15_000_000);
    expect(v256.maxPrice).toBe(16_000_000);
    expect(v256.offerCount).toBe(2);
    expect(v256.inStockCount).toBe(2);
    expect(v256.lastUpdated).toBe("2026-06-02T00:00:00Z");
    // v512 has 1 in-stock (18jt) + 1 OOS (20jt). min/max must come
    // from the in-stock offer only, NOT the OOS one.
    expect(v512.minPrice).toBe(18_000_000);
    expect(v512.maxPrice).toBe(18_000_000);
    expect(v512.offerCount).toBe(2);
    expect(v512.inStockCount).toBe(1);
  });

  it("returns null minPrice/maxPrice when no in-stock offers exist", async () => {
    offersRowsByTable["offers"] = [
      // All OOS — counts exist but min/max should be null
      // so the component shows "Belum ada penawaran" instead of a
      // misleading price the user can't buy.
      { id: "o1", variant_id: "v1", current_price: 12_000_000, last_checked_at: "2026-06-01T00:00:00Z", stock_status: "out_of_stock" },
      { id: "o2", variant_id: "v1", current_price: 14_000_000, last_checked_at: "2026-06-02T00:00:00Z", stock_status: "out_of_stock" },
    ];
    const stats = await fetchVariantPriceStats("p1");
    expect(stats).toHaveLength(1);
    expect(stats[0].minPrice).toBeNull();
    expect(stats[0].maxPrice).toBeNull();
    expect(stats[0].offerCount).toBe(2);
    expect(stats[0].inStockCount).toBe(0);
    expect(stats[0].lastPrice).toBe(14_000_000); // fallback to all-prices max
  });

  it("ignores zero / null / non-finite prices", async () => {
    offersRowsByTable["offers"] = [
      { id: "o1", variant_id: "v256", current_price: 0, last_checked_at: "2026-06-01T00:00:00Z", stock_status: "in_stock" },
      { id: "o2", variant_id: "v256", current_price: null, last_checked_at: "2026-06-01T00:00:00Z", stock_status: "in_stock" },
      { id: "o3", variant_id: "v256", current_price: 15_000_000, last_checked_at: "2026-06-01T00:00:00Z", stock_status: "in_stock" },
    ];
    const stats = await fetchVariantPriceStats("p1");
    expect(stats).toHaveLength(1);
    expect(stats[0].minPrice).toBe(15_000_000);
    expect(stats[0].maxPrice).toBe(15_000_000);
    // Only 1 offer had a valid price.
    expect(stats[0].offerCount).toBe(1);
  });

  it("queries the offers table with product_id + is_active filters", async () => {
    offersRowsByTable["offers"] = [];
    await fetchVariantPriceStats("product-abc");
    const eqProduct = calls.find(
      (c) => c.method === "eq" && c.args[0] === "product_id",
    );
    const eqActive = calls.find(
      (c) => c.method === "eq" && c.args[0] === "is_active",
    );
    const notNullVariant = calls.find(
      (c) => c.method === "not" && c.args[0] === "variant_id",
    );
    expect(eqProduct?.args[1]).toBe("product-abc");
    expect(eqActive?.args[1]).toBe(true);
    expect(notNullVariant).toBeTruthy();
  });
});

describe("fetchVariantPriceHistory", () => {
  it("returns empty map when no snapshots", async () => {
    priceSnapshotsRowsByTable["price_snapshots"] = [];
    const history = await fetchVariantPriceHistory("p1");
    expect(history).toEqual({});
  });

  it("groups per (date, variantId) keeping min in-stock price", async () => {
    priceSnapshotsRowsByTable["price_snapshots"] = [
      // Same date, same variant — keep the cheaper one.
      { current_price: 15_000_000, captured_at: "2026-06-01T10:00:00Z", offers: { product_id: "p1", variant_id: "v256", stock_status: "in_stock" } },
      { current_price: 14_500_000, captured_at: "2026-06-01T18:00:00Z", offers: { product_id: "p1", variant_id: "v256", stock_status: "in_stock" } },
      // Different variant same date.
      { current_price: 18_000_000, captured_at: "2026-06-01T10:00:00Z", offers: { product_id: "p1", variant_id: "v512", stock_status: "in_stock" } },
      // Out of stock — dropped by the in-stock filter.
      { current_price: 99_000_000, captured_at: "2026-06-01T10:00:00Z", offers: { product_id: "p1", variant_id: "v256", stock_status: "out_of_stock" } },
      // Null variant_id — dropped (the query has a `not is null` filter).
      { current_price: 1_000_000, captured_at: "2026-06-01T10:00:00Z", offers: { product_id: "p1", variant_id: null, stock_status: "in_stock" } },
    ];
    const history = await fetchVariantPriceHistory("p1");
    expect(Object.keys(history)).toHaveLength(2);
    expect(history["v256"]).toHaveLength(1);
    expect(history["v256"][0].date).toBe("2026-06-01");
    expect(history["v256"][0].price).toBe(14_500_000);
    expect(history["v512"][0].price).toBe(18_000_000);
  });

  it("sorts history oldest → newest per variant", async () => {
    priceSnapshotsRowsByTable["price_snapshots"] = [
      { current_price: 14_000_000, captured_at: "2026-06-02T00:00:00Z", offers: { product_id: "p1", variant_id: "v256", stock_status: "in_stock" } },
      { current_price: 15_000_000, captured_at: "2026-06-01T00:00:00Z", offers: { product_id: "p1", variant_id: "v256", stock_status: "in_stock" } },
      { current_price: 16_000_000, captured_at: "2026-06-03T00:00:00Z", offers: { product_id: "p1", variant_id: "v256", stock_status: "in_stock" } },
    ];
    const history = await fetchVariantPriceHistory("p1");
    expect(history["v256"].map((p) => p.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });

  it("applies a cutoff for the days parameter", async () => {
    priceSnapshotsRowsByTable["price_snapshots"] = [];
    const before = Date.now();
    await fetchVariantPriceHistory("p1", 30);
    const after = Date.now();
    const gteCall = calls.find((c) => c.method === "gte");
    expect(gteCall).toBeTruthy();
    // The cutoff is `Date.now() - 30d`. Confirm the call is in the ballpark.
    const cutoffMs = new Date(gteCall!.args[1] as string).getTime();
    const expectedLower = before - 31 * 24 * 60 * 60 * 1000;
    const expectedUpper = after - 29 * 24 * 60 * 60 * 1000;
    expect(cutoffMs).toBeGreaterThanOrEqual(expectedLower);
    expect(cutoffMs).toBeLessThanOrEqual(expectedUpper);
  });
});
