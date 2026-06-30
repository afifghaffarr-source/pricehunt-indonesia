/**
 * Pure variant helpers — safe to import from BOTH server and client
 * components. Do not add any React/Next imports here; it must remain
 * a pure data utility so `chipLabelForVariant` can be called during
 * SSR (in the product page server component) without throwing the
 * "Attempted to call X from the server" error that fires when a
 * server component imports from a 'use client' module.
 *
 * Phase 7 fix (2026-06-30): the function used to live inside
 * `ProductVariantPicker.tsx`, which is `'use client'`. The product
 * page server component imported it to compute the `label` field for
 * `variantStatsRows`. In production builds that import resolves to a
 * client-reference proxy, and the call from the server throws —
 * silently killing the entire `<VariantPriceStatsTable>` render
 * (the parent `try { ... }` block in dev swallows it, the prod build
 * just renders nothing for that section).
 *
 * Moving the function to a neutral file lets the server component
 * import the real implementation.
 */

import type { ProductVariant } from "@/types/product-types";

/**
 * Best human-readable chip label for a variant. Falls back through:
 *   storage → color → connectivity → slug → "Default"
 *
 * The fallback order matches what users care about for the same
 * product (size first, then finish, then a stable slug, then the
 * literal "Default" string for the placeholder row).
 */
export function chipLabelForVariant(v: ProductVariant): string {
  return v.storage ?? v.color ?? v.connectivity ?? v.slug ?? "Default";
}
