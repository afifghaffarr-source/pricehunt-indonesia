#!/usr/bin/env tsx
/**
 * PriceHunt Price Update Priority Analyzer
 * 
 * Analyzes database to identify products that urgently need price updates
 * and generates a prioritized report in Indonesian for Telegram delivery.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface PriorityProduct {
  product_id: string;
  product_name: string;
  product_slug: string;
  price_id: string;
  marketplace: string;
  current_price: number;
  last_updated: string;
  hours_stale: number;
  url: string;
  wishlist_count: number;
  alert_count: number;
  priority_score: number;
  reasons: string[];
}

async function analyzeProductsNeedingUpdate(): Promise<PriorityProduct[]> {
  const now = new Date();
  const results: PriorityProduct[] = [];

  console.log("🔍 Analyzing products needing price updates...\n");

  // Query 1: Get all prices with their products and marketplaces
  const { data: allPrices, error: pricesError } = await supabase
    .from("prices")
    .select(`
      id,
      product_id,
      marketplace_id,
      price,
      url,
      last_updated,
      in_stock,
      products(id, name, slug),
      marketplaces(id, name, display_name)
    `)
    .order("last_updated", { ascending: true, nullsFirst: true })
    .limit(100);

  if (pricesError) {
    console.error("❌ Error fetching prices:", pricesError);
    return [];
  }

  console.log(`📊 Found ${allPrices?.length || 0} price entries`);

  if (!allPrices || allPrices.length === 0) {
    console.log("⚠️ No prices found in database");
    return [];
  }

  // Query 2: Get wishlist counts per product
  const { data: wishlists, error: wishlistError } = await supabase
    .from("wishlists")
    .select("product_id");

  const wishlistCounts = new Map<string, number>();
  if (wishlists) {
    for (const w of wishlists) {
      wishlistCounts.set(w.product_id, (wishlistCounts.get(w.product_id) || 0) + 1);
    }
    console.log(`📊 Found ${wishlists.length} wishlist entries`);
  }

  // Query 3: Get active alert counts per product
  const { data: alerts, error: alertError } = await supabase
    .from("price_alerts")
    .select("product_id")
    .eq("is_active", true);

  const alertCounts = new Map<string, number>();
  if (alerts) {
    for (const a of alerts) {
      alertCounts.set(a.product_id, (alertCounts.get(a.product_id) || 0) + 1);
    }
    console.log(`📊 Found ${alerts.length} active price alerts`);
  }

  // Query 4: Get products with recent price changes (volatility indicator)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const { data: priceHistory, error: historyError } = await supabase
    .from("price_history")
    .select("product_id, marketplace_id")
    .gte("recorded_at", thirtyDaysAgo.toISOString().split('T')[0]);

  const volatilityMap = new Map<string, number>();
  if (priceHistory) {
    for (const h of priceHistory) {
      const key = `${h.product_id}-${h.marketplace_id}`;
      volatilityMap.set(key, (volatilityMap.get(key) || 0) + 1);
    }
    console.log(`📊 Analyzed ${priceHistory.length} price history records`);
  }

  console.log("\n🧮 Calculating priority scores...\n");

  // Build priority list
  for (const priceEntry of allPrices) {
    if (!priceEntry.products || !priceEntry.marketplaces) continue;

    const product = Array.isArray(priceEntry.products) ? priceEntry.products[0] : priceEntry.products;
    const marketplace = Array.isArray(priceEntry.marketplaces) ? priceEntry.marketplaces[0] : priceEntry.marketplaces;

    if (!product || !marketplace) continue;

    const lastUpdated = priceEntry.last_updated ? new Date(priceEntry.last_updated) : new Date(0);
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

    const wishlistCount = wishlistCounts.get(priceEntry.product_id) || 0;
    const alertCount = alertCounts.get(priceEntry.product_id) || 0;
    const volatilityKey = `${priceEntry.product_id}-${priceEntry.marketplace_id}`;
    const priceChanges = volatilityMap.get(volatilityKey) || 0;

    const reasons: string[] = [];
    let priorityScore = 0;

    // Factor 1: Staleness (0-40 points)
    if (hoursSinceUpdate > 168) { // >7 days
      priorityScore += 40;
      reasons.push("Data sangat lama (>7 hari)");
    } else if (hoursSinceUpdate > 72) { // >3 days
      priorityScore += 35;
      reasons.push("Data lama (>3 hari)");
    } else if (hoursSinceUpdate > 48) { // >2 days
      priorityScore += 25;
      reasons.push("Data lama (>2 hari)");
    } else if (hoursSinceUpdate > 24) { // >1 day
      priorityScore += 15;
      reasons.push("Data perlu refresh (>24 jam)");
    } else if (hoursSinceUpdate > 12) {
      priorityScore += 5;
    }

    // Factor 2: User engagement (0-30 points)
    const totalEngagement = wishlistCount + alertCount * 2;
    if (totalEngagement >= 10) {
      priorityScore += 30;
      reasons.push(`Engagement tinggi (${wishlistCount}👁️, ${alertCount}🔔)`);
    } else if (totalEngagement >= 5) {
      priorityScore += 20;
      reasons.push(`Ada engagement (${wishlistCount}👁️, ${alertCount}🔔)`);
    } else if (totalEngagement >= 1) {
      priorityScore += 10;
      reasons.push(`${wishlistCount} wishlist, ${alertCount} alert`);
    }

    // Factor 3: Price volatility (0-20 points)
    if (priceChanges > 10) {
      priorityScore += 20;
      reasons.push("Harga sering berubah");
    } else if (priceChanges > 5) {
      priorityScore += 15;
      reasons.push("Harga cukup dinamis");
    } else if (priceChanges > 2) {
      priorityScore += 10;
      reasons.push("Ada perubahan harga");
    }

    // Factor 4: Out of stock penalty
    if (priceEntry.in_stock === false) {
      priorityScore += 10;
      reasons.push("Stok habis - perlu verifikasi");
    }

    // Only include products with priority score > 10 or with engagement or stale data
    if (priorityScore > 10 || totalEngagement > 0 || hoursSinceUpdate > 24) {
      results.push({
        product_id: priceEntry.product_id,
        product_name: product.name || "Unknown",
        product_slug: product.slug || "",
        price_id: priceEntry.id,
        marketplace: marketplace.display_name || marketplace.name || "Unknown",
        current_price: priceEntry.price || 0,
        last_updated: lastUpdated.toISOString(),
        hours_stale: Math.floor(hoursSinceUpdate),
        url: priceEntry.url || "",
        wishlist_count: wishlistCount,
        alert_count: alertCount,
        priority_score: Math.min(100, priorityScore),
        reasons,
      });
    }
  }

  // Sort by priority score (highest first)
  results.sort((a, b) => b.priority_score - a.priority_score);

  return results;
}

function formatTimeAgo(hours: number): string {
  if (hours < 1) return "< 1 jam";
  if (hours < 24) return `${Math.floor(hours)} jam`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 hari";
  return `${days} hari`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function formatTelegramReport(products: PriorityProduct[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  let report = `🔔 <b>Laporan Prioritas Update Harga</b>\n`;
  report += `📅 ${dateStr}, ${timeStr}\n\n`;

  if (products.length === 0) {
    return "[SILENT]";
  }

  report += `📊 <b>Ditemukan ${products.length} produk yang perlu update</b>\n`;
  report += `Berikut 10 prioritas tertinggi:\n\n`;

  const top10 = products.slice(0, 10);

  for (let i = 0; i < top10.length; i++) {
    const p = top10[i];
    const rank = i + 1;
    const emoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;

    report += `${emoji} <b>${p.product_name}</b>\n`;
    report += `   🏪 ${p.marketplace} • ${formatPrice(p.current_price)}\n`;
    report += `   ⏰ Update terakhir: ${formatTimeAgo(p.hours_stale)} yang lalu\n`;

    if (p.wishlist_count > 0 || p.alert_count > 0) {
      report += `   👥 ${p.wishlist_count} wishlist, ${p.alert_count} alert aktif\n`;
    }

    report += `   🎯 Priority Score: <b>${p.priority_score}</b>/100\n`;
    report += `   📝 ${p.reasons.join(", ")}\n`;
    
    if (p.url) {
      report += `   🔗 <a href="${p.url}">Lihat di marketplace</a>\n`;
    }
    
    report += `\n`;
  }

  report += `\n💡 <b>Rekomendasi:</b>\n`;
  const highPriorityCount = products.filter(p => p.priority_score >= 70).length;
  const veryStaleCount = products.filter(p => p.hours_stale > 48).length;
  const withAlertsCount = products.filter(p => p.alert_count > 0).length;

  if (highPriorityCount > 0) {
    report += `• ${highPriorityCount} produk prioritas tinggi (score ≥70)\n`;
  }
  if (veryStaleCount > 0) {
    report += `• ${veryStaleCount} produk data >48 jam (perlu segera)\n`;
  }
  if (withAlertsCount > 0) {
    report += `• ${withAlertsCount} produk dengan alert aktif\n`;
  }

  report += `\n✨ <i>Auto-generated by PriceHunt Analyzer</i>`;

  return report;
}

async function main() {
  console.log("🚀 PriceHunt Price Update Analyzer\n");
  console.log("=" .repeat(60));

  try {
    const products = await analyzeProductsNeedingUpdate();
    
    console.log("\n" + "=".repeat(60));
    console.log(`✅ Analysis complete: ${products.length} products need attention\n`);

    const report = formatTelegramReport(products);
    
    // Output the report (this will be captured by the cron job)
    console.log(report);

  } catch (error) {
    console.error("❌ Error during analysis:", error);
    process.exit(1);
  }
}

main();
