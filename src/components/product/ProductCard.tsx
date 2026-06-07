"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DealScoreBadge } from "./DealScoreBadge";
import { formatRupiah, getDiscountPercent } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { TrendingDown } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = getDiscountPercent(product.lowestPrice, product.highestPrice);

  return (
    <Link href={`/product/${product.slug}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          {discount > 5 && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              <TrendingDown className="h-3 w-3" />
              {discount}%
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <p className="mb-1 text-xs text-muted-foreground">
            {product.category}
          </p>
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">
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
