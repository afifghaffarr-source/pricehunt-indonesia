import type { SupabaseClient } from "@supabase/supabase-js";
import { variantNormalize } from "./variant-normalizer";
import { listVariantsForProduct, getDefaultVariantForProduct } from "@/lib/supabase/product-variants";

export type VariantResolutionAction =
  | "matched_existing"
  | "created_new"
  | "unchanged_no_variant"
  | "cap_exceeded";

export interface ResolvedVariant {
  variantId: string;
  action: VariantResolutionAction;
  variantSlug: string | null;
}

const MAX_VARIANTS_PER_PRODUCT = 100;

function variantSlug(productSlug: string, parts: { storage: string | null; color: string | null; connectivity: string | null }): string {
  const slugParts = [parts.storage, parts.color, parts.connectivity].filter(Boolean);
  if (slugParts.length === 0) return "default";
  return `${productSlug}-${slugParts.join("-").toLowerCase().replace(/\s+/g, "")}`;
}

async function getProductSlug(supabase: SupabaseClient, productId: string): Promise<string> {
  // Defensive: the resolver must survive partial Supabase client shapes
  // (e.g. unit-test stubs that only mock the insert chain) and transient
  // network failures during the products-table lookup. Falls back to
  // the generic "product" slug so the create-new path still completes.
  try {
    const { data, error } = await supabase
      .from("products")
      .select("slug")
      .eq("id", productId)
      .maybeSingle();
    if (error || !data) return "product";
    return (data as { slug: string }).slug;
  } catch {
    return "product";
  }
}

export async function resolveAndAttachVariant(
  supabase: SupabaseClient,
  productId: string,
  variantText: string | null | undefined,
): Promise<ResolvedVariant> {
  // 1. No variant text → return default variant
  if (!variantText || !variantText.trim()) {
    const def = await getDefaultVariantForProduct(productId);
    if (def) return { variantId: def.id, action: "unchanged_no_variant", variantSlug: def.slug };
    return { variantId: "", action: "unchanged_no_variant", variantSlug: null };
  }

  // 2. Normalize
  const normalized = variantNormalize(variantText);

  // 3. Look for an existing variant matching 3 attributes (storage, color, connectivity)
  const existing = await listVariantsForProduct(productId);
  const candidate = existing.find((v) =>
    (v.storage      ?? null) === (normalized.storage      ?? null) &&
    (v.color        ?? null) === (normalized.color        ?? null) &&
    (v.connectivity ?? null) === (normalized.connectivity ?? null)
  );
  if (candidate) {
    return {
      variantId: candidate.id,
      action: "matched_existing",
      variantSlug: candidate.slug,
    };
  }

  // 4. Cap check
  if (existing.length >= MAX_VARIANTS_PER_PRODUCT) {
    console.warn(`[variant-resolver] product ${productId} hit 100-variant cap; falling back to default`);
    const fallback = existing.find((v) => v.is_default) ?? existing[0];
    return {
      variantId: fallback.id,
      action: "cap_exceeded",
      variantSlug: fallback.slug,
    };
  }

  // 5. Create new variant row
  const productSlug = await getProductSlug(supabase, productId);
  const slug = variantSlug(productSlug, {
    storage: normalized.storage,
    color: normalized.color,
    connectivity: normalized.connectivity,
  });

  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id:   productId,
      slug:         slug,
      storage:      normalized.storage,
      color:        normalized.color,
      connectivity: normalized.connectivity,
      sku:          null,
      is_default:   false,
      is_active:    true,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(`[variant-resolver] insert failed: ${error?.message ?? "unknown"}`);
    const def = await getDefaultVariantForProduct(productId);
    return {
      variantId: def?.id ?? "",
      action: "unchanged_no_variant",
      variantSlug: def?.slug ?? null,
    };
  }

  return {
    variantId: (data as { id: string }).id,
    action: "created_new",
    variantSlug: slug,
  };
}
