/**
 * Extract a variant label from an offer title (or any free-text product name).
 *
 * The scrape pipeline populates `offers.variant` only when the marketplace
 * exposes a structured variant field. In practice most Indonesian
 * marketplaces encode storage/color in the **title** instead (e.g.
 * "iPhone 15 Pro Max 256GB - Official Store"). This helper recovers a
 * synthetic variant string from the title so `resolveAndAttachVariant`
 * can create or match the right `product_variants` row.
 *
 * The logic reuses `variantNormalize` (the same parser the ingestion
 * route uses for the `variant` field) — we just feed it the title. When
 * the title has no parseable storage/color/connectivity tokens, we return
 * `null` so the caller falls back to the default variant (same behaviour
 * as a missing `variant` field).
 */
import { variantNormalize } from "./variant-normalizer";

/**
 * Returns a compact variant label from a title, or `null` when no
 * variant-defining attributes are found.
 *
 * Examples:
 *   "iPhone 15 Pro Max 256GB - Official Store" → "256GB"
 *   "Samsung Galaxy S24 Ultra 256GB Titanium Black" → "256GB Black"
 *   "Product from Tokopedia" → null
 */
export function extractVariantFromTitle(
  title: string | null | undefined,
): string | null {
  if (!title || !title.trim()) return null;

  const n = variantNormalize(title);

  const parts = [
    n.storage,
    n.color,
    n.connectivity,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : null;
}
