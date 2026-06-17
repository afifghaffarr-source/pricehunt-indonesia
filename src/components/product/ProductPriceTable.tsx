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
}

/**
 * Price comparison table with offer metadata enrichment.
 *
 * Replaces 67 lines of inline mapping logic in product page.
 * Centralizes the "match prices to offers + map DB enums to component enums" logic.
 */
export function ProductPriceTable({
  prices,
  offers,
  productId,
  productName,
  lowestPrice,
}: ProductPriceTableProps) {
  const enrichedPrices = enrichPricesWithOffers(prices, offers);
  const inStockCount = prices.filter((p) => p.inStock).length;

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
