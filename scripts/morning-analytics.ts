#!/usr/bin/env tsx
/**
 * BijakBeli.app - Morning Analytics Briefing
 * Generates comprehensive daily analytics report
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateMorningBriefing() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  console.log('📊 BijakBeli.app - Morning Analytics Briefing');
  console.log('═'.repeat(60));
  console.log(`📅 ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  console.log(`⏰ Generated at: ${now.toLocaleTimeString('id-ID')}`);
  console.log('═'.repeat(60));
  console.log();

  // 1. TOP PRODUCTS
  await reportTopProducts();
  
  // 2. PRICE ACTIVITY
  await reportPriceActivity(yesterday);
  
  // 3. ALERT STATS
  await reportAlertStats(yesterday);
  
  // 4. DATA QUALITY
  await reportDataQuality(yesterday);
  
  // 5. SYSTEM HEALTH
  await reportSystemHealth();
  
  // 6. RECOMMENDATIONS
  await generateRecommendations();
}

async function reportTopProducts() {
  console.log('🏆 TOP PRODUCTS (Last 24h)');
  console.log('─'.repeat(60));
  
  const { data: products } = await supabase
    .from('products')
    .select('name, deal_score, lowest_price, category')
    .order('deal_score', { ascending: false })
    .limit(5);
  
  if (products && products.length > 0) {
    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   💰 Rp ${p.lowest_price?.toLocaleString('id-ID')} | 🎯 Score: ${p.deal_score} | 📦 ${p.category}`);
    });
  } else {
    console.log('   ⚠️  No product data available');
  }
  console.log();
}

async function reportPriceActivity(since: Date) {
  console.log('💸 PRICE ACTIVITY (Last 24h)');
  console.log('─'.repeat(60));
  
  const { data: snapshots } = await supabase
    .from('price_snapshots')
    .select('offer_id, price, captured_at, offers(product_id, products(name))')
    .gte('captured_at', since.toISOString())
    .order('captured_at', { ascending: false })
    .limit(100);
  
  if (snapshots && snapshots.length > 0) {
    console.log(`   📈 Total price checks: ${snapshots.length}`);
    
    const priceDrops = new Map<string, number>();
    snapshots.forEach((s: any) => {
      if (s.offers?.products?.name) {
        priceDrops.set(s.offers.products.name, s.price);
      }
    });
    
    console.log(`   🎯 Unique products tracked: ${priceDrops.size}`);
  } else {
    console.log('   ℹ️  No price snapshots recorded in last 24h');
  }
  console.log();
}

async function reportAlertStats(since: Date) {
  console.log('🔔 ALERT STATS');
  console.log('─'.repeat(60));
  
  const { count: activeAlerts } = await supabase
    .from('price_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  const { count: triggeredAlerts } = await supabase
    .from('price_alerts')
    .select('*', { count: 'exact', head: true })
    .gte('triggered_at', since.toISOString());
  
  console.log(`   ✅ Active alerts: ${activeAlerts || 0}`);
  console.log(`   🔔 Triggered (24h): ${triggeredAlerts || 0}`);
  console.log();
}

async function reportDataQuality(since: Date) {
  console.log('✨ DATA QUALITY');
  console.log('─'.repeat(60));
  
  const { count: totalOffers } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  const { count: staleOffers } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lt('last_checked_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
  
  const freshnessRate = totalOffers ? ((totalOffers - (staleOffers || 0)) / totalOffers * 100).toFixed(1) : '0.0';
  
  console.log(`   📊 Total active offers: ${totalOffers || 0}`);
  console.log(`   ⏰ Stale (>48h): ${staleOffers || 0}`);
  console.log(`   ✅ Freshness rate: ${freshnessRate}%`);
  console.log();
}

async function reportSystemHealth() {
  console.log('🏥 SYSTEM HEALTH');
  console.log('─'.repeat(60));
  
  const { data: recentJobs } = await supabase
    .from('job_logs')
    .select('job_name, status, duration_ms, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (recentJobs && recentJobs.length > 0) {
    const successCount = recentJobs.filter(j => j.status === 'success').length;
    const failCount = recentJobs.filter(j => j.status === 'failed').length;
    
    console.log(`   ✅ Successful jobs: ${successCount}`);
    console.log(`   ❌ Failed jobs: ${failCount}`);
    console.log(`   📊 Success rate: ${((successCount / recentJobs.length) * 100).toFixed(1)}%`);
  } else {
    console.log('   ℹ️  No job logs found (last 24h)');
  }
  console.log();
}

async function generateRecommendations() {
  console.log('💡 RECOMMENDATIONS');
  console.log('─'.repeat(60));
  
  const { count: staleOffers } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lt('last_checked_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
  
  const { count: activeAlerts } = await supabase
    .from('price_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  const recommendations = [];
  
  if (staleOffers && staleOffers > 10) {
    recommendations.push(`⚠️  ${staleOffers} offers need refresh - schedule price collection`);
  }
  
  if (activeAlerts && activeAlerts > 0) {
    recommendations.push(`👀 ${activeAlerts} active alerts - monitor for price drops`);
  }
  
  recommendations.push('✅ Run daily price collection job');
  recommendations.push('📧 Check alert notification delivery');
  
  recommendations.forEach(r => console.log(`   ${r}`));
  console.log();
  console.log('═'.repeat(60));
  console.log('✨ Have a productive day!');
}

generateMorningBriefing().catch(console.error);
