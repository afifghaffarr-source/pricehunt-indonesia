#!/usr/bin/env tsx
/**
 * BijakBeli.app - Enhanced Morning Analytics Briefing
 * Comprehensive daily analytics with trends and actionable insights
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DailyMetrics {
  products: { total: number; topDeals: any[] };
  offers: { total: number; fresh: number; stale: number };
  alerts: { active: number; triggered: number };
  users: { total: number; withAlerts: number; withWishlists: number };
  priceActivity: { snapshots: number; updates: number };
  systemHealth: { jobs: any[]; successRate: number };
}

async function generateEnhancedBriefing() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  printHeader(now);
  
  const metrics = await gatherMetrics(yesterday, lastWeek);
  
  printProductInsights(metrics);
  printPriceActivity(metrics);
  printUserEngagement(metrics);
  printDataQuality(metrics);
  printSystemHealth(metrics);
  printActionableRecommendations(metrics);
  
  printFooter();
}

function printHeader(now: Date) {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       📊 BijakBeli.app - Morning Analytics Briefing          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\n📅 ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  console.log(`⏰ ${now.toLocaleTimeString('id-ID')}\n`);
}

async function gatherMetrics(yesterday: Date, lastWeek: Date): Promise<DailyMetrics> {
  console.log('⚙️  Gathering metrics...\n');
  
  const [products, offers, alerts, users, priceActivity, jobs] = await Promise.all([
    getProductMetrics(),
    getOfferMetrics(yesterday),
    getAlertMetrics(yesterday),
    getUserMetrics(),
    getPriceActivityMetrics(yesterday),
    getJobLogs(yesterday)
  ]);
  
  return {
    products,
    offers,
    alerts,
    users,
    priceActivity,
    systemHealth: { jobs, successRate: calculateSuccessRate(jobs) }
  };
}

async function getProductMetrics() {
  const { count: total } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  const { data: topDeals } = await supabase
    .from('products')
    .select('name, category, deal_score, lowest_price, highest_price, average_price')
    .order('deal_score', { ascending: false })
    .limit(10);
  
  return { total: total || 0, topDeals: topDeals || [] };
}

async function getOfferMetrics(since: Date) {
  const { count: total } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  const { count: stale } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lt('last_checked_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
  
  return { total: total || 0, stale: stale || 0, fresh: (total || 0) - (stale || 0) };
}

async function getAlertMetrics(since: Date) {
  const { count: active } = await supabase
    .from('price_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  const { count: triggered } = await supabase
    .from('price_alerts')
    .select('*', { count: 'exact', head: true })
    .gte('triggered_at', since.toISOString());
  
  return { active: active || 0, triggered: triggered || 0 };
}

async function getUserMetrics() {
  const { count: total } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });
  
  const { count: withAlerts } = await supabase
    .from('price_alerts')
    .select('user_id', { count: 'exact', head: true })
    .eq('is_active', true);
  
  const { count: withWishlists } = await supabase
    .from('wishlists')
    .select('user_id', { count: 'exact', head: true });
  
  return { total: total || 0, withAlerts: withAlerts || 0, withWishlists: withWishlists || 0 };
}

async function getPriceActivityMetrics(since: Date) {
  const { count: snapshots } = await supabase
    .from('price_snapshots')
    .select('*', { count: 'exact', head: true })
    .gte('captured_at', since.toISOString());
  
  const { count: updates } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', since.toISOString());
  
  return { snapshots: snapshots || 0, updates: updates || 0 };
}

async function getJobLogs(since: Date) {
  const { data } = await supabase
    .from('job_logs')
    .select('job_name, status, duration_ms, created_at, processed_count')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });
  
  return data || [];
}

function calculateSuccessRate(jobs: any[]): number {
  if (jobs.length === 0) return 0;
  const success = jobs.filter(j => j.status === 'success').length;
  return (success / jobs.length) * 100;
}

function printProductInsights(metrics: DailyMetrics) {
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 🏆 TOP PRODUCTS & DEALS                                     │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  console.log(`📦 Total Products: ${metrics.products.total}`);
  console.log(`🎯 Top 5 Deal Scores:\n`);
  
  metrics.products.topDeals.slice(0, 5).forEach((p, i) => {
    const savingsPercent = p.highest_price > 0 
      ? ((1 - p.lowest_price / p.highest_price) * 100).toFixed(0)
      : 0;
    
    console.log(`   ${i + 1}. ${p.name}`);
    console.log(`      💰 Rp ${p.lowest_price?.toLocaleString('id-ID')} (hemat ${savingsPercent}%)`);
    console.log(`      🎯 Deal Score: ${p.deal_score}/100 | 📂 ${p.category}\n`);
  });
}

function printPriceActivity(metrics: DailyMetrics) {
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 💸 PRICE ACTIVITY (Last 24h)                                │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  console.log(`   📸 Price snapshots: ${metrics.priceActivity.snapshots}`);
  console.log(`   🔄 Offer updates: ${metrics.priceActivity.updates}`);
  
  if (metrics.priceActivity.snapshots === 0) {
    console.log(`   ⚠️  WARNING: No price snapshots in 24h - check data collection!\n`);
  } else {
    console.log(`   ✅ Data collection active\n`);
  }
}

function printUserEngagement(metrics: DailyMetrics) {
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 👥 USER ENGAGEMENT                                          │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  console.log(`   👤 Total users: ${metrics.users.total}`);
  console.log(`   🔔 Users with active alerts: ${metrics.users.withAlerts}`);
  console.log(`   ❤️  Users with wishlists: ${metrics.users.withWishlists}`);
  console.log(`   📊 Alert conversion: ${metrics.users.total > 0 ? ((metrics.users.withAlerts / metrics.users.total) * 100).toFixed(1) : 0}%\n`);
  
  console.log(`   🔔 Active Alerts: ${metrics.alerts.active}`);
  console.log(`   ✅ Triggered (24h): ${metrics.alerts.triggered}\n`);
}

function printDataQuality(metrics: DailyMetrics) {
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ ✨ DATA QUALITY                                             │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  const freshnessRate = metrics.offers.total > 0 
    ? (metrics.offers.fresh / metrics.offers.total * 100).toFixed(1)
    : '0.0';
  
  console.log(`   📊 Total active offers: ${metrics.offers.total}`);
  console.log(`   ✅ Fresh (<48h): ${metrics.offers.fresh} (${freshnessRate}%)`);
  console.log(`   ⏰ Stale (>48h): ${metrics.offers.stale}`);
  
  if (metrics.offers.stale > 20) {
    console.log(`   ⚠️  HIGH STALE COUNT - prioritize refresh!\n`);
  } else {
    console.log(`   ✅ Data freshness good\n`);
  }
}

function printSystemHealth(metrics: DailyMetrics) {
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 🏥 SYSTEM HEALTH                                            │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  if (metrics.systemHealth.jobs.length === 0) {
    console.log(`   ⚠️  WARNING: No job logs in last 24h!`);
    console.log(`   ❌ Cron jobs may not be running or logging\n`);
  } else {
    const successCount = metrics.systemHealth.jobs.filter(j => j.status === 'success').length;
    const failCount = metrics.systemHealth.jobs.filter(j => j.status === 'failed').length;
    
    console.log(`   📊 Jobs executed: ${metrics.systemHealth.jobs.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Success rate: ${metrics.systemHealth.successRate.toFixed(1)}%\n`);
    
    if (failCount > 0) {
      console.log(`   ⚠️  Recent failures:\n`);
      metrics.systemHealth.jobs
        .filter(j => j.status === 'failed')
        .slice(0, 3)
        .forEach(j => {
          console.log(`      - ${j.job_name} at ${new Date(j.created_at).toLocaleTimeString('id-ID')}`);
        });
      console.log();
    }
  }
}

function printActionableRecommendations(metrics: DailyMetrics) {
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 💡 ACTIONABLE RECOMMENDATIONS                               │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  const recommendations: string[] = [];
  
  // Critical issues
  if (metrics.priceActivity.snapshots === 0) {
    recommendations.push('🚨 CRITICAL: No price data collected in 24h - check crawlers ASAP!');
  }
  
  if (metrics.systemHealth.jobs.length === 0) {
    recommendations.push('🚨 CRITICAL: No job logs - verify cron jobs are running!');
  }
  
  if (metrics.systemHealth.successRate < 80) {
    recommendations.push('⚠️  HIGH PRIORITY: Job success rate below 80% - investigate failures');
  }
  
  // Important tasks
  if (metrics.offers.stale > 20) {
    recommendations.push(`⚠️  PRIORITY: ${metrics.offers.stale} stale offers - run price refresh`);
  }
  
  if (metrics.alerts.active > 0 && metrics.alerts.triggered === 0) {
    recommendations.push(`👀 Monitor ${metrics.alerts.active} active alerts for price drops`);
  }
  
  // Regular maintenance
  recommendations.push('✅ Run daily price collection job');
  recommendations.push('📧 Verify alert notification delivery');
  recommendations.push('🔍 Review top products for content quality');
  
  // Growth opportunities
  if (metrics.users.total > 0) {
    const conversionRate = (metrics.users.withAlerts / metrics.users.total) * 100;
    if (conversionRate < 50) {
      recommendations.push(`📈 OPPORTUNITY: Only ${conversionRate.toFixed(0)}% users have alerts - improve onboarding`);
    }
  }
  
  recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });
  console.log();
}

function printFooter() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              ✨ Have a productive day! 🚀                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

generateEnhancedBriefing().catch(console.error);
