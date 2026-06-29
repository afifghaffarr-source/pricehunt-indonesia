/**
 * TDD: Smoke tests for src/lib/supabase/product-variants.ts (Task 6).
 *
 * Mocks @/lib/supabase/server entirely — no real Supabase / cookies
 * dependency. Pure smoke tests so the red-green cycle here is about
 * "does the module export the three functions?" rather than query correctness
 * (which is exercised by later Supabase integration tests / E2E).
 *
 * Mock shape: a single recursive builder supporting eq/order as chainables
 * and single/maybeSingle as terminals. Chainable methods return the same
 * builder so any depth works (brief's original mock only supported
 * 1-deep eq → 2-deep order).
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => {
  const nullTerminal = Promise.resolve({ data: null, error: null });
  const makeBuilder = () => {
    const builder: Record<string, unknown> = {};
    builder.eq = () => builder;
    builder.order = () => builder;
    builder.single = () => nullTerminal;
    builder.maybeSingle = () => nullTerminal;
    return builder;
  };
  return {
    createClient: vi.fn(async () => ({
      from: (_table: string) => ({ select: () => makeBuilder() }),
    })),
  };
});
import { listVariantsForProduct, getDefaultVariantForProduct, getVariantBySlug } from "@/lib/supabase/product-variants";
describe("product-variants helpers", () => {
  it("listVariantsForProduct returns array", async () => { expect(await listVariantsForProduct("00000000-0000-0000-0000-000000000001")).toEqual([]); });
  it("getDefaultVariantForProduct returns null on unmocked variant", async () => { expect(await getDefaultVariantForProduct("00000000-0000-0000-0000-000000000001")).toBeNull(); });
});
