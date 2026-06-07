import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlugFromDB, isProductInWishlist, getProductAlerts } from "@/lib/supabase/data";
import { getUser } from "@/lib/supabase/auth";
import { formatRupiah, getDiscountPercent, getMarketplaceName } from "@/lib/utils";
import { PriceComparisonTable } from "@/components/product/PriceComparisonTable";
import { PriceHistoryChart } from "@/components/product/PriceHistoryChart";
import { DealScoreBadge } from "@/components/product/DealScoreBadge";
import { MarketplaceBadge } from "@/components/product/MarketplaceBadge";
import { WishlistButton } from "@/components/product/WishlistButton";
import { PriceAlertForm } from "@/components/product/PriceAlertForm";
import { VexoDealVerdict } from "@/components/ai/VexoDealVerdict";
import { VexoProductSummary } from "@/components/ai/VexoProductSummary";
import { VexoImageFallback } from "@/components/common/VexoImageFallback";
import { SocialShare } from "@/components/product/SocialShare";
import { ProductRecommendations } from "@/components/product/ProductRecommendations";
import { PredictionSection } from "./PredictionSection";
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

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugFromDB(slug);
  if (!product) return { title: "Produk Tidak Ditemukan" };
  return {
    title: product.name,
    description: `Bandingkan harga ${product.name} dari ${product.prices.filter((p) => p.inStock).length} marketplace. Harga mulai ${formatRupiah(product.lowestPrice)}.`,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlugFromDB(slug);

  if (!product) {
    notFound();
  }

  const user = await getUser();

  let isWishlisted = false;
  let userAlerts: { id: string; target_price: number; is_active: boolean }[] = [];

  if (user) {
    const [wishlisted, alerts] = await Promise.all([
      isProductInWishlist(user.id, product.id),
      getProductAlerts(user.id, product.id),
    ]);
    isWishlisted = wishlisted;
    userAlerts = alerts;
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
          <VexoImageFallback
            productName={product.name}
            fallbackSrc={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
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

          <div className="mt-4">
            <WishlistButton
              productId={product.id}
              initialIsWishlisted={isWishlisted}
            />
          </div>

          <div className="mt-3">
            <SocialShare
              url={`${process.env.NEXT_PUBLIC_APP_URL || "https://pricehunt-indonesia.vercel.app"}/product/${slug}`}
              title={`${product.name} - mulai ${formatRupiah(product.lowestPrice)}`}
            />
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
                  <p className="text-sm font-medium">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-8">
        <VexoDealVerdict
          productName={product.name}
          lowestPrice={product.lowestPrice}
          highestPrice={product.highestPrice}
          dealScore={product.dealScore}
          marketplaceCount={product.prices.filter((p) => p.inStock).length}
          aiVerdict={product.aiVerdict}
        />

        <VexoProductSummary
          productName={product.name}
          category={product.category}
          specs={product.specs}
        />

        <PredictionSection productId={product.id} />

        <PriceAlertForm
          productId={product.id}
          currentLowestPrice={product.lowestPrice}
          initialAlerts={userAlerts}
        />

        <div>
          <h2 className="mb-4 text-xl font-bold">Perbandingan Harga</h2>
          <PriceComparisonTable
            prices={product.prices}
            lowestPrice={product.lowestPrice}
          />
        </div>

        {product.priceHistory.length > 0 && (
          <PriceHistoryChart data={product.priceHistory} />
        )}

        <ProductRecommendations
          currentProductId={product.id}
          category={product.category}
        />
      </div>
    </div>
  );
}
