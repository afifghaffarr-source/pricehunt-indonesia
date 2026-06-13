import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const period = searchParams.get('period') || '7d';
    
    const supabase = createAdminClient();
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Get total offers
    const { count: totalOffers } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get average price
    const { data: priceData } = await supabase
      .from('offers')
      .select('current_price')
      .eq('is_active', true)
      .limit(1000);

    const avgPrice = priceData && priceData.length > 0
      ? priceData.reduce((sum: number, o: any) => sum + o.current_price, 0) / priceData.length
      : 0;

    // Get price change (compare with previous period)
    const { data: currentPrices } = await supabase
      .from('offers')
      .select('current_price')
      .eq('is_active', true)
      .gte('updated_at', startDate.toISOString())
      .limit(1000);

    const { data: previousPrices } = await supabase
      .from('offers')
      .select('current_price')
      .eq('is_active', true)
      .lt('updated_at', startDate.toISOString())
      .limit(1000);

    const currentAvg = currentPrices && currentPrices.length > 0
      ? currentPrices.reduce((sum, o) => sum + o.current_price, 0) / currentPrices.length
      : avgPrice;

    const previousAvg = previousPrices && previousPrices.length > 0
      ? previousPrices.reduce((sum, o) => sum + o.current_price, 0) / previousPrices.length
      : avgPrice;

    const priceChange24h = previousAvg > 0 
      ? ((currentAvg - previousAvg) / previousAvg) * 100 
      : 0;

    // Get top categories
    const { data: products } = await supabase
      .from('products')
      .select('category')
      .limit(1000);

    const categoryCounts: Record<string, { count: number; totalPrice: number }> = {};
    if (products) {
      products.forEach(p => {
        const cat = p.category || 'Umum';
        if (!categoryCounts[cat]) {
          categoryCounts[cat] = { count: 0, totalPrice: 0 };
        }
        categoryCounts[cat].count++;
      });
    }

    // Get offers for category prices
    const { data: offersWithProducts } = await supabase
      .from('offers')
      .select('current_price, product_id, products(category)')
      .eq('is_active', true)
      .limit(1000);

    if (offersWithProducts) {
      offersWithProducts.forEach(offer => {
        const category = (offer.products as any)?.category || 'Umum';
        if (!categoryCounts[category]) {
          categoryCounts[category] = { count: 0, totalPrice: 0 };
        }
        categoryCounts[category].totalPrice += offer.current_price;
      });
    }

    const topCategories = Object.entries(categoryCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgPrice: data.count > 0 ? Math.round(data.totalPrice / data.count) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get top marketplaces
    const { data: marketplaceData } = await supabase
      .from('offers')
      .select('marketplace_id, current_price')
      .eq('is_active', true)
      .limit(1000);

    const marketplaceStats: Record<string, { offers: number; totalPrice: number }> = {};
    if (marketplaceData) {
      marketplaceData.forEach(offer => {
        const mp = offer.marketplace_id;
        if (!marketplaceStats[mp]) {
          marketplaceStats[mp] = { offers: 0, totalPrice: 0 };
        }
        marketplaceStats[mp].offers++;
        marketplaceStats[mp].totalPrice += offer.current_price;
      });
    }

    const marketplaceNames: Record<string, string> = {
      'b5955e0a-8f32-43e3-bd5c-c5d37b333efa': 'tokopedia',
      'c60af940-c71e-4a81-ad50-bfab7875a35f': 'shopee',
      '06c4b196-865b-4fcd-aa02-3f93208b25f2': 'bukalapak',
      'bda64ca0-ca4d-4064-92db-92143c3207fd': 'lazada',
      '59fdf7b4-3cf9-4bdc-bcb8-04e6f6c02343': 'blibli',
      'c5e7b12d-9ed3-42f5-8400-bdd366bfd421': 'tiktok',
    };

    const topMarketplaces = Object.entries(marketplaceStats)
      .map(([id, data]) => ({
        name: marketplaceNames[id] || id.slice(0, 8),
        offers: data.offers,
        avgPrice: data.offers > 0 ? Math.round(data.totalPrice / data.offers) : 0
      }))
      .sort((a, b) => b.offers - a.offers);

    // Get price distribution
    const priceRanges = [
      { range: '< Rp 100K', min: 0, max: 100000 },
      { range: 'Rp 100K - 500K', min: 100000, max: 500000 },
      { range: 'Rp 500K - 1M', min: 500000, max: 1000000 },
      { range: 'Rp 1M - 5M', min: 1000000, max: 5000000 },
      { range: 'Rp 5M - 10M', min: 5000000, max: 10000000 },
      { range: '> Rp 10M', min: 10000000, max: Infinity },
    ];

    const priceDistribution = priceRanges.map(range => ({
      range: range.range,
      count: priceData?.filter(p => 
        p.current_price >= range.min && p.current_price < range.max
      ).length || 0
    }));

    // Get recent price drops (mock for now - need price_history table)
    const recentPriceDrops: Array<{
      id: string;
      name: string;
      oldPrice: number;
      newPrice: number;
      dropPercent: number;
      marketplace: string;
    }> = [];

    return NextResponse.json({
      success: true,
      data: {
        totalProducts: totalProducts || 0,
        totalOffers: totalOffers || 0,
        avgPrice: Math.round(avgPrice),
        priceChange24h,
        topCategories,
        topMarketplaces,
        recentPriceDrops,
        priceDistribution,
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load analytics' },
      { status: 500 }
    );
  }
}
