/**
 * Price Update Analysis Script
 * Analyzes BijakBeli database to identify products needing price updates
 * 
 * Checks:
 * 1. Products with prices older than 24 hours
 * 2. High-traffic products needing refresh
 * 3. Products with alerts waiting for updates
 * 
 * Run: npx tsx scripts/analyze-price-updates.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Current time for analysis
const NOW = new Date('2026-06-12T18:01:41.223Z');
const TWENTY_FOUR_HOURS_AGO = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);

type AnalysisResult = {
  timestamp: string;
  summary: {
    total_products_analyzed: number;
    stale_prices_count: number;
    high_priority_count: number;
    alerts_waiting_count: number;
    targets_to_refresh: number;
  };
  stale_prices: Array<{
    product_id: string;
    product_name: string;
    oldest_price_hours: number;
    last_updated: string;
    marketplace_count: number;
  }>;
  high_priority_products: Array<{
    product_id: string;
    product_name: string;
    deal_score: number;
    hours_since_update: number;
    view_count?: number;
  }>;
  products_with_alerts: Array<{
    product_id: string;
    product_name: string;
    alert_count: number;
    lowest_price: number | null;
    hours_since_update: number;
  }>;
  refresh_targets: Array<{
    target_id: string;
    url: string;
    product_name: string;
    marketplace: string;
    priority_score: number;
    reason: string;
  }>;
};

async function analyzeDatabase(): Promise<AnalysisResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔍 Analyzing BijakBeli database...');
  console.log(`📅 Current time: ${NOW.toISOString()}`);
  console.log(`⏰ Checking for prices older than: ${TWENTY_FOUR_HOURS_AGO.toISOString()}\n`);

  // 1. Find products with stale prices (>24 hours old)
  console.log('1️⃣  Checking for stale prices...');
  const { data: stalePrices, error: stalePricesError } = await supabase
    .from('prices')
    .select(`
      id,
      product_id,
      last_updated,
      products (id, name)
    `)
    .lt('last_updated', TWENTY_FOUR_HOURS_AGO.toISOString())
    .order('last_updated', { ascending: true });

  if (stalePricesError) {
    console.error('❌ Error fetching stale prices:', stalePricesError);
  }

  // Group by product
  const staleByProduct = new Map<string, { name: string; oldest: Date; count: number }>();
  
  if (stalePrices) {
    for (const price of stalePrices) {
      const product = price.products as any;
      const productId = price.product_id as string;
      const lastUpdated = new Date(price.last_updated as string);
      
      if (!staleByProduct.has(productId)) {
        staleByProduct.set(productId, {
          name: product?.name || 'Unknown',
          oldest: lastUpdated,
          count: 1,
        });
      } else {
        const existing = staleByProduct.get(productId)!;
        existing.count++;
        if (lastUpdated < existing.oldest) {
          existing.oldest = lastUpdated;
        }
      }
    }
  }

  const stalePricesList = Array.from(staleByProduct.entries()).map(([productId, data]) => ({
    product_id: productId,
    product_name: data.name,
    oldest_price_hours: Math.round((NOW.getTime() - data.oldest.getTime()) / (1000 * 60 * 60) * 10) / 10,
    last_updated: data.oldest.toISOString(),
    marketplace_count: data.count,
  })).sort((a, b) => b.oldest_price_hours - a.oldest_price_hours);

  console.log(`   Found ${stalePricesList.length} products with stale prices\n`);

  // 2. Find high-traffic products (high deal_score) needing refresh
  console.log('2️⃣  Checking high-priority products...');
  const { data: highPriorityProducts, error: highPriorityError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      deal_score,
      prices (last_updated)
    `)
    .gte('deal_score', 70)
    .order('deal_score', { ascending: false })
    .limit(50);

  if (highPriorityError) {
    console.error('❌ Error fetching high-priority products:', highPriorityError);
  }

  const highPriorityList = (highPriorityProducts || [])
    .map((product: any) => {
      const prices = product.prices || [];
      const mostRecentPrice = prices.reduce((latest: Date | null, price: any) => {
        const updated = new Date(price.last_updated);
        return !latest || updated > latest ? updated : latest;
      }, null);

      const hoursSinceUpdate = mostRecentPrice
        ? Math.round((NOW.getTime() - mostRecentPrice.getTime()) / (1000 * 60 * 60) * 10) / 10
        : 999;

      return {
        product_id: product.id,
        product_name: product.name,
        deal_score: product.deal_score,
        hours_since_update: hoursSinceUpdate,
      };
    })
    .filter((p: any) => p.hours_since_update > 24)
    .sort((a: any, b: any) => b.deal_score - a.deal_score);

  console.log(`   Found ${highPriorityList.length} high-priority products needing refresh\n`);

  // 3. Find products with active alerts waiting for updates
  console.log('3️⃣  Checking products with active alerts...');
  const { data: productsWithAlerts, error: alertsError } = await supabase
    .from('price_alerts')
    .select(`
      product_id,
      products (
        id,
        name,
        lowest_price,
        prices (last_updated)
      )
    `)
    .eq('is_active', true)
    .is('triggered_at', null);

  if (alertsError) {
    console.error('❌ Error fetching products with alerts:', alertsError);
  }

  // Group alerts by product
  const alertsByProduct = new Map<string, { name: string; count: number; lowest_price: number | null; mostRecent: Date | null }>();
  
  if (productsWithAlerts) {
    for (const alert of productsWithAlerts) {
      const product = alert.products as any;
      const productId = alert.product_id as string;
      
      if (!product) continue;

      const prices = product.prices || [];
      const mostRecentPrice = prices.reduce((latest: Date | null, price: any) => {
        const updated = new Date(price.last_updated);
        return !latest || updated > latest ? updated : latest;
      }, null);

      if (!alertsByProduct.has(productId)) {
        alertsByProduct.set(productId, {
          name: product.name,
          count: 1,
          lowest_price: product.lowest_price,
          mostRecent: mostRecentPrice,
        });
      } else {
        alertsByProduct.get(productId)!.count++;
      }
    }
  }

  const alertsList = Array.from(alertsByProduct.entries()).map(([productId, data]) => ({
    product_id: productId,
    product_name: data.name,
    alert_count: data.count,
    lowest_price: data.lowest_price,
    hours_since_update: data.mostRecent
      ? Math.round((NOW.getTime() - data.mostRecent.getTime()) / (1000 * 60 * 60) * 10) / 10
      : 999,
  })).sort((a, b) => b.alert_count - a.alert_count);

  console.log(`   Found ${alertsList.length} products with active alerts\n`);

  // 4. Get refresh targets that need priority updates
  console.log('4️⃣  Identifying crawl targets to refresh...');
  
  // Query without marketplace join due to schema issue
  const { data: crawlTargets, error: targetsError } = await supabase
    .from('crawl_targets')
    .select(`
      id,
      url,
      product_id,
      marketplace_id,
      domain,
      last_crawled_at,
      crawl_status,
      priority_score
    `)
    .order('priority_score', { ascending: false });

  if (targetsError) {
    console.error('❌ Error fetching crawl targets:', targetsError);
  }
  
  // Get product and marketplace names separately
  const productIds = crawlTargets ? [...new Set(crawlTargets.map(t => t.product_id).filter(Boolean))] : [];
  const marketplaceIds = crawlTargets ? [...new Set(crawlTargets.map(t => t.marketplace_id).filter(Boolean))] : [];
  
  const productNames = new Map<string, string>();
  const marketplaceNames = new Map<string, string>();
  
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);
    
    products?.forEach((p: any) => productNames.set(p.id, p.name));
  }
  
  if (marketplaceIds.length > 0) {
    const { data: marketplaces } = await supabase
      .from('marketplaces')
      .select('id, name')
      .in('id', marketplaceIds);
    
    marketplaces?.forEach((m: any) => marketplaceNames.set(m.id, m.name));
  }

  // Collect all product IDs that need refresh
  const productsNeedingRefresh = new Set<string>();
  stalePricesList.forEach(p => productsNeedingRefresh.add(p.product_id));
  highPriorityList.forEach((p: any) => productsNeedingRefresh.add(p.product_id));
  alertsList.forEach(p => productsNeedingRefresh.add(p.product_id));

  // Match crawl targets to products needing refresh
  const targetsToRefresh = (crawlTargets || [])
    .map((target: any) => {
      const hoursSinceLastCheck = target.last_crawled_at
        ? Math.round((NOW.getTime() - new Date(target.last_crawled_at).getTime()) / (1000 * 60 * 60) * 10) / 10
        : 999;

      let reason = 'Regular refresh cycle';
      let priorityBoost = 0;

      if (productsNeedingRefresh.has(target.product_id)) {
        reason = 'Product needs price update';
        priorityBoost = 20;
      }
      if (hoursSinceLastCheck > 24) {
        reason = 'Not checked for over 24 hours';
        priorityBoost += 15;
      }
      if (target.crawl_status === 'failed') {
        reason = 'Previous crawl failed';
        priorityBoost += 10;
      }

      const calculatedScore = Math.min(100, (target.priority_score || 50) + priorityBoost);

      return {
        target_id: target.id,
        url: target.url,
        domain: target.domain || 'unknown',
        product_id: target.product_id,
        product_name: productNames.get(target.product_id) || 'Unknown',
        marketplace: marketplaceNames.get(target.marketplace_id) || 'Unknown',
        priority_score: calculatedScore,
        hours_since_last_check: hoursSinceLastCheck,
        crawl_status: target.crawl_status,
        reason,
      };
    })
    .filter((t: any) => t.priority_score >= 60 || productsNeedingRefresh.has(t.product_id))
    .sort((a: any, b: any) => b.priority_score - a.priority_score)
    .slice(0, 50);

  console.log(`   Identified ${targetsToRefresh.length} crawl targets for refresh\n`);

  const result: AnalysisResult = {
    timestamp: NOW.toISOString(),
    summary: {
      total_products_analyzed: staleByProduct.size + new Set(highPriorityProducts?.map((p: any) => p.id) || []).size,
      stale_prices_count: stalePricesList.length,
      high_priority_count: highPriorityList.length,
      alerts_waiting_count: alertsList.length,
      targets_to_refresh: targetsToRefresh.length,
    },
    stale_prices: stalePricesList.slice(0, 20),
    high_priority_products: highPriorityList.slice(0, 20),
    products_with_alerts: alertsList.slice(0, 20),
    refresh_targets: targetsToRefresh,
  };

  return result;
}

async function main() {
  try {
    const result = await analyzeDatabase();

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 PRICE UPDATE ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📈 SUMMARY:');
    console.log(`   • Total products analyzed: ${result.summary.total_products_analyzed}`);
    console.log(`   • Products with stale prices (>24h): ${result.summary.stale_prices_count}`);
    console.log(`   • High-priority products needing refresh: ${result.summary.high_priority_count}`);
    console.log(`   • Products with active alerts: ${result.summary.alerts_waiting_count}`);
    console.log(`   • Crawl targets to refresh: ${result.summary.targets_to_refresh}\n`);

    if (result.stale_prices.length > 0) {
      console.log('⚠️  TOP PRODUCTS WITH STALE PRICES:');
      result.stale_prices.slice(0, 10).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.product_name}`);
        console.log(`      Last updated: ${p.oldest_price_hours}h ago (${p.marketplace_count} marketplace${p.marketplace_count > 1 ? 's' : ''})`);
      });
      console.log();
    }

    if (result.high_priority_products.length > 0) {
      console.log('🔥 TOP HIGH-PRIORITY PRODUCTS:');
      result.high_priority_products.slice(0, 10).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.product_name}`);
        console.log(`      Deal score: ${p.deal_score} | Last updated: ${p.hours_since_update}h ago`);
      });
      console.log();
    }

    if (result.products_with_alerts.length > 0) {
      console.log('🔔 PRODUCTS WITH ACTIVE ALERTS:');
      result.products_with_alerts.slice(0, 10).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.product_name}`);
        console.log(`      ${p.alert_count} alert${p.alert_count > 1 ? 's' : ''} waiting | Last updated: ${p.hours_since_update}h ago`);
      });
      console.log();
    }

    if (result.refresh_targets.length > 0) {
      console.log('🎯 RECOMMENDED REFRESH TARGETS:');
      result.refresh_targets.slice(0, 15).forEach((t, i) => {
        console.log(`   ${i + 1}. [${t.marketplace}] ${t.product_name}`);
        console.log(`      Priority: ${t.priority_score} | Reason: ${t.reason}`);
      });
      console.log();
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Analysis complete');
    console.log('═══════════════════════════════════════════════════════\n');

    // Save full report to file
    const reportPath = `./logs/price-update-analysis-${NOW.toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    const fs = await import('fs/promises');
    await fs.mkdir('./logs', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}\n`);

    // Output for cron delivery
    console.log('CRON JOB SUMMARY FOR DELIVERY:');
    console.log(JSON.stringify({
      status: 'completed',
      timestamp: result.timestamp,
      summary: result.summary,
      recommendations: {
        immediate_refresh_needed: result.summary.targets_to_refresh > 0,
        critical_products: result.stale_prices.slice(0, 5).map(p => p.product_name),
        high_priority_count: result.summary.high_priority_count,
        alerts_waiting: result.summary.alerts_waiting_count,
      },
    }, null, 2));

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

main();
