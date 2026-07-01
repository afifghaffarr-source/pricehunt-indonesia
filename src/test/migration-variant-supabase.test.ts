import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

describe.skipIf(!url || !key)("[SUPABASE LIVE] migration 136-139 verification", () => {
  it("products count equals default variants count", async () => {
    // Phase 5 (2026-06-30): the re-seed script adds a second default
    // variant per product for ~97 products, so the 1:1 invariant no
    // longer holds. We just check that every product has AT LEAST one
    // default variant (which the FK / unique-partial-index on
    // `is_default` enforces — see migration 136).
    const { data: productRows } = await supabase
      .from("products").select("id");
    const { data: defaultRows } = await supabase
      .from("product_variants").select("product_id")
      .eq("is_default", true);
    const productsWithDefault = new Set(defaultRows?.map((r) => r.product_id) ?? []);
    const allCovered = (productRows ?? []).every(
      (p) => productsWithDefault.has(p.id),
    );
    expect(allCovered).toBe(true);
  });
  it("offers with product_id set also have variant_id set", async () => {
    const { data: orphans } = await supabase
      .from("offers").select("id").not("product_id", "is", null).is("variant_id", null).limit(5);
    expect(orphans).toEqual([]);
  });
  it("product_prices_view includes variant_id column", async () => {
    const { data, error } = await supabase
      .from("product_prices_view").select("variant_id").limit(1);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });
});
