import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlugFromDB, isProductInWishlist, getProductAlerts, getProductOffers } from "@/lib/supabase/data";
import { getUser } from "@/lib/supabase/auth";
import { formatRupiah, getDiscountPercent } from "@/lib/utils";
import { calculatePriceStats } from "@/lib/product-price-stats";
import { ProductHero } from "@/components/product/ProductHero";
import { ProductQuickNav } from "@/components/product/ProductQuickNav";
import { ProductPriceTable } from "@/components/product/ProductPriceTable";
import { PriceHistoryChart } from "@/components/product/PriceHistoryChart";
import { PriceAlertForm } from "@/components/product/PriceAlertForm";
import { PushNotificationButton } from "@/components/common/PushNotificationButton";
import { VexoDealVerdict } from "@/components/ai/VexoDealVerdict";
import { VexoProductSummary } from "@/components/ai/VexoProductSummary";
import { SocialShare } from "@/components/product/SocialShare";
import { ProductRecommendations } from "@/components/product/ProductRecommendations";
import { ProductMatcher } from "@/components/product/ProductMatcher";
import { ReviewsList } from "@/components/product/ReviewsList";
import { PredictionSection } from "./PredictionSection";
import { BuyOrWaitDecision } from "@/components/product/BuyOrWaitDecision";
import { FakeDiscountAlert } from "@/components/product/FakeDiscountAlert";
import { TotalCostCalculator } from "@/components/product/TotalCostCalculator";
import { TrustSignalsBar } from "@/components/product/TrustSignalsBar";
import { BestOfferCard } from "@/components/product/BestOfferCard";
import { PriceComparisonPreview } from "@/components/product/PriceComparisonPreview";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { JsonLd, productJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Keep page dynamic (per-product data) but revalidate aggressively so
// Next.js renders metadata into <head> instead of streaming into the body.
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
    alternates: {
      canonical: `/product/${slug}`,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlugFromDB(slug);

  if (!product) {
    notFound();
  }

  // If product has no prices at all, show not found
  // (product exists in DB but has no offers - stale data)
  if (product.lowestPrice === 0 && product.prices.length === 0) {
    notFound();
  }

  const user = await getUser();

  let isWishlisted = false;
  let userAlerts: { id: string; target_price: number; is_active: boolean }[] = [];

  // Fetch real offers data with trust metadata
  const offers = await getProductOffers(product.id);

  if (user) {
    const [wishlisted, alerts] = await Promise.all([
      isProductInWishlist(user.id, product.id),
      getProductAlerts(user.id, product.id),
    ]);
    isWishlisted = wishlisted;
    userAlerts = alerts;
  }

  const discount = getDiscountPercent(product.lowestPrice, product.highestPrice);
  const inStockPrices = product.prices.filter((p) => p.inStock);
  const cheapestMarketplace = [...inStockPrices].sort((a, b) => a.price - b.price)[0];
  // Use the cheapest in-stock offer's official-store flag for the buy/wait
  // recommendation. Falls back to false only if no in-stock offers exist.
  const isOfficialStoreOnCheapest = cheapestMarketplace?.isOfficialStore ?? false;

  // Price statistics for buy/wait decision and fake discount detection
  const priceStats = calculatePriceStats({ priceHistory: product.priceHistory });

  // Prepare marketplace prices for TotalCostCalculator
  const marketplacePrices = product.prices
    .filter((p) => p.inStock)
    .map((p) => ({
      marketplace: p.marketplace,
      price: p.price,
      url: p.url,
    }));

  // Show fake discount alert if there's a significant discount
  const shouldShowFakeDiscountAlert = discount > 10 && product.highestPrice > product.lowestPrice;

  return (
    <>
      <JsonLd data={productJsonLd(product, product.prices)} key="product" />
      <JsonLd data={breadcrumbJsonLd(product)} key="breadcrumb" />
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <Link href="/search" className={buttonVariants({ variant: "ghost" }) + " mb-4"}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Link>

        {/* Trust Signals - Build confidence immediately. v1.5.24: pass real
            lastUpdated from MAX(prices[].lastUpdated) instead of hardcoded
            undefined. The bar now renders nothing if no real data exists. */}
        <TrustSignalsBar
          marketplaceCount={product.prices.filter((p) => p.inStock).length}
          lastUpdated={inStockPrices.reduce<string | undefined>(
            (max, p) => (!max || p.lastUpdated > max ? p.lastUpdated : max),
            undefined,
          )}
          trackerCount={undefined}
          autoCheckFrequency="1 hari"
          className="mb-6"
        />

        {/* Hero: image + name + price + wishlist */}
        <ProductHero
          product={product}
          discount={discount}
          cheapestMarketplace={cheapestMarketplace}
          isWishlisted={isWishlisted}
        />

        <ProductQuickNav />

        <div className="space-y-12">
          {/* 1. DECISION CARD */}
          <section id="decision" className="scroll-mt-20">
            <BuyOrWaitDecision
              currentPrice={product.lowestPrice}
              originalPrice={discount > 5 ? product.highestPrice : undefined}
              lowestHistoricalPrice={priceStats.lowestHistoricalPrice}
              median30Day={priceStats.median30Day}
              median90Day={priceStats.median90Day}
              sellerRating={cheapestMarketplace?.sellerRating}
              sellerReviewCount={cheapestMarketplace?.sellerReviewCount}
              isOfficialStore={isOfficialStoreOnCheapest}
              stockStatus={product.prices.some((p) => p.inStock) ? "in_stock" : "out_of_stock"}
            />
          </section>

          {/* 2. BEST OFFER CARDS */}
          <BestOfferCard
            offers={product.prices.map((p) => ({
              marketplace: p.marketplace,
              price: p.price,
              url: p.url,
              inStock: p.inStock,
              isOfficialStore: p.isOfficialStore ?? false,
            }))}
            lowestPrice={product.lowestPrice}
          />

          {/* 3. PRICE COMPARISON PREVIEW */}
          <PriceComparisonPreview
            prices={product.prices.map((p) => ({
              marketplace: p.marketplace,
              price: p.price,
              url: p.url,
              inStock: p.inStock,
            }))}
            lowestPrice={product.lowestPrice}
            highestPrice={product.highestPrice}
          />

          {/* 4. FAKE DISCOUNT ALERT (conditional) */}
          {shouldShowFakeDiscountAlert && (
            <FakeDiscountAlert
              currentPrice={product.lowestPrice}
              originalPrice={product.highestPrice}
              lowestHistoricalPrice={priceStats.lowestHistoricalPrice}
              median30Day={priceStats.median30Day}
              median90Day={priceStats.median90Day}
              discountPercent={discount}
            />
          )}

          {/* 5. DEAL VERDICT */}
          <VexoDealVerdict
            productName={product.name}
            lowestPrice={product.lowestPrice}
            highestPrice={product.highestPrice}
            dealScore={product.dealScore}
            marketplaceCount={product.prices.filter((p) => p.inStock).length}
            aiVerdict={product.aiVerdict}
          />

          {/* 6. PRICE COMPARISON TABLE (with offer enrichment) */}
          <ProductPriceTable
            prices={product.prices}
            offers={offers}
            productId={product.id}
            productName={product.name}
            lowestPrice={product.lowestPrice}
          />

          {/* 7. TOTAL COST CALCULATOR */}
          {marketplacePrices.length > 0 && (
            <section id="total-cost" className="scroll-mt-20">
              <TotalCostCalculator prices={marketplacePrices} />
            </section>
          )}

          {/* 8. PRICE HISTORY CHART */}
          {product.priceHistory.length > 0 && (
            <PriceHistoryChart data={product.priceHistory} />
          )}

          {/* 9. PRICE ALERT FORM + PUSH NOTIFICATION */}
          <section id="alerts" className="scroll-mt-20">
            <PriceAlertForm
              productId={product.id}
              currentLowestPrice={product.lowestPrice}
              initialAlerts={userAlerts}
            />

            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1.5">
                    Dapatkan Notifikasi Instan
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Aktifkan notifikasi push untuk mendapat peringatan langsung saat harga turun ke target Anda.
                  </p>
                </div>
                <div className="shrink-0">
                  <PushNotificationButton />
                </div>
              </div>
            </div>
          </section>

          {/* 10. PRODUCT SUMMARY - AI-generated insights */}
          <VexoProductSummary
            productName={product.name}
            category={product.category}
            specs={product.specs}
          />

          {/* 11. PREDICTION - Future price predictions */}
          <PredictionSection productId={product.id} />

          {/* 12. REVIEWS */}
          <section id="reviews" className="scroll-mt-20">
            <ReviewsList productId={product.id} currentUserId={user?.id} />
          </section>

          {/* 13. SIMILAR PRODUCTS */}
          <ProductRecommendations
            currentProductId={product.id}
            category={product.category}
          />

          {/* 14. PRODUCT MATCHER */}
          <ProductMatcher productName={product.name} />

          {/* 15. PRODUCT DETAILS - Specs & sharing (conditional) */}
          {Object.keys(product.specs).length > 0 && (
            <div className="rounded-xl border bg-muted/30 p-6">
              <h3 className="mb-4 text-lg font-bold">Detail Produk</h3>

              <div className="mb-6">
                <h4 className="mb-3 text-sm font-semibold">Spesifikasi</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="rounded-md bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">{key}</p>
                      <p className="text-sm font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <h4 className="mb-3 text-sm font-semibold">Bagikan produk ini</h4>
                <SocialShare
                  url={`${process.env.NEXT_PUBLIC_APP_URL || "https://www.bijakbeli.web.id"}/product/${slug}`}
                  title={`${product.name} - mulai ${formatRupiah(product.lowestPrice)}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sticky Action Bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <div className="mx-auto flex max-w-7xl gap-2">
            <a href="#alerts" className={buttonVariants({ variant: "default", size: "sm" }) + " flex-1 text-xs"}>
              Pantau Harga
            </a>
            <a href="#prices" className={buttonVariants({ variant: "outline", size: "sm" }) + " flex-1 text-xs"}>
              Lihat Harga
            </a>
            {cheapestMarketplace?.url && (
              <Link
                href={cheapestMarketplace.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "secondary", size: "sm" }) + " flex-1 text-xs"}
              >
                Beli Sekarang
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
