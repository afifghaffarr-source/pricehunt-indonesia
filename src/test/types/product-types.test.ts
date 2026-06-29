/**
 * TDD: Type-import smoke test for src/types/product-types.ts (Task 5).
 *
 * Pure type-level test — if the module is missing, both tsc and vitest
 * will fail at the import line. Used to drive creation of
 * src/types/product-types.ts via red-green cycle.
 */
import { describe, expect, it } from "vitest";
import type { ProductVariant } from "@/types/product-types";

describe("src/types/product-types — ProductVariant", () => {
  it("matches migration 136 column shape (snake_case)", () => {
    const v: ProductVariant = {
      id: "00000000-0000-0000-0000-000000000001",
      product_id: "00000000-0000-0000-0000-000000000002",
      slug: "default",
      storage: null,
      connectivity: null,
      color: null,
      sku: null,
      is_default: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(v.is_default).toBe(true);
    expect(v.is_active).toBe(true);
    expect(v.product_id).toBe("00000000-0000-0000-0000-000000000002");
    expect(v.slug).toBe("default");
  });
});
