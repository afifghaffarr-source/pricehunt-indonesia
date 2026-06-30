import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getProductBySlugFromDB,
  isProductInWishlist,
  getProductAlerts,
  getProductOffers,
  getProductVariants,
  fetchVariantPriceStats,
  fetchVariantPriceHistory,
} from "@/lib/supabase/data";
import { getVariantBySlug } from "@/lib/supabase/product-variants";
import { getUser } from "@/lib/supabase/auth";
import { formatRupiah, getDiscountPercent } from "@/lib/utils";
import { calculatePriceStats } from "@/lib/product-price-stats";
import { ProductHero } from "@/components/product/ProductHero";
import { ProductQuickNav } from "@/components/product/ProductQuickNav";
import { ProductPriceTable } from "@/components/product/ProductPriceTable";
import {
  PriceHistoryChart,
  type VariantChartSeries,
} from "@/components/product/PriceHistoryChart";
import {
  VariantPriceStatsTable,
  type VariantPriceStatsRow,
} from "@/components/product/VariantPriceStatsTable";
import { chipLabelForVariant } from "@/lib/product-variants/labels";
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
import { ArrowLeft, Clock } from "lucide-react";
import { ProductVariantPicker } from "./ProductVariantPicker";
import { ProductVariantBottomSheet } from "./ProductVariantBottomSheet";

interface PageProps {
  params: Promise<{ slug: string }>;
  // Phase 3: `?v=<variantSlug>` selects the variant for filtering the
  // price table + offers. Next.js 16 makes searchParams a Promise — we
  // must `await` it (see AGENTS.md "This is NOT the Next.js you know").
  searchParams: Promise<{ v?: string }>;
}

