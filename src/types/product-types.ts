/**
 * Phase 1 schema refactor: TypeScript types for the product_variants table.
 *
 * Source of truth: supabase/migrations/136_create_product_variants.sql.
 * Keep this file in lockstep with that migration — column additions,
 * renames, or nullability changes must be reflected here in the same commit.
 *
 * Consumers:
 *   - src/lib/supabase/product-variants.ts (T6)
 *   - src/lib/supabase/products.ts           (T7)
 */

/**
 * Row shape for the `product_variants` table.
 *
 * Field names mirror the SQL columns verbatim (snake_case) so the type can
 * be used directly as the inferred return type of Supabase queries without
 * an extra mapping layer.
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  slug: string | null;
  storage: string | null;
  connectivity: string | null;
  color: string | null;
  sku: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Slim app-level view: just enough for callers to look up the default
 * variant per product without dragging in the full `Product` shape
 * (prices, specs, imageUrl, …).
 *
 * Consumed by T7's product fetchers to denormalise the "default variant"
 * pointer in a single round-trip.
 */
export interface ProductWithDefaultVariant {
  productId: string;
  productSlug: string;
  defaultVariantId: string | null;
  defaultVariantSlug: string | null;
}
