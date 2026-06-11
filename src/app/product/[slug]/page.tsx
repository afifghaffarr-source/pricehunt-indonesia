import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlugFromDB, isProductInWishlist, getProductAlerts } from "@/lib/supabase/data";
import { getUser } from "@/lib/supabase/auth";
import { formatRupiah, getDiscountPercent, getMarketplaceName } from "@/lib/utils";
import { EnhancedPriceTable } from "@/components/product/EnhancedPriceTable";
import { PriceHistoryChart } from "@/components/product/PriceHistoryChart";
import { DealScoreBadge } from "@/components/product/DealScoreBadge";
import { MarketplaceBadge } from "@/components/product/MarketplaceBadge";
import { WishlistButton } from "@/components/product/WishlistButton";
import { PriceAlertForm } from "@/components/product/PriceAlertForm";
import { PushNotificationButton } from "@/components/common/PushNotificationButton";
import { VexoDealVerdict } from "@/components/ai/VexoDealVerdict";
import { VexoProductSummary } from "@/components/ai/VexoProductSummary";
import { VexoImageFallback } from "@/components/common/VexoImageFallback";
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
import { ValidationStatusAlert } from "@/components/product/ValidationStatusAlert";
import { DataTransparencyDisclaimer } from "@/components/product/DataTransparencyDisclaimer";
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

  // Calculate price statistics from history for intelligent recommendations
  const calculatePriceStats = () => {
    if (product.priceHistory.length === 0) {
      return {
        median30Day: undefined,
        median90Day: undefined,
        lowestHistoricalPrice: undefined,
      };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Extract all prices from price history (prices is Record<Marketplace, number | null>)
    const extractPrices = (historyPoint: typeof product.priceHistory[0]) => {
      return Object.values(historyPoint.prices).filter((p): p is number => p !== null);
    };

    const prices30Day = product.priceHistory
      .filter((h) => new Date(h.date) >= thirtyDaysAgo)
      .flatMap(extractPrices)
      .sort((a, b) => a - b);

    const prices90Day = product.priceHistory
      .filter((h) => new Date(h.date) >= ninetyDaysAgo)
      .flatMap(extractPrices)
      .sort((a, b) => a - b);

    const allPrices = product.priceHistory.flatMap(extractPrices);

    const getMedian = (arr: number[]) => {
      if (arr.length === 0) return undefined;
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
    };

    return {
      median30Day: getMedian(prices30Day),
      median90Day: getMedian(prices90Day),
      lowestHistoricalPrice: allPrices.length > 0 ? Math.min(...allPrices) : undefined,
    };
  };

  const priceStats = calculatePriceStats();

  // Prepare marketplace prices for TotalCostCalculator
  const marketplacePrices = product.prices
    .filter((p) => p.inStock)
    .map((p) => ({
      marketplace: getMarketplaceName(p.marketplace),
      price: p.price,
      url: p.url,
    }));

  // Check if we should show fake discount alert (if there's a significant discount)
  const shouldShowFakeDiscountAlert = discount > 10 && product.highestPrice > product.lowestPrice;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <Link href="/search" className={buttonVariants({ variant: "ghost" }) + " mb-4"}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Link>

      {/* Trust Signals - Build confidence immediately */}
      <TrustSignalsBar
        marketplaceCount={product.prices.filter((p) => p.inStock).length}
        lastUpdated={undefined}
        trackerCount={undefined}
        className="mb-6"
      />

      {/* Compact Hero - Focus on essentials */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Product Image - Compact */}
        <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-56 sm:w-56">
          <VexoImageFallback
            productName={product.name}
            fallbackSrc={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 640px) 192px, 224px"
            className="object-cover"
          />
          {discount > 5 && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
              <TrendingDown className="h-3.5 w-3.5" />
              Hemat {discount}%
            </div>
          )}
        </div>

        {/* Product Info - Compact */}
        <div className="flex-1">
          <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
            {product.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {product.category}
            </Badge>
            {product.prices
              .filter((p) => p.inStock)
              .slice(0, 4)
              .map((p) => (
                <MarketplaceBadge key={p.marketplace} marketplace={p.marketplace} />
              ))}
          </div>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatRupiah(product.lowestPrice)}
            </span>
            {discount > 5 && (
              <span className="text-lg text-muted-foreground line-through">
                {formatRupiah(product.highestPrice)}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DealScoreBadge score={product.dealScore} />
            {cheapestMarketplace && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Store className="h-3 w-3" />
                Termurah di {getMarketplaceName(cheapestMarketplace.marketplace)}
              </Badge>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <WishlistButton
              productId={product.id}
              initialIsWishlisted={isWishlisted}
            />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {product.description}
          </p>
        </div>
      </div>

      {/* Quick Navigation - Improved microcopy */}
      <nav className="mb-8 flex gap-2 overflow-x-auto rounded-2xl border bg-gradient-to-r from-background to-muted/20 p-2 text-sm shadow-sm" aria-label="Navigasi cepat">
        <a href="#decision" className="shrink-0 rounded-full px-4 py-2 font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
          Kapan Beli?
        </a>
        <a href="#prices" className="shrink-0 rounded-full px-4 py-2 font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
          Bandingkan Harga
        </a>
        <a href="#total-cost" className="shrink-0 rounded-full px-4 py-2 font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
          Hitung Total Bayar
        </a>
        <a href="#alerts" className="shrink-0 rounded-full px-4 py-2 font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
          Pantau Harga
        </a>
        <a href="#reviews" className="shrink-0 rounded-full px-4 py-2 font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
          Ulasan Pembeli
        </a>
      </nav>

      <div className="space-y-12">
        {/* 1. DECISION CARD - ELEVATED & PROMINENT */}
        <section id="decision" className="scroll-mt-20">
        <BuyOrWaitDecision
          currentPrice={product.lowestPrice}
          originalPrice={discount > 5 ? product.highestPrice : undefined}
          lowestHistoricalPrice={priceStats.lowestHistoricalPrice}
          median30Day={priceStats.median30Day}
          median90Day={priceStats.median90Day}
          stockStatus={product.prices.some((p) => p.inStock) ? 'in_stock' : 'out_of_stock'}
        />
        </section>

        {/* 2. BEST OFFER CARDS - Actionable top offers */}
        <BestOfferCard
          offers={product.prices.map((p) => ({
            marketplace: p.marketplace,
            price: p.price,
            url: p.url,
            inStock: p.inStock,
            isOfficialStore: false,
          }))}
          lowestPrice={product.lowestPrice}
        />

        {/* 3. PRICE COMPARISON PREVIEW - Quick horizontal scroll comparison */}
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

        {/* 4. FAKE DISCOUNT ALERT - If suspicious discount detected */}
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

        {/* 5. DEAL VERDICT - AI analysis context */}
        <VexoDealVerdict
          productName={product.name}
          lowestPrice={product.lowestPrice}
          highestPrice={product.highestPrice}
          dealScore={product.dealScore}
          marketplaceCount={product.prices.filter((p) => p.inStock).length}
          aiVerdict={product.aiVerdict}
        />

        {/* 6. PRICE COMPARISON TABLE - Compare across marketplaces */}
        <section id="prices" className="scroll-mt-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Perbandingan Harga
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cek harga dari {product.prices.filter((p) => p.inStock).length} marketplace dan temukan penawaran terbaik
            </p>
          </div>
          
          {/* Data Transparency Disclaimer */}
          <DataTransparencyDisclaimer className="mb-4" variant="default" />
          
          {/* Enhanced Price Table with metadata */}
          <EnhancedPriceTable
            prices={product.prices.map(p => ({
              ...p,
              // Mock enhanced metadata until migration 110 applied
              offer_id: undefined,
              confidence_score: 75, // Mock: Medium confidence
              confidence_label: "dipercaya",
              validation_status: "verified" as const,
              last_seen_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // Mock: 6 hours ago
              source: "api_scraper" as const,
            }))}
            lowestPrice={product.lowestPrice}
            productId={product.id}
            productName={product.name}
          />
        </section>

        {/* 7. TOTAL COST CALCULATOR - Real cost analysis */}
        {marketplacePrices.length > 0 && (
          <section id="total-cost" className="scroll-mt-20">
            <TotalCostCalculator prices={marketplacePrices} />
          </section>
        )}

        {/* 8. PRICE HISTORY CHART - Visual price trends */}
        {product.priceHistory.length > 0 && (
          <PriceHistoryChart data={product.priceHistory} />
        )}

        {/* 9. PRICE ALERT FORM - Let users track price drops */}
        <section id="alerts" className="scroll-mt-20">
          <PriceAlertForm
            productId={product.id}
            currentLowestPrice={product.lowestPrice}
            initialAlerts={userAlerts}
          />
          
          {/* Push notification prompt for instant alerts */}
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

        {/* 13. SIMILAR PRODUCTS - Help users explore alternatives */}
        <ProductRecommendations
          currentProductId={product.id}
          category={product.category}
        />

        {/* 14. PRODUCT MATCHER - Advanced search tool */}
        <ProductMatcher
          productName={product.name}
        />

        {/* 15. PRODUCT DETAILS - Expandable specs & sharing */}
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
              url={`${process.env.NEXT_PUBLIC_APP_URL || "https://bijakbeli-app.vercel.app"}/product/${slug}`}
              title={`${product.name} - mulai ${formatRupiah(product.lowestPrice)}`}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar - Quick access to key actions */}
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
  );
}
