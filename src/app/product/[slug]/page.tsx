import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, mockProducts } from "@/lib/mock-data";
import { formatRupiah, getDiscountPercent, getMarketplaceName } from "@/lib/utils";
import { PriceComparisonTable } from "@/components/product/PriceComparisonTable";
import { PriceHistoryChart } from "@/components/product/PriceHistoryChart";
import { DealScoreBadge } from "@/components/product/DealScoreBadge";
import { MarketplaceBadge } from "@/components/product/MarketplaceBadge";
import { AIAdvisorCard } from "@/components/ai/AIAdvisorCard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  TrendingDown,
  Store,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return mockProducts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Produk Tidak Ditemukan" };
  return {
    title: product.name,
    description: `Bandingkan harga ${product.name} dari ${product.prices.filter((p) => p.inStock).length} marketplace. Harga mulai ${formatRupiah(product.lowestPrice)}.`,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const discount = getDiscountPercent(product.lowestPrice, product.highestPrice);
  const cheapestMarketplace = product.prices
    .filter((p) => p.inStock)
    .sort((a, b) => a.price - b.price)[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/search" className={buttonVariants({ variant: "ghost" }) + " mb-6"}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          {discount > 5 && (
            <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white">
              <TrendingDown className="h-4 w-4" />
              Hemat {discount}%
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {product.prices
              .filter((p) => p.inStock)
              .map((p) => (
                <MarketplaceBadge
                  key={p.marketplace}
                  marketplace={p.marketplace}
                />
              ))}
          </div>

          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {product.name}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {product.category}
          </p>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatRupiah(product.lowestPrice)}
            </span>
            {discount > 5 && (
              <span className="text-lg text-muted-foreground line-through">
                {formatRupiah(product.highestPrice)}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <DealScoreBadge score={product.dealScore} />
            {cheapestMarketplace && (
              <Badge variant="outline" className="gap-1">
                <Store className="h-3 w-3" />
                Termurah di{" "}
                {getMarketplaceName(cheapestMarketplace.marketplace)}
              </Badge>
            )}
          </div>

          <Separator className="my-6" />

          <p className="text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Spesifikasi</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-8">
        <AIAdvisorCard verdict={product.aiVerdict} />

        <div>
          <h2 className="mb-4 text-xl font-bold">Perbandingan Harga</h2>
          <PriceComparisonTable
            prices={product.prices}
            lowestPrice={product.lowestPrice}
          />
        </div>

        <PriceHistoryChart data={product.priceHistory} />
      </div>
    </div>
  );
}
