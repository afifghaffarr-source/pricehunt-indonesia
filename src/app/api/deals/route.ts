import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateDealScore, type DealScoreInput } from '@/lib/deal-score';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

interface PriceHistoryRecord {
  price: number;
  recorded_at: string;
}

interface ProductWithHistory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category: string;
  lowest_price: number | null;
  prices: Array<{
    id: string;
    price: number;
    seller: string | null;
    seller_rating: number | null;
    in_stock: boolean;
    marketplace_id: string;
    marketplaces: Array<{
      name: string;
      display_name: string;
    }>;
  }>;
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
 * Query params:
 * - limit: number of products to return (default: 24, max: 100)
 * - minScore: minimum deal score filter (0-100)
 * - category: filter by category
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 100);
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const category = searchParams.get('category');

    const supabase = await createClient();
    const currentDate = new Date();

    // Build query - include prices to calculate lowest_price if needed
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        image_url,
        category,
        lowest_price,
        prices (
          id,
          price,
          seller,
          seller_rating,
          in_stock,
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
    const productsWithScores = products
      .filter((product: any) => {
        // Only include products that have at least one in-stock price
        const inStockPrices = (product.prices || []).filter((p: any) => p.in_stock && p.price > 0);
        return inStockPrices.length > 0;
      })
      .map((product: any) => {
        // Get in-stock prices
        const inStockPrices = (product.prices || [])
          .filter((p: any) => p.in_stock && p.price > 0)
          .sort((a: any, b: any) => a.price - b.price);
        
        // Calculate lowest price from actual prices if stored value is null/0
        const calculatedLowestPrice = inStockPrices.length > 0 
          ? inStockPrices[0].price 
          : 0;
        
        const lowestPrice = product.lowest_price || calculatedLowestPrice;
        
        // Get best offer (lowest price with highest seller rating)
        const bestOffer = inStockPrices[0];

      // Calculate historical statistics
      const stats = calculateHistoricalStats(
        product.price_history || [],
        currentDate
      );

      // Build deal score input
      const dealScoreInput: DealScoreInput = {
        currentPrice: lowestPrice,
        median30Day: stats.median30Day || undefined,
        median90Day: stats.median90Day || undefined,
        lowestHistoricalPrice: stats.lowestHistoricalPrice || undefined,
        sellerRating: bestOffer?.seller_rating || undefined,
        sellerReviewCount: undefined, // TODO: Add review count to schema
        isOfficialStore: false, // TODO: Add official store flag to schema
        stockStatus: bestOffer?.in_stock ? 'in_stock' : 'unknown',
        hasVoucher: false, // TODO: Add voucher detection
        hasFreeShipping: false, // TODO: Add shipping detection
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
        best_marketplace: bestOffer?.marketplaces?.display_name || null,
        deal_score: dealScore.score,
        deal_label: dealScore.label,
        deal_color: dealScore.color,
        deal_explanation: dealScore.explanation,
        deal_risks: dealScore.risks,
        confidence: dealScore.confidence,
        breakdown: dealScore.breakdown,
        historical_stats: {
          median30Day: stats.median30Day,
          median90Day: stats.median90Day,
          lowestPrice: stats.lowestHistoricalPrice,
          dataPoints: product.price_history?.length || 0,
        },
      };
    });

    // Filter by minimum score and sort by deal score (highest first)
    const filteredProducts = productsWithScores
      .filter(p => p.deal_score >= minScore)
      .sort((a, b) => b.deal_score - a.deal_score)
      .slice(0, limit);

    // Calculate summary stats
    const summary = {
      total: filteredProducts.length,
      bestDeals: filteredProducts.filter(p => p.deal_score >= 85).length,
      goodDeals: filteredProducts.filter(p => p.deal_score >= 60 && p.deal_score < 85).length,
      avgScore: filteredProducts.length > 0
        ? Math.round(filteredProducts.reduce((sum, p) => sum + p.deal_score, 0) / filteredProducts.length)
        : 0,
    };

    return NextResponse.json({
      products: filteredProducts,
      summary,
      cached_until: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
