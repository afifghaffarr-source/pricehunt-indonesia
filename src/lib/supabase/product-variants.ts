/**
 * Query helpers for the `product_variants` table (Phase 1 refactor).
 *
 * Source of truth shape: src/types/product-types.ts → ProductVariant.
 * Consumed by src/lib/supabase/products.ts (T7) and the variant-aware
 * pages routes once those land.
 */
import { createClient } from "@/lib/supabase/server";
import type { ProductVariant } from "@/types/product-types";

/**
 * List all variants for a product, default first.
 * Returns [] if product has no variants (shouldn't happen post-backfill).
 */
export async function listVariantsForProduct(productId: string): Promise<ProductVariant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as ProductVariant[];
}

/**
 * Look up a variant by parent product slug + variant slug.
 * Used by Phase 3 deep-link URLs like /product/<slug>/v/<vslug>.
 */
export async function getVariantBySlug(
  productSlug: string,
  variantSlug: string,
): Promise<ProductVariant | null> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("slug", productSlug)
    .single();
  if (!product) return null;

  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", (product as { id: string }).id)
    .eq("slug", variantSlug)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProductVariant;
}

/**
 * Fetch the default variant (is_default = true) for a product.
 * Falls back to the first variant row if no row is flagged default.
 */
export async function getDefaultVariantForProduct(
  productId: string,
): Promise<ProductVariant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProductVariant;
}