// Keep page dynamic (per-product data) but revalidate aggressively so
// Next.js renders metadata into <head> instead of streaming into the body.
export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // searchParams is read for cache-keying the metadata so the
  // description reflects the currently-selected variant. We don't
  // need to await it inside an inline IIFE since it's already
  // awaited above.
  const { v: variantSlug } = await searchParams;
  const product = await getProductBySlugFromDB(slug);
  if (!product) return { title: "Produk Tidak Ditemukan" };

  // Resolve the selected variant (or fall back to default) so we can
  // filter the prices that the meta description mentions. Unknown
  // `?v=` silently falls back to default (no 404 from metadata either).
  const productWithVariant = product as typeof product & {
    defaultVariant: import("@/types/product-types").ProductVariant | null;
  };
  const selectedVariant = await resolveSelectedVariant(
    slug,
    productWithVariant.defaultVariant,
    variantSlug,
  );
  const filteredPrices = filterPricesByVariant(
    product.prices,
    selectedVariant?.id ?? null,
    productWithVariant.defaultVariant?.id ?? null,
  );

  // BUG-03: compute live lowest from in-stock offers so the meta description
  // matches what the page actually renders (don't trust the stale stored
  // product.lowestPrice column).
  const liveLowest = filteredPrices.filter((p) => p.inStock);
  const liveLowestPrice =
    liveLowest.length > 0 ? Math.min(...liveLowest.map((p) => p.price)) : product.lowestPrice;
  const inStockCount = filteredPrices.filter((p) => p.inStock).length;
  return {
    title: product.name,
    description: `Bandingkan harga ${product.name} dari ${inStockCount} marketplace. Harga mulai ${formatRupiah(liveLowestPrice)}.`,
    alternates: {
      canonical: `/product/${slug}`,
    },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, { v: variantSlug }] = await Promise.all([params, searchParams]);

  // Wrap DB fetch in try/catch so any Supabase / network / transform error
  // gracefully falls through to notFound.tsx ("Produk Tidak Ditemukan")
  // instead of bubbling up to error.tsx ("Produk Tidak Dapat Dimuat"),
  // which feels broken to users.
  let product: Awaited<ReturnType<typeof getProductBySlugFromDB>> = null;
  try {
    product = await getProductBySlugFromDB(slug);
  } catch (e) {
    // Log server-side; respond with a clean 404 for the visitor.
    if (process.env.NODE_ENV !== "production") {
      console.error("[product/[slug]] failed to load product:", e);
    }
    notFound();
  }

  if (!product) {
    notFound();
  }

  // Local cast: Phase 1 plumbing attaches `defaultVariant` at runtime in
  // getProductBySlugFromDB, but the global `Product` type is left clean
  // until Phase 3's picker UI lands and promotes `defaultVariant` to a
  // first-class field. See src/lib/supabase/products.ts:158 inline cast.
  const productWithVariant = product as Awaited<ReturnType<typeof getProductBySlugFromDB>> & {
    defaultVariant: import("@/types/product-types").ProductVariant | null;
  };

  // If product has no prices at all, fall through to not-found.
  // (Product exists in DB but has zero linked offers — likely a freshly
  // seeded catalog entry awaiting its first scrape. Showing 404 is
  // confusing here; instead we show a friendly "coming soon" empty
  // state so the URL still resolves and the visitor knows the product
  // exists but has no prices yet.)
  const hasNoOffers = product.lowestPrice === 0 && product.prices.length === 0;
  if (hasNoOffers) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <Link href="/search" className={buttonVariants({ variant: "ghost" }) + " mb-4"}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Link>
        <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">{product.name}</h1>
          <p className="mb-1 text-sm font-medium text-muted-foreground">
            {product.category}
          </p>
          <p className="mt-4 mb-2 text-base font-semibold">
            Belum ada harga yang tersedia
          </p>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Produk ini ada di katalog kami dan sedang menunggu data harga dari marketplace. Cek kembali beberapa hari lagi, atau jelajahi produk serupa.
          </p>
          <div className="flex gap-3">
            <Link href="/search" className={buttonVariants({ variant: "default" })}>
              Cari Produk Lain
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const user = await getUser();

  let isWishlisted = false;
  let userAlerts: { id: string; target_price: number; is_active: boolean }[] = [];

  // Phase 3: resolve the selected variant from `?v=<slug>` BEFORE fetching
  // offers so we can filter the offers read in one pass. Unknown slugs
  // silently fall back to the default variant.
  const selectedVariant = await resolveSelectedVariant(
    slug,
    productWithVariant.defaultVariant,
    variantSlug,
  );

  // Fetch all variants (for the picker) and the offers (for the table)
  // in parallel. The offers query is product-scoped; the variant filter
  // is applied in-memory in `enrichPricesWithOffers` (via the
  // `selectedVariantId` prop on ProductPriceTable).
  //
  // Phase 7: also fetch per-variant stats + per-variant history so the
  // page can render a "Harga per Varian" card and a variant-aware
  // price-history chart. Both fan out from the same `variants` list and
  // share the variant-id → label mapping, so a single parallel batch is
  // the right shape.
  const [variants, offers, variantStats, variantHistory] = await Promise.all([
    getProductVariants(product.id),
    getProductOffers(product.id),
    fetchVariantPriceStats(product.id),
    fetchVariantPriceHistory(product.id, 30),
  ]);

  // Build the variant stats rows. We map variant_id → ProductVariant so we
  // can show a friendly label and a deep-link slug for each row. Variants
  // with no stats row are dropped (the stats table only renders variants
  // that actually have offers — a variant with zero offers is more
  // confusing than helpful).
  const variantById = new Map(variants.map((v) => [v.id, v]));
  const variantStatsRows: VariantPriceStatsRow[] = variantStats
    .map((s) => {
      const v = variantById.get(s.variantId);
      if (!v) return null; // orphaned stats row (variant deleted) — skip
      const slug = v.slug ?? v.id;
      return {
        ...s,
        label: chipLabelForVariant(v),
        slug,
      };
    })
    .filter((r): r is VariantPriceStatsRow => r !== null);

  // Build the chart series. We only include variants that have BOTH
  // history data AND a matching ProductVariant row (the slug is needed
  // for the legend label). Sort by cheapest-min so the legend reads
  // "256GB (cheapest) → 1TB (most expensive)" — same order as the
  // stats table for visual continuity.
  const sortedByMinPrice = [...variantStatsRows].sort((a, b) => {
    const aHas = a.minPrice != null;
    const bHas = b.minPrice != null;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (!aHas && !bHas) return 0;
    return (a.minPrice as number) - (b.minPrice as number);
  });
  // Phase 7 — Color palette for variant lines. 8 distinct hues that
  // work on both light and dark backgrounds. The list is intentionally
  // longer than 5 because products with 5+ variants (e.g. iPhone with
  // 128/256/512/1TB across 4-5 colors) are common.
  const variantPalette = [
    "#10b981", // emerald-500
    "#0ea5e9", // sky-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#14b8a6", // teal-500
    "#f97316", // orange-500
  ];
  const chartSeries: VariantChartSeries[] = sortedByMinPrice
    .filter((row) => variantHistory[row.variantId]?.length)
    .map((row, idx) => ({
      id: row.variantId,
      label: row.label,
      color: variantPalette[idx % variantPalette.length],
      data: variantHistory[row.variantId],
    }));

  // Show the variant-mode chart when at least 2 variants have history
  // data — a single-line chart is the same shape as the marketplace
  // view but with one fewer axis of information, so we keep the
  // marketplace view as the default there.
  const showVariantChart = chartSeries.length >= 2;

  if (user) {
    const [wishlisted, alerts] = await Promise.all([
      isProductInWishlist(user.id, product.id),
      getProductAlerts(user.id, product.id),
    ]);
    isWishlisted = wishlisted;
    userAlerts = alerts;
  }

  // LIVE price stats — computed from in-stock offers in the FILTERED
  // (variant-scoped) product.prices. This is the key change in Phase 3:
  // every downstream number (hero price, decision card, chart, table)
  // now reflects the selected variant, not the merged product total.
  const filteredPrices = filterPricesByVariant(
    product.prices,
    selectedVariant?.id ?? null,
    productWithVariant.defaultVariant?.id ?? null,
  );
  const inStockPrices = filteredPrices.filter((p) => p.inStock);
  const liveLowestPrice =
    inStockPrices.length > 0 ? Math.min(...inStockPrices.map((p) => p.price)) : 0;
  const liveHighestPrice =
    inStockPrices.length > 0 ? Math.max(...inStockPrices.map((p) => p.price)) : 0;
  const discount = getDiscountPercent(liveLowestPrice, liveHighestPrice);
  const cheapestMarketplace = [...inStockPrices].sort((a, b) => a.price - b.price)[0];
  // Use the cheapest in-stock offer's official-store flag for the buy/wait
  // recommendation. Falls back to false only if no in-stock offers exist.
  const isOfficialStoreOnCheapest = cheapestMarketplace?.isOfficialStore ?? false;

  // Price statistics for buy/wait decision and fake discount detection.
  // Computed from the full price history (variant-agnostic) — historical
  // data is rolled up at the product level, not the variant level.
  const priceStats = calculatePriceStats({ priceHistory: product.priceHistory });

  // Prepare marketplace prices for TotalCostCalculator (filtered by variant).
  const marketplacePrices = filteredPrices
    .filter((p) => p.inStock)
    .map((p) => ({
      marketplace: p.marketplace,
      price: p.price,
      url: p.url,
    }));

  // Show fake discount alert if there's a significant discount
  const shouldShowFakeDiscountAlert = discount > 10 && liveHighestPrice > liveLowestPrice;

  return (
    <>
      <JsonLd data={productJsonLd(product, filteredPrices)} key="product" />
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
          marketplaceCount={inStockPrices.length}
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
          liveLowestPrice={liveLowestPrice}
          liveHighestPrice={liveHighestPrice}
          cheapestMarketplace={cheapestMarketplace}
          isWishlisted={isWishlisted}
        />

        {/* Phase 3 — Variant picker.
            Mobile (< md): collapsed into a single button + bottom sheet.
            Desktop (≥ md): inline chip group.
            Both write `?v=<slug>` to the URL; the server re-renders with
            filtered offers. We render the picker even when there's only
            one variant so the user gets a single "Default" pill — the
            brief explicitly allows this. */}
        <div className="mb-4 md:hidden">
          <ProductVariantBottomSheet
            productSlug={slug}
            selectedVariant={selectedVariant}
            variants={variants}
          />
        </div>
        <div className="mb-6 hidden md:block">
          <ProductVariantPicker
            productSlug={slug}
            selectedVariant={selectedVariant}
            variants={variants}
          />
        </div>

        <ProductQuickNav />

        <div className="space-y-12">
          {/* 1. DECISION CARD */}
          <section id="decision" className="scroll-mt-20">
            <BuyOrWaitDecision
              currentPrice={liveLowestPrice}
              originalPrice={discount > 5 ? liveHighestPrice : undefined}
              lowestHistoricalPrice={priceStats.lowestHistoricalPrice}
              median30Day={priceStats.median30Day}
              median90Day={priceStats.median90Day}
              sellerRating={cheapestMarketplace?.sellerRating}
              sellerReviewCount={cheapestMarketplace?.sellerReviewCount}
              isOfficialStore={isOfficialStoreOnCheapest}
              stockStatus={filteredPrices.some((p) => p.inStock) ? "in_stock" : "out_of_stock"}
            />
          </section>

          {/* 2. BEST OFFER CARDS */}
          <BestOfferCard
            offers={filteredPrices.map((p) => ({
              marketplace: p.marketplace,
              price: p.price,
              url: p.url,
              inStock: p.inStock,
              isOfficialStore: p.isOfficialStore ?? false,
            }))}
            lowestPrice={liveLowestPrice}
          />

          {/* 3. PRICE COMPARISON PREVIEW */}
          <PriceComparisonPreview
            prices={filteredPrices.map((p) => ({
              marketplace: p.marketplace,
              price: p.price,
              url: p.url,
              inStock: p.inStock,
            }))}
            lowestPrice={liveLowestPrice}
            highestPrice={liveHighestPrice}
          />

          {/* 4. FAKE DISCOUNT ALERT (conditional) */}
          {shouldShowFakeDiscountAlert && (
            <FakeDiscountAlert
              currentPrice={liveLowestPrice}
              originalPrice={liveHighestPrice}
              lowestHistoricalPrice={priceStats.lowestHistoricalPrice}
              median30Day={priceStats.median30Day}
              median90Day={priceStats.median90Day}
              discountPercent={discount}
            />
          )}

          {/* 5. DEAL VERDICT */}
          <VexoDealVerdict
            productName={product.name}
            lowestPrice={liveLowestPrice}
            highestPrice={liveHighestPrice}
            dealScore={product.dealScore}
            marketplaceCount={inStockPrices.length}
            aiVerdict={product.aiVerdict}
          />

          {/* 6. PRICE COMPARISON TABLE (with offer enrichment + variant filter) */}
          <ProductPriceTable
            prices={product.prices}
            offers={offers}
            productId={product.id}
            productName={product.name}
            lowestPrice={liveLowestPrice}
            selectedVariantId={selectedVariant?.id ?? null}
            defaultVariantId={productWithVariant.defaultVariant?.id ?? null}
          />

          {/* Phase 7 — VARIANT PRICE STATS TABLE
              Rendered right after the price table so the user has just
              seen the per-marketplace breakdown and can now scan the
              per-variant summary. Skipped when there's nothing to show
              (single-variant products with no offers, or products whose
              variants all collapsed to the default bucket). */}
          {variantStatsRows.length >= 2 && (
            <VariantPriceStatsTable
              rows={variantStatsRows}
              selectedSlug={selectedVariant?.slug ?? null}
              productSlug={slug}
            />
          )}

          {/* 7. TOTAL COST CALCULATOR */}
          {marketplacePrices.length > 0 && (
            <section id="total-cost" className="scroll-mt-20">
              <TotalCostCalculator prices={marketplacePrices} />
            </section>
          )}

          {/* 8. PRICE HISTORY CHART (Phase 7 — variant-mode preferred when
              at least 2 variants have history data, otherwise falls back
              to the original per-marketplace view). */}
          {(showVariantChart || product.priceHistory.length > 0) && (
            <PriceHistoryChart
              data={product.priceHistory}
              series={showVariantChart ? chartSeries : undefined}
            />
          )}

          {/* 9. PRICE ALERT FORM + PUSH NOTIFICATION */}
          <section id="alerts" className="scroll-mt-20">
            <PriceAlertForm
              productId={product.id}
              currentLowestPrice={liveLowestPrice}
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
                  title={`${product.name} - mulai ${formatRupiah(liveLowestPrice)}`}
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

/**
 * Resolve the variant selected via `?v=<slug>`. Resolution rules:
 *   - `?v` is empty / missing: return the product's default variant.
 *   - `?v=<known slug>` for the parent product: return that variant.
 *   - `?v=<unknown slug>`: silently fall back to the default variant
 *     (no 404 — the brief requires graceful degradation).
 *
 * The default variant is `productWithVariant.defaultVariant` which
 * `getProductBySlugFromDB` already denormalises; this helper handles
 * the URL lookup + fallback chain.
 */
async function resolveSelectedVariant(
  productSlug: string,
  defaultVariant: import("@/types/product-types").ProductVariant | null,
  variantSlug: string | undefined,
): Promise<import("@/types/product-types").ProductVariant | null> {
  if (!variantSlug) return defaultVariant;
  const variant = await getVariantBySlug(productSlug, variantSlug);
  return variant ?? defaultVariant;
}

/**
 * Server-side filter applied to `product.prices` for the live lowest /
 * highest / hero computations. Mirrors `ProductPriceTable`'s in-component
 * filter so the hero shows the same number as the table. The table also
 * runs the filter independently to keep the component decoupled (so it
 * can be reused outside the page).
 */
function filterPricesByVariant(
  prices: import("@/lib/types").MarketplacePrice[],
  selectedVariantId: string | null,
  defaultVariantId: string | null,
) {
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
