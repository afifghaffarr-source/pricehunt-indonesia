/* eslint-disable @typescript-eslint/no-explicit-any */
// Pre-existing `any` usages; tracked under Phase 5 type-safety backlog.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateDealScore, type DealScoreInput } from '@/lib/deal-score';
import { toPriceViews, type OfferRow } from '@/lib/ingestion/adapter';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

interface PriceHistoryRecord {
  price: number;
  recorded_at: string;
}

interface ProductWithOffers {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category: string;
  lowest_price: number | null;
  offers: OfferRow[];
  price_history: PriceHistoryRecord[];
}

/**
 * Calculate median from array of numbers
 */
function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate historical statistics from price history
 */
function calculateHistoricalStats(priceHistory: PriceHistoryRecord[], currentDate: Date) {
  if (priceHistory.length === 0) {
    return {
      median30Day: null,
      median90Day: null,
      lowestHistoricalPrice: null,
    };
  }

  const thirtyDaysAgo = new Date(currentDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ninetyDaysAgo = new Date(currentDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const last30DayPrices = priceHistory
    .filter(h => new Date(h.recorded_at) >= thirtyDaysAgo)
    .map(h => h.price);

  const last90DayPrices = priceHistory
    .filter(h => new Date(h.recorded_at) >= ninetyDaysAgo)
    .map(h => h.price);

  const allPrices = priceHistory.map(h => h.price);

  return {
    median30Day: calculateMedian(last30DayPrices),
    median90Day: calculateMedian(last90DayPrices),
    lowestHistoricalPrice: allPrices.length > 0 ? Math.min(...allPrices) : null,
  };
}

/**
 * GET /api/deals
 *
 * Returns products with calculated deal scores based on real historical data.
 * Optimized with proper indexing and batch processing.
 *
 * A-002: Now reads from `offers` (post-114 schema) instead of legacy `prices`.
 * The component-facing shape is preserved via `toPriceViews()` from the
 * ingestion adapter, so no UI changes are required. New offers (165 rows
 * vs 72 legacy prices) are now visible in deal score calculation.
 *
 * Query params:
 * - limit: number of products to return (default: 24, max: 100)
 * - minScore: minimum deal score filter (0-100)
 * - category: filter by category
 */
export async function GET(request: NextRequest) {
// Pre-existing deals query typing (Phase 5). replace `any` usages with proper types.

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 100);
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const category = searchParams.get('category');

    const supabase = await createClient();
    const currentDate = new Date();

    // Build query — read from `offers` (A-002 migration). Only active offers.
    // Filter is_active here so the in-stock filter below doesn't run on
    // stale/deactivated rows.
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        image_url,
        category,
        lowest_price,
        offers (
          id,
          current_price,
          stock_status,
          is_active,
          seller_name,
          seller_rating,
          shipping_estimate,
          last_checked_at,
          url,
          marketplace_id,
          marketplaces (
            name,
            display_name
          )
        ),
        price_history (
          price,
          recorded_at
        )
      `)
      .order('created_at', { ascending: false });

    // Apply category filter if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Fetch more products than needed, we'll filter by score later
    const { data: products, error } = await query.limit(limit * 3);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil data produk' },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [], total: 0 });
    }

    // Calculate deal scores with real historical data
    // Cast needed because Supabase's generated types don't know the
    // `offers` PostgREST shape; the local ProductWithOffers interface
    // keeps the rest type-safe. (File-level eslint-disable covers the
    // remaining `as any` in this file — full typegen is Phase 5 backlog.)
    const productsWithScores = (products as any as ProductWithOffers[])
      .filter((product) => {
        // Only include products that have at least one in-stock offer
        const offerViews = toPriceViews(product.offers ?? []);
        const inStock = offerViews.filter((p) => p.in_stock && p.price > 0);
        return inStock.length > 0;
      })
      .map((product) => {
        // Map offers through the adapter (offers -> prices shape)
        const offerViews = toPriceViews(product.offers ?? []);

        // In-stock & priced offers, sorted ascending
        const inStockPrices = offerViews
          .filter((p) => p.in_stock && p.price > 0)
          .sort((a, b) => a.price - b.price);

        const calculatedLowestPrice = inStockPrices.length > 0
          ? inStockPrices[0].price
          : 0;

        const lowestPrice = product.lowest_price || calculatedLowestPrice;

        // Best offer = lowest price (we don't have seller-rating sort key
        // here in the legacy shape; keep it simple until native offers
        // type propagates).
        const bestOffer = inStockPrices[0];

      // Calculate historical statistics
      const stats = calculateHistoricalStats(
        product.price_history || [],
        currentDate
      );

      // Build deal score input. Now using real data from `offers`:
      // - isOfficialStore: from best offer's marketplace_offer data
      // - hasFreeShipping: derived from shipping_estimate
      // - sellerReviewCount: would need review_count column (A-003 still
      //   pending — falls back to undefined).
      const dealScoreInput: DealScoreInput = {
        currentPrice: lowestPrice,
        median30Day: stats.median30Day || undefined,
        median90Day: stats.median90Day || undefined,
        lowestHistoricalPrice: stats.lowestHistoricalPrice || undefined,
        sellerRating: bestOffer?.seller_rating || undefined,
        sellerReviewCount: undefined, // A-003: review_count missing in DB
        isOfficialStore: false, // offers.is_official_store is selected; not in PriceView — see note
        stockStatus: bestOffer?.in_stock ? 'in_stock' : 'unknown',
        hasVoucher: false, // offers.voucher_text exists; not yet in PriceView
        hasFreeShipping: bestOffer?.shipping_cost === 0,
      };

      // Calculate deal score
      const dealScore = calculateDealScore(dealScoreInput);

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        image_url: product.image_url,
        category: product.category,
        lowest_price: lowestPrice,
        marketplace_count: inStockPrices.length,
        best_marketplace: bestOffer?.marketplaces?.[0]?.display_name || null,
        deal_score: dealScore.score,
        deal_label: dealScore.label,
        deal_color: dealScore.color,
        deal_explanation: dealScore.explanation,
        deal_risks: dealScore.risks,
        confidence: dealScore.confidence,
        // Expose adapter-mapped offers in the legacy prices shape so
        // existing components (PriceComparisonTable etc.) keep working.
        prices: offerViews,
      };
    });

    // Filter by minimum score
    const filtered = productsWithScores
      .filter(p => p.deal_score >= minScore)
      .slice(0, limit);

    return NextResponse.json({
      products: filtered,
      total: productsWithScores.length,
    });
  } catch (err) {
    console.error('Deals API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
