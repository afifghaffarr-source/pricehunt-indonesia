"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DealScoreBadge } from "./DealScoreBadge";
import { formatRupiah, getDiscountPercent } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { TrendingDown, Package } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = getDiscountPercent(product.lowestPrice, product.highestPrice);

  return (
    <Link href={`/product/${product.slug}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/50">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
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
              <span className="text-xs text-muted-foreground/70 line-through">
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
