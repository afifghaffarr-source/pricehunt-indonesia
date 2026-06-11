#!/usr/bin/env node
/**
 * BijakBeli.app - Price Update Priority Analysis
 * Identifies products that need price updates and generates a priority report
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeProducts() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  console.log('🔍 Analyzing products needing updates...\n');

  // 1. Products with prices older than 24 hours
  const { data: staleProducts, error: staleError } = await supabase
    .from('prices')
    .select(`
      id,
      last_updated,
      price,
      product_id,
      marketplace_id,
      url,
      products (
        id,
        name,
        slug,
        category,
        lowest_price,
        average_price
      ),
      marketplaces (
        name,
        display_name
      )
    `)
    .lt('last_updated', twentyFourHoursAgo.toISOString())
    .order('last_updated', { ascending: true })
    .limit(20);

  if (staleError) {
    console.error('Error fetching stale products:', staleError);
  }

  // 2. Products in crawl_targets ready for update
  const { data: crawlTargets, error: crawlError } = await supabase
    .from('crawl_targets')
    .select(`
      id,
      url,
      priority_score,
      next_crawl_at,
      last_crawled_at,
      product_id,
      marketplace_id,
      crawl_status,
      products (
        id,
        name,
        slug,
        category
      ),
      marketplaces (
        name,
        display_name
      )
    `)
    .eq('crawl_status', 'queued')
    .lte('next_crawl_at', now.toISOString())
    .order('priority_score', { ascending: false })
    .limit(20);

  if (crawlError) {
    console.error('Error fetching crawl targets:', crawlError);
  }

  // 3. Check offers with low confidence
  const { data: lowConfidenceOffers, error: offerError } = await supabase
    .from('offers')
    .select(`
      id,
      price,
      confidence_score,
      confidence_label,
      validation_status,
      last_updated,
      marketplace_url,
      product_id,
      marketplace_id,
      products (
        id,
        name,
        slug,
        category
      ),
      marketplaces (
        name,
        display_name
      )
    `)
    .lt('confidence_score', 70)
    .in('validation_status', ['pending', 'conflict', 'stale'])
    .order('confidence_score', { ascending: true })
    .limit(20);

  if (offerError) {
    console.error('Error fetching low confidence offers:', offerError);
  }

  // 4. Aggregate and prioritize
  const priorityMap = new Map();

  // Process stale prices
  if (staleProducts) {
    staleProducts.forEach(price => {
      if (!price.products) return;
      
      const key = price.product_id;
      const hoursOld = Math.floor((now - new Date(price.last_updated)) / (1000 * 60 * 60));
      
      if (!priorityMap.has(key)) {
        priorityMap.set(key, {
          product_id: price.product_id,
          product_name: price.products.name,
          slug: price.products.slug,
          category: price.products.category,
          reasons: [],
          urls: [],
          priority_score: 0,
          last_updated: price.last_updated,
          confidence_score: null
        });
      }
      
      const item = priorityMap.get(key);
      item.reasons.push(`Harga ${price.marketplaces?.display_name || 'marketplace'} sudah ${hoursOld} jam tidak diupdate`);
      if (price.url) {
        item.urls.push({
          marketplace: price.marketplaces?.display_name || 'Unknown',
          url: price.url
        });
      }
      item.priority_score += Math.min(50, hoursOld); // Max 50 points for staleness
    });
  }

  // Process crawl targets
  if (crawlTargets) {
    crawlTargets.forEach(target => {
      if (!target.products) return;
      
      const key = target.product_id;
      
      if (!priorityMap.has(key)) {
        priorityMap.set(key, {
          product_id: target.product_id,
          product_name: target.products.name,
          slug: target.products.slug,
          category: target.products.category,
          reasons: [],
          urls: [],
          priority_score: 0,
          last_updated: target.last_crawled_at,
          confidence_score: null
        });
      }
      
      const item = priorityMap.get(key);
      item.reasons.push(`Terjadwal untuk crawl (prioritas: ${target.priority_score})`);
      if (target.url) {
        item.urls.push({
          marketplace: target.marketplaces?.display_name || 'Unknown',
          url: target.url
        });
      }
      item.priority_score += target.priority_score;
    });
  }

  // Process low confidence offers
  if (lowConfidenceOffers) {
    lowConfidenceOffers.forEach(offer => {
      if (!offer.products) return;
      
      const key = offer.product_id;
      
      if (!priorityMap.has(key)) {
        priorityMap.set(key, {
          product_id: offer.product_id,
          product_name: offer.products.name,
          slug: offer.products.slug,
          category: offer.products.category,
          reasons: [],
          urls: [],
          priority_score: 0,
          last_updated: offer.last_updated,
          confidence_score: offer.confidence_score
        });
      }
      
      const item = priorityMap.get(key);
      item.reasons.push(`Confidence score rendah (${offer.confidence_score || 0}%) - ${offer.confidence_label || 'perlu dicek'}`);
      item.confidence_score = offer.confidence_score;
      if (offer.marketplace_url) {
        item.urls.push({
          marketplace: offer.marketplaces?.display_name || 'Unknown',
          url: offer.marketplace_url
        });
      }
      item.priority_score += (70 - (offer.confidence_score || 0)); // Lower confidence = higher priority
    });
  }

  // Sort by priority score
  const sortedProducts = Array.from(priorityMap.values())
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 10);

  return sortedProducts;
}

function formatTelegramReport(products) {
  if (products.length === 0) {
    return '[SILENT]';
  }

  const now = new Date();
  const dateStr = now.toLocaleString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let report = `🔄 *Laporan Update Harga BijakBeli*\n`;
  report += `📅 ${dateStr}\n\n`;
  report += `Ditemukan *${products.length} produk* yang perlu diupdate:\n\n`;

  products.forEach((product, index) => {
    const emoji = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || '•';
    
    report += `${emoji} *${product.product_name}*\n`;
    report += `   📦 ID: \`${product.product_id}\`\n`;
    report += `   🏷️ Kategori: ${product.category}\n`;
    
    if (product.last_updated) {
      const lastUpdated = new Date(product.last_updated);
      const hoursAgo = Math.floor((now - lastUpdated) / (1000 * 60 * 60));
      const daysAgo = Math.floor(hoursAgo / 24);
      
      if (daysAgo > 0) {
        report += `   ⏰ Update terakhir: ${daysAgo} hari ${hoursAgo % 24} jam lalu\n`;
      } else {
        report += `   ⏰ Update terakhir: ${hoursAgo} jam lalu\n`;
      }
    }
    
    if (product.confidence_score !== null) {
      report += `   📊 Confidence: ${product.confidence_score}%\n`;
    }
    
    report += `   ⚡ Priority Score: ${Math.round(product.priority_score)}\n`;
    report += `   \n`;
    report += `   *Alasan perlu update:*\n`;
    
    product.reasons.forEach(reason => {
      report += `   • ${reason}\n`;
    });
    
    if (product.urls.length > 0) {
      report += `   \n`;
      report += `   *Marketplace URLs:*\n`;
      product.urls.slice(0, 3).forEach(urlInfo => {
        const shortUrl = urlInfo.url.length > 50 ? urlInfo.url.substring(0, 47) + '...' : urlInfo.url;
        report += `   • [${urlInfo.marketplace}](${urlInfo.url})\n`;
      });
    }
    
    report += `\n`;
  });

  report += `\n💡 *Rekomendasi:*\n`;
  report += `• Jalankan crawler untuk produk prioritas tinggi\n`;
  report += `• Periksa dan validasi data confidence rendah\n`;
  report += `• Update harga manual jika crawler gagal\n\n`;
  report += `_Report generated automatically by BijakBeli Cron_`;

  return report;
}

async function main() {
  try {
    const products = await analyzeProducts();
    const report = formatTelegramReport(products);
    
    console.log('\n' + '='.repeat(60));
    console.log('TELEGRAM REPORT');
    console.log('='.repeat(60) + '\n');
    console.log(report);
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
