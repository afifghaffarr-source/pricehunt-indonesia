"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DealScoreBadge } from "./DealScoreBadge";
import { formatRupiah, getDiscountPercent } from "@/lib/utils";
import type { Product } from "@/lib/types";
import type { VariantFilterState } from "@/components/search/VariantFilterChips";
import { TrendingDown, Package, Filter } from "lucide-react";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  /**
   * When a variant filter is active, render a small badge on the card
   * so the user can see at a glance which variants are being filtered.
   * Shows the joined axis:value pairs from the filter. Hidden when the
   * filter is empty.
   */
  activeVariantFilter?: VariantFilterState;
}

/** Render a compact "Filter: 256GB · Midnight" badge from a state. */
function buildFilterBadgeText(filter: VariantFilterState): string | null {
  const parts: string[] = [];
  for (const s of filter.storage) parts.push(s);
  for (const c of filter.color) parts.push(c);
  for (const cn of filter.connectivity) parts.push(cn);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function ProductCard({
  product,
  priority = false,
  activeVariantFilter,
}: ProductCardProps) {
  const discount = getDiscountPercent(product.lowestPrice, product.highestPrice);
  const filterBadgeText = activeVariantFilter
    ? buildFilterBadgeText(activeVariantFilter)
    : null;

  return (
    <Link href={`/product/${product.slug}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/50">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              priority={priority}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          {discount > 5 && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-transform group-hover:scale-[1.02]">
              <TrendingDown className="h-3 w-3 animate-pulse" />
              {discount}%
            </div>
          )}
        </div>
        <CardContent className="p-4">
          {filterBadgeText && (
            <div
              data-testid="active-filter-badge"
              className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
            >
              <Filter className="h-2.5 w-2.5" />
              Filter: {filterBadgeText}
            </div>
          )}
          <p className="mb-1 text-xs text-muted-foreground transition-colors group-hover:text-primary">
            {product.category}
          </p>
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {formatRupiah(product.lowestPrice)}
            </span>
            {discount > 5 && (
              <span className="text-xs text-muted-foreground line-through">
                {formatRupiah(product.highestPrice)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <DealScoreBadge score={product.dealScore} />
            <span className="text-xs text-muted-foreground">
              {product.prices.filter((p) => p.inStock).length} marketplace
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
