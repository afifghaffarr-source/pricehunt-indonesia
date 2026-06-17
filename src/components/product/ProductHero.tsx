"use client";

import { Badge } from "@/components/ui/badge";
import { MarketplaceBadge } from "@/components/product/MarketplaceBadge";
import { DealScoreBadge } from "@/components/product/DealScoreBadge";
import { WishlistButton } from "@/components/product/WishlistButton";
import { VexoImageFallback } from "@/components/common/VexoImageFallback";
import { formatRupiah, getMarketplaceName } from "@/lib/utils";
import { Store, TrendingDown } from "lucide-react";
import type { Product, Marketplace } from "@/lib/types";

interface ProductHeroProps {
  product: Product;
  discount: number;
  /** LIVE in-stock lowest price (already computed in page.tsx). BUG-03 fix:
   *  don't trust product.lowestPrice — that column can drift from the
   *  product_prices_view that the table and "Termurah di X" badge read. */
  liveLowestPrice: number;
  /** LIVE in-stock highest price (cross-marketplace range, not a strikethrough
   *  reference). Used for the line-through next to the live lowest. */
  liveHighestPrice: number;
  cheapestMarketplace?: { marketplace: Marketplace; price: number; inStock: boolean };
  isWishlisted: boolean;
}

/**
 * Hero section for the product detail page.
 *
 * Shows product image (with LCP optimization), name, category badge,
 * price (with discount), marketplace badges, and wishlist button.
 *
 * Extracted from src/app/product/[slug]/page.tsx to reduce page complexity
 * (was lines 174-250 of a 533-line page).
 */
export function ProductHero({
  product,
  discount,
  liveLowestPrice,
  liveHighestPrice,
  cheapestMarketplace,
  isWishlisted,
}: ProductHeroProps) {
  const inStockPrices = product.prices.filter((p) => p.inStock);

  return (
    <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
      {/* Product Image - LCP element, optimized for hero size */}
      <div className="group relative h-48 w-48 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-muted to-muted/50 shadow-lg transition-all duration-300 hover:shadow-lg sm:h-56 sm:w-56">
        <VexoImageFallback
          productName={product.name}
          fallbackSrc={product.imageUrl}
          alt={product.name}
          fill
          priority
          sizes="(max-width: 640px) 192px, 224px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        {discount > 5 && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-2.5 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-[1.01]">
            <TrendingDown className="h-3.5 w-3.5 animate-pulse" />
            Hemat {discount}%
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Product Info */}
      <div className="flex-1">
        <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
          {product.name}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs transition-colors hover:bg-primary/10">
            {product.category}
          </Badge>
          {inStockPrices.slice(0, 4).map((p) => (
            <MarketplaceBadge key={p.marketplace} marketplace={p.marketplace} />
          ))}
        </div>

        {/* Price with premium gradient background */}
        <div className="mt-4 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-4 backdrop-blur-sm">
          <div className="flex items-baseline gap-3">
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-3xl font-bold text-transparent">
              {formatRupiah(liveLowestPrice)}
            </span>
            {discount > 5 && (
              <span className="text-lg text-muted-foreground/70 line-through">
                {formatRupiah(liveHighestPrice)}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DealScoreBadge score={product.dealScore} />
            {cheapestMarketplace && (
              <Badge variant="outline" className="gap-1 text-xs transition-all hover:bg-primary/5 hover:scale-[1.01]">
                <Store className="h-3 w-3" />
                Termurah di {getMarketplaceName(cheapestMarketplace.marketplace)}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <WishlistButton productId={product.id} initialIsWishlisted={isWishlisted} />
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {product.description}
        </p>
      </div>
    </div>
  );
}
