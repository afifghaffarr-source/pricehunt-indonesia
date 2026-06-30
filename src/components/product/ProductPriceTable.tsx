import { DataTransparencyDisclaimer } from "@/components/product/DataTransparencyDisclaimer";
import { EnhancedPriceTable } from "@/components/product/EnhancedPriceTable";
import { enrichPricesWithOffers, type OfferRow } from "@/lib/offer-mapping";
import type { MarketplacePrice } from "@/lib/types";

interface ProductPriceTableProps {
  prices: MarketplacePrice[];
  offers: OfferRow[];
  productId: string;
  productName: string;
  lowestPrice: number;
  /**
   * Phase 3: ID of the variant the user picked via `?v=<slug>`. When set
   * to the default variant's id (or null/undefined), the table includes
   * all offers WITHOUT a variant_id as well (legacy + future default
   * rows). When set to a non-default variant, only offers whose
   * variantId matches are shown.
   */
  selectedVariantId?: string | null;
  /**
   * Phase 3: id of the product's default variant. Used to decide whether
   * a null-variant offer should be included in the current filter.
   * If omitted and `selectedVariantId` is set, the default-aware filter
   * assumes "any null-variant offer is default-bound" which is true
   * post-Phase 1 backfill (migration 138) but caller should pass the
   * real id for clarity.
   */
  defaultVariantId?: string | null;
}

/**
 * Price comparison table with offer metadata enrichment.
 *
 * Replaces 67 lines of inline mapping logic in product page.
 * Centralizes the "match prices to offers + map DB enums to component enums" logic.
 *
 * Phase 3: filters `prices` by `selectedVariantId` before enrichment.
 *
 * Filter semantics:
 *   - `selectedVariantId == defaultVariantId` (or no selection): show all
 *     offers whose variantId matches OR is null. Null-variant offers are
 *     treated as "default variant" because that's the invariant after
 *     migration 138's backfill.
 *   - `selectedVariantId != defaultVariantId`: show only offers whose
 *     variantId matches. Null-variant offers are excluded — they belong
 *     to the default bucket, not the user's chosen variant.
 */
export function ProductPriceTable({
  prices,
  offers,
  productId,
  productName,
  lowestPrice,
  selectedVariantId,
  defaultVariantId,
}: ProductPriceTableProps) {
  // Apply variant filter BEFORE enrichment so the table reflects exactly
  // the offers that belong to the selected variant.
  const filteredPrices = filterPricesByVariant(
    prices,
    selectedVariantId ?? null,
    defaultVariantId ?? null,
  );
  const enrichedPrices = enrichPricesWithOffers(filteredPrices, offers);
  const inStockCount = filteredPrices.filter((p) => p.inStock).length;

  return (
    <section id="prices" className="scroll-mt-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Perbandingan Harga</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cek harga dari {inStockCount} marketplace dan temukan penawaran terbaik
        </p>
      </div>

      <DataTransparencyDisclaimer className="mb-4" variant="default" />

      <EnhancedPriceTable
        prices={enrichedPrices}
        lowestPrice={lowestPrice}
        productId={productId}
        productName={productName}
      />
    </section>
  );
}

/**
 * Pure filter helper exported for unit tests. Filtering rules:
 *   - No selection (selectedVariantId null) -> return all offers
 *     unchanged (page is in the "show me everything" mode).
 *   - Selection matches the default variant -> include matching offers
 *     AND all null-variant offers (default-bucket legacy rows).
 *   - Selection is a non-default variant -> only matching offers.
 *
 * `defaultVariantId === null` is treated as "no special default logic"
 * because every Phase-1+ product has a default row, so reaching this
 * branch means the product is pre-backfill and we can't tell null-variants
 * apart. In that case we fall back to "only matching offers" which
 * matches the safer (more honest) UX.
 */
export function filterPricesByVariant(
  prices: MarketplacePrice[],
  selectedVariantId: string | null,
  defaultVariantId: string | null,
): MarketplacePrice[] {
  if (!selectedVariantId) return prices;
  const isDefaultSelection =
    defaultVariantId !== null && selectedVariantId === defaultVariantId;
  if (isDefaultSelection) {
    return prices.filter(
      (p) => p.variantId === selectedVariantId || p.variantId == null,
    );
  }
  return prices.filter((p) => p.variantId === selectedVariantId);
}
