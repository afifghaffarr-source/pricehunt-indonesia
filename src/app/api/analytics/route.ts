import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Get total offers
    const { count: totalOffers } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get top categories
    const { data: products } = await supabase
      .from('products')
      .select('category')
      .limit(1000);

    const categoryCounts: Record<string, number> = {};
    if (products) {
      products.forEach((p) => {
        const cat = p.category || 'Umum';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    }

    const topCategories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count, avgPrice: 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get top marketplaces
    const { data: offers } = await supabase
      .from('offers')
      .select('marketplace_id')
      .eq('is_active', true)
      .limit(1000);

    const marketplaceCounts: Record<string, number> = {};
    if (offers) {
      offers.forEach((o) => {
        const mp = o.marketplace_id;
        marketplaceCounts[mp] = (marketplaceCounts[mp] || 0) + 1;
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

    const topMarketplaces = Object.entries(marketplaceCounts)
      .map(([id, count]) => ({
        name: marketplaceNames[id] || id.slice(0, 8),
        offers: count,
        avgPrice: 0
      }))
      .sort((a, b) => b.offers - a.offers);

    return NextResponse.json({
      success: true,
      data: {
        totalProducts: totalProducts || 0,
        totalOffers: totalOffers || 0,
        avgPrice: 0,
        priceChange24h: 0,
        topCategories,
        topMarketplaces,
        recentPriceDrops: [],
        priceDistribution: [],
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
