import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductVariant } from "@/types/product-types";

// Stub `next/headers` cookies so the server client can be constructed in
// vitest (no Next.js request scope). The admin client does the real
// reads/writes; the server client is only used by the resolver's internal
// helpers, which we further override below to also use the admin client
// (the server client's anon key is RLS-restricted on `product_variants`
// and would otherwise see zero rows).
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [] }),
}));

// `resolveAndAttachVariant` internally calls `listVariantsForProduct` and
// `getDefaultVariantForProduct` from `@/lib/supabase/product-variants`,
// each of which constructs its own `@/lib/supabase/server` client (anon
// key). The `product_variants` table is RLS-restricted to authenticated
// reads, so the anon client always sees an empty list — that breaks the
// "match" roundtrip. Override the two helpers so they read through the
// admin client (RLS-bypassing). The actual `insert` is still done by the
// resolver against the admin client, so the create-new path remains a
// true live-Supabase integration test.
const adminHolder = vi.hoisted(() => ({
  client: null as SupabaseClient | null,
}));

vi.mock("@/lib/supabase/product-variants", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/product-variants")>(
    "@/lib/supabase/product-variants",
  );
  return {
    ...actual,
    listVariantsForProduct: async (productId: string): Promise<ProductVariant[]> => {
      if (!adminHolder.client) return [];
      const { data, error } = await adminHolder.client
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error || !data) return [];
      return data as ProductVariant[];
    },
    getDefaultVariantForProduct: async (productId: string): Promise<ProductVariant | null> => {
      if (!adminHolder.client) return null;
      const { data, error } = await adminHolder.client
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .eq("is_default", true)
        .maybeSingle();
      if (error || !data) return null;
      return data as ProductVariant;
    },
  };
});

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAndAttachVariant } from "@/lib/ingestion/variant-resolver";

// Skip the test entirely if no service-role key (e.g. CI without secrets).
const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!hasKey)("variant-resolver integration (live Supabase)", () => {
  let supabase: SupabaseClient;
  let testProductId: string;
  let testSlug: string | null = null;

  beforeAll(() => {
    supabase = createAdminClient() as unknown as SupabaseClient;
    // Share the admin client with the mocked read helpers.
    adminHolder.client = supabase;
  });

  beforeAll(async () => {
    // Find a product that has NO existing 512GB variant so the create-new
    // path actually creates a row (instead of hitting a unique-constraint
    // conflict on a pre-existing variant slug). We pick the first such
    // product deterministically.
    const { data: prods, error: pErr } = await supabase
      .from("products")
      .select("id")
      .order("id", { ascending: true })
      .limit(50);
    if (pErr || !prods || prods.length === 0) {
      throw new Error("No products in DB — cannot run integration test");
    }

    for (const p of prods as Array<{ id: string }>) {
      const { data: existing } = await supabase
        .from("product_variants")
        .select("id, product_id")
        .eq("product_id", p.id)
        .ilike("slug", "%512gb%")
        .limit(1);
      if (!existing || existing.length === 0) {
        testProductId = p.id;
        return;
      }
    }
    throw new Error(
      "No product found without an existing 512GB variant — cannot run integration test",
    );
  });

  afterAll(async () => {
    // Cleanup: delete by actual generated slug captured in the test.
    if (testProductId && testSlug) {
      await supabase
        .from("product_variants")
        .delete()
        .match({ product_id: testProductId, slug: testSlug } as Record<string, unknown>);
    }
  });

  it("creates a new variant row + matches subsequent call", async () => {
    // First call: creates new variant
    const r1 = await resolveAndAttachVariant(supabase, testProductId, "512GB Unikorn");
    expect(r1.action).toBe("created_new");
    expect(r1.variantId).toBeTruthy();
    expect(r1.variantSlug).toMatch(/512gb/);

    // Capture the actual slug the resolver generated so afterAll can clean it up
    testSlug = r1.variantSlug;

    // Second call: matches existing (exact attributes)
    const r2 = await resolveAndAttachVariant(supabase, testProductId, "512GB Unikorn");
    expect(r2.action).toBe("matched_existing");
    expect(r2.variantId).toBe(r1.variantId);
  });
});
