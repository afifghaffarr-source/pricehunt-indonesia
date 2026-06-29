import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabase = createClient(url, key, { auth: { persistSession: false } });

describe.skipIf(!url || !key)("[SUPABASE LIVE] migration 136-139 verification", () => {
  it("products count equals default variants count", async () => {
    const { count: products } = await supabase
      .from("products").select("*", { count: "exact", head: true });
    const { count: defaultVariants } = await supabase
      .from("product_variants").select("*", { count: "exact", head: true })
      .eq("is_default", true);
    expect(products).toBe(defaultVariants);
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
