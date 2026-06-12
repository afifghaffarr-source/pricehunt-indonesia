#!/usr/bin/env tsx
/**
 * BijakBeli.app - Morning Analytics Briefing
 * 
 * Generates comprehensive daily analytics report including:
 * - Product performance metrics
 * - Price activity & trends
 * - User engagement (alerts, wishlists)
 * - Data quality metrics
 * - System health indicators
 * - Actionable recommendations
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface AnalyticsData {
  timestamp: string;
  productStats: {
    totalProducts: number;
    productsWithPrices: number;
    avgDealScore: number;
    topProducts: Array<{ name: string; alertCount: number; wishlistCount: number }>;
  };
  priceActivity: {
    priceUpdatesLast24h: number;
    biggestDrops: Array<{ name: string; oldPrice: number; newPrice: number; dropPercent: number }>;
    avgPriceChange: number;
  };
  userEngagement: {
    totalActiveAlerts: number;
    alertsTriggeredLast24h: number;
    totalWishlists: number;
    wishlistsAddedLast24h: number;
  };
  dataQuality: {
    productsWithStaleData: number;
    avgDataFreshness: number;
    marketplaceCoverage: Record<string, number>;
  };
  systemHealth: {
    totalMarketplaces: number;
    activeMarketplaces: number;
    priceCollectionSuccessRate: number;
  };
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getEmoji(value: number, good: "high" | "low"): string {
  const isGood = good === "high" ? value > 0 : value < 0;
  if (isGood) return "✅";
  if (Math.abs(value) < 0.1) return "➖";
  return "⚠️";
}

async function collectAnalytics(): Promise<AnalyticsData> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Product Stats
  const { data: products } = await supabase.from("products").select("id, name, slug, lowest_price, deal_score");
  
  const { data: alerts } = await supabase
    .from("price_alerts")
    .select("product_id, products(name)")
    .eq("is_active", true);

  const { data: wishlists } = await supabase
    .from("wishlists")
    .select("product_id, products(name), created_at");

  // Count by product
  const productEngagement = new Map<string, { name: string; alerts: number; wishlists: number }>();
  
  alerts?.forEach((alert) => {
    const productName = (alert.products as any)?.name || "Unknown";
    const existing = productEngagement.get(alert.product_id) || { name: productName, alerts: 0, wishlists: 0 };
    existing.alerts++;
    productEngagement.set(alert.product_id, existing);
  });

  wishlists?.forEach((item) => {
    const productName = (item.products as any)?.name || "Unknown";
    const existing = productEngagement.get(item.product_id) || { name: productName, alerts: 0, wishlists: 0 };
    existing.wishlists++;
    productEngagement.set(item.product_id, existing);
  });

  const topProducts = Array.from(productEngagement.values())
    .sort((a, b) => (b.alerts + b.wishlists) - (a.alerts + a.wishlists))
    .slice(0, 5)
    .map((p) => ({ name: p.name, alertCount: p.alerts, wishlistCount: p.wishlists }));

  const productStats = {
    totalProducts: products?.length || 0,
    productsWithPrices: products?.filter((p) => p.lowest_price && p.lowest_price > 0).length || 0,
    avgDealScore: products?.length
      ? products.reduce((sum, p) => sum + (p.deal_score || 0), 0) / products.length
      : 0,
    topProducts,
  };

  // 2. Price Activity - Compare recent prices with history
  const { data: recentPriceHistory } = await supabase
    .from("price_history")
    .select("product_id, marketplace_id, price, recorded_at, products(name)")
    .gte("recorded_at", yesterday.toISOString())
    .order("recorded_at", { ascending: false });

  const priceUpdatesLast24h = recentPriceHistory?.length || 0;

  // Find biggest price drops
  const priceChanges = new Map<string, { name: string; prices: number[] }>();
  
  recentPriceHistory?.forEach((ph) => {
    const key = ph.product_id;
    const productName = (ph.products as any)?.name || "Unknown";
    if (!priceChanges.has(key)) {
      priceChanges.set(key, { name: productName, prices: [] });
    }
    priceChanges.get(key)!.prices.push(ph.price);
  });

  const biggestDrops: Array<{ name: string; oldPrice: number; newPrice: number; dropPercent: number }> = [];
  
  for (const [productId, data] of priceChanges.entries()) {
    if (data.prices.length >= 2) {
      const prices = data.prices.sort((a, b) => b - a);
      const oldPrice = prices[0];
      const newPrice = prices[prices.length - 1];
      
      if (oldPrice > newPrice) {
        const dropPercent = ((oldPrice - newPrice) / oldPrice) * 100;
        biggestDrops.push({ name: data.name, oldPrice, newPrice, dropPercent });
      }
    }
  }

  biggestDrops.sort((a, b) => b.dropPercent - a.dropPercent);

  const avgPriceChange = biggestDrops.length
    ? biggestDrops.reduce((sum, d) => sum + d.dropPercent, 0) / biggestDrops.length
    : 0;

  // 3. User Engagement
  const { count: totalActiveAlerts } = await supabase
    .from("price_alerts")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: alertsTriggeredLast24h } = await supabase
    .from("price_alerts")
    .select("*", { count: "exact", head: true })
    .gte("triggered_at", yesterday.toISOString());

  const { count: totalWishlists } = await supabase
    .from("wishlists")
    .select("*", { count: "exact", head: true });

  const { count: wishlistsAddedLast24h } = await supabase
    .from("wishlists")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterday.toISOString());

  // 4. Data Quality
  const { data: pricesData } = await supabase
    .from("prices")
    .select("product_id, marketplace_id, last_updated, marketplaces(name)");

  const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours
  const staleCount = pricesData?.filter((p) => new Date(p.last_updated) < staleThreshold).length || 0;

  const freshnessHours = pricesData?.length
    ? pricesData.reduce((sum, p) => {
        const hoursSince = (now.getTime() - new Date(p.last_updated).getTime()) / (1000 * 60 * 60);
        return sum + hoursSince;
      }, 0) / pricesData.length
    : 0;

  // Marketplace coverage
  const marketplaceCoverage: Record<string, number> = {};
  pricesData?.forEach((p) => {
    const mpName = (p.marketplaces as any)?.name || "unknown";
    marketplaceCoverage[mpName] = (marketplaceCoverage[mpName] || 0) + 1;
  });

  // 5. System Health
  const { data: marketplaces } = await supabase.from("marketplaces").select("id, name, is_active");
  
  const totalMarketplaces = marketplaces?.length || 0;
  const activeMarketplaces = marketplaces?.filter((m) => m.is_active).length || 0;

  // Success rate based on recent data freshness
  const recentPrices = pricesData?.filter(
    (p) => new Date(p.last_updated) > new Date(now.getTime() - 6 * 60 * 60 * 1000)
  ).length || 0;
  const priceCollectionSuccessRate = pricesData?.length ? (recentPrices / pricesData.length) * 100 : 0;

  return {
    timestamp: now.toISOString(),
    productStats,
    priceActivity: {
      priceUpdatesLast24h,
      biggestDrops: biggestDrops.slice(0, 5),
      avgPriceChange,
    },
    userEngagement: {
      totalActiveAlerts: totalActiveAlerts || 0,
      alertsTriggeredLast24h: alertsTriggeredLast24h || 0,
      totalWishlists: totalWishlists || 0,
      wishlistsAddedLast24h: wishlistsAddedLast24h || 0,
    },
    dataQuality: {
      productsWithStaleData: staleCount,
      avgDataFreshness: freshnessHours,
      marketplaceCoverage,
    },
    systemHealth: {
      totalMarketplaces,
      activeMarketplaces,
      priceCollectionSuccessRate,
    },
  };
}

function generateRecommendations(data: AnalyticsData): string[] {
  const recommendations: string[] = [];

  // Data freshness issues
  if (data.dataQuality.avgDataFreshness > 24) {
    recommendations.push(
      `⚠️ URGENT: Average data freshness is ${data.dataQuality.avgDataFreshness.toFixed(1)} hours. Run price collectors immediately.`
    );
  }

  if (data.dataQuality.productsWithStaleData > data.productStats.totalProducts * 0.2) {
    recommendations.push(
      `📊 ${data.dataQuality.productsWithStaleData} products have stale data (>48h). Consider increasing collection frequency.`
    );
  }

  // Price collection success rate
  if (data.systemHealth.priceCollectionSuccessRate < 70) {
    recommendations.push(
      `❌ Price collection success rate is low (${data.systemHealth.priceCollectionSuccessRate.toFixed(1)}%). Check collector logs.`
    );
  }

  // User engagement
  if (data.userEngagement.alertsTriggeredLast24h === 0) {
    recommendations.push(
      `💡 No price alerts triggered in 24h. This might indicate missing price drops or stale data.`
    );
  }

  if (data.userEngagement.wishlistsAddedLast24h > 10) {
    recommendations.push(
      `🔥 ${data.userEngagement.wishlistsAddedLast24h} wishlists added! High user interest - ensure price collection is active.`
    );
  }

  // Products without prices
  const productsNoPrices = data.productStats.totalProducts - data.productStats.productsWithPrices;
  if (productsNoPrices > 0) {
    recommendations.push(
      `📦 ${productsNoPrices} products have no price data. Review and potentially remove or recollect.`
    );
  }

  // Positive signals
  if (data.priceActivity.priceUpdatesLast24h > 50 && data.systemHealth.priceCollectionSuccessRate > 80) {
    recommendations.push(`✅ System is healthy! ${data.priceActivity.priceUpdatesLast24h} price updates collected.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("✨ All systems nominal. No immediate action required.");
  }

  return recommendations;
}

function formatReport(data: AnalyticsData): string {
  const date = new Date(data.timestamp);
  const dateStr = date.toLocaleDateString("id-ID", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  const timeStr = date.toLocaleTimeString("id-ID");

  let report = `
╔════════════════════════════════════════════════════════════════════════════╗
║                    📊 BijakBeli.app - Morning Analytics                    ║
║                         ${dateStr}                          ║
║                              ${timeStr}                               ║
╚════════════════════════════════════════════════════════════════════════════╝

`;

  // 1. Product Performance
  report += `
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📦 PRODUCT PERFORMANCE                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  Total Products:           ${data.productStats.totalProducts}
  Products with Prices:     ${data.productStats.productsWithPrices} (${((data.productStats.productsWithPrices / data.productStats.totalProducts) * 100).toFixed(1)}%)
  Average Deal Score:       ${data.productStats.avgDealScore.toFixed(1)}/100

  🔥 TOP TRENDING PRODUCTS (by alerts + wishlists):
`;

  if (data.productStats.topProducts.length > 0) {
    data.productStats.topProducts.forEach((p, i) => {
      report += `     ${i + 1}. ${p.name}\n`;
      report += `        └─ ${p.alertCount} alerts, ${p.wishlistCount} wishlists\n`;
    });
  } else {
    report += `     (No engagement data available)\n`;
  }

  // 2. Price Activity
  report += `
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💰 PRICE ACTIVITY (Last 24 Hours)                                          │
└─────────────────────────────────────────────────────────────────────────────┘

  Price Updates Collected:  ${data.priceActivity.priceUpdatesLast24h}
  Average Price Change:     ${formatPercent(data.priceActivity.avgPriceChange)}

  🎯 BIGGEST PRICE DROPS:
`;

  if (data.priceActivity.biggestDrops.length > 0) {
    data.priceActivity.biggestDrops.forEach((drop, i) => {
      report += `     ${i + 1}. ${drop.name}\n`;
      report += `        └─ ${formatRupiah(drop.oldPrice)} → ${formatRupiah(drop.newPrice)} (${formatPercent(-drop.dropPercent)})\n`;
    });
  } else {
    report += `     (No significant price drops detected)\n`;
  }

  // 3. User Engagement
  report += `
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👥 USER ENGAGEMENT                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

  Active Price Alerts:      ${data.userEngagement.totalActiveAlerts}
  Alerts Triggered (24h):   ${data.userEngagement.alertsTriggeredLast24h} ${getEmoji(data.userEngagement.alertsTriggeredLast24h, "high")}
  
  Total Wishlists:          ${data.userEngagement.totalWishlists}
  Added Last 24h:           ${data.userEngagement.wishlistsAddedLast24h} ${getEmoji(data.userEngagement.wishlistsAddedLast24h, "high")}
`;

  // 4. Data Quality
  report += `
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 DATA QUALITY                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

  Products with Stale Data: ${data.dataQuality.productsWithStaleData} ${getEmoji(-data.dataQuality.productsWithStaleData, "low")}
  Avg Data Freshness:       ${data.dataQuality.avgDataFreshness.toFixed(1)} hours ${data.dataQuality.avgDataFreshness < 24 ? "✅" : "⚠️"}

  Marketplace Coverage:
`;

  Object.entries(data.dataQuality.marketplaceCoverage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([mp, count]) => {
      report += `     • ${mp.padEnd(20)} ${count} prices\n`;
    });

  // 5. System Health
  report += `
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏥 SYSTEM HEALTH                                                            │
└─────────────────────────────────────────────────────────────────────────────┘

  Total Marketplaces:       ${data.systemHealth.totalMarketplaces}
  Active Marketplaces:      ${data.systemHealth.activeMarketplaces}
  Collection Success Rate:  ${data.systemHealth.priceCollectionSuccessRate.toFixed(1)}% ${data.systemHealth.priceCollectionSuccessRate > 70 ? "✅" : "❌"}
`;

  // 6. Recommendations
  const recommendations = generateRecommendations(data);
  report += `
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💡 ACTION ITEMS                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

`;

  recommendations.forEach((rec, i) => {
    report += `  ${i + 1}. ${rec}\n`;
  });

  report += `
╔════════════════════════════════════════════════════════════════════════════╗
║                      End of Morning Analytics Report                       ║
╚════════════════════════════════════════════════════════════════════════════╝
`;

  return report;
}

async function main() {
  try {
    console.log("🔄 Collecting analytics data...");
    const data = await collectAnalytics();
    
    console.log("📝 Generating report...");
    const report = formatReport(data);
    
    console.log(report);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error generating analytics:", error);
    process.exit(1);
  }
}

main();
