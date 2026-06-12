#!/usr/bin/env node
/**
 * Price Alerts Checker
 * 
 * Checks for price alerts where target price has been reached,
 * groups them by user, and sends notifications.
 * 
 * Run: tsx scripts/check-price-alerts.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/types.js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

interface TriggeredAlert {
  alert_id: string;
  user_id: string;
  user_email: string | null;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  target_price: number;
  current_lowest_price: number;
  savings: number;
  savings_percent: number;
  marketplace_name: string;
  marketplace_url: string | null;
  created_at: string;
}

async function checkPriceAlerts() {
  console.log('🔍 Checking for triggered price alerts...\n');

  // Query for active alerts where target price has been reached
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select(`
      id,
      user_id,
      product_id,
      target_price,
      created_at,
      products (
        name,
        slug,
        image_url,
        lowest_price
      )
    `)
    .eq('is_active', true)
    .is('triggered_at', null);

  if (error) {
    console.error('❌ Error fetching alerts:', error);
    return [];
  }

  if (!alerts || alerts.length === 0) {
    console.log('ℹ️  No active alerts found');
    return [];
  }

  console.log(`📊 Found ${alerts.length} active alert(s)`);

  // Filter alerts where target price has been reached
  const triggeredAlerts: TriggeredAlert[] = [];

  for (const alert of alerts) {
    const product = (alert as any).products;
    
    if (!product || !product.lowest_price) {
      continue;
    }

    // Check if target price reached
    if (product.lowest_price <= alert.target_price) {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(alert.user_id);
      
      // Get the best price details (marketplace info)
      const { data: priceData } = await supabase
        .from('prices')
        .select(`
          price,
          url,
          marketplaces (
            display_name
          )
        `)
        .eq('product_id', alert.product_id)
        .eq('price', product.lowest_price)
        .eq('in_stock', true)
        .limit(1)
        .single();

      const savings = alert.target_price - product.lowest_price;
      const savingsPercent = ((savings / alert.target_price) * 100);

      triggeredAlerts.push({
        alert_id: alert.id,
        user_id: alert.user_id,
        user_email: userData?.user?.email || null,
        product_id: alert.product_id,
        product_name: product.name,
        product_slug: product.slug,
        product_image: product.image_url,
        target_price: alert.target_price,
        current_lowest_price: product.lowest_price,
        savings,
        savings_percent: savingsPercent,
        marketplace_name: (priceData?.marketplaces as any)?.display_name || 'Unknown',
        marketplace_url: priceData?.url || null,
        created_at: alert.created_at,
      });
    }
  }

  return triggeredAlerts;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatAlertReport(alerts: TriggeredAlert[]): string {
  if (alerts.length === 0) {
    return '';
  }

  // Group by user
  const alertsByUser = alerts.reduce((acc, alert) => {
    if (!acc[alert.user_id]) {
      acc[alert.user_id] = [];
    }
    acc[alert.user_id].push(alert);
    return acc;
  }, {} as Record<string, TriggeredAlert[]>);

  let report = `🔔 **PRICE ALERT NOTIFICATION**\n`;
  report += `Found ${alerts.length} triggered alert(s) for ${Object.keys(alertsByUser).length} user(s)\n`;
  report += `Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n`;
  report += `─────────────────────────────────\n\n`;

  for (const [userId, userAlerts] of Object.entries(alertsByUser)) {
    const userEmail = userAlerts[0].user_email || 'Unknown User';
    
    report += `👤 **${userEmail}**\n`;
    report += `   Alerts: ${userAlerts.length}\n\n`;

    for (const alert of userAlerts) {
      report += `   🎯 **${alert.product_name}**\n`;
      report += `   ├─ Target: ${formatCurrency(alert.target_price)}\n`;
      report += `   ├─ Current: ${formatCurrency(alert.current_lowest_price)}\n`;
      report += `   ├─ Savings: ${formatCurrency(alert.savings)} (${alert.savings_percent.toFixed(1)}%)\n`;
      report += `   ├─ Marketplace: ${alert.marketplace_name}\n`;
      
      if (alert.marketplace_url) {
        report += `   ├─ Link: ${alert.marketplace_url}\n`;
      }
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bijakbeli.app';
      report += `   └─ View: ${appUrl}/product/${alert.product_slug}\n\n`;
    }

    report += `\n`;
  }

  report += `─────────────────────────────────\n`;
  report += `💡 Users should be notified via their preferred channels (Email/Push/Telegram/WhatsApp)\n`;

  return report;
}

async function markAlertsAsTriggered(alertIds: string[]) {
  if (alertIds.length === 0) return;

  const { error } = await supabase
    .from('price_alerts')
    .update({
      triggered_at: new Date().toISOString(),
      is_active: false, // Deactivate after triggering
    })
    .in('id', alertIds);

  if (error) {
    console.error('❌ Error marking alerts as triggered:', error);
  } else {
    console.log(`✅ Marked ${alertIds.length} alert(s) as triggered`);
  }
}

async function main() {
  try {
    const triggeredAlerts = await checkPriceAlerts();

    if (triggeredAlerts.length === 0) {
      console.log('\n✨ No triggered alerts at this time');
      return;
    }

    console.log(`\n🎉 Found ${triggeredAlerts.length} triggered alert(s)!\n`);

    // Format report
    const report = formatAlertReport(triggeredAlerts);
    console.log(report);

    // Mark alerts as triggered
    const alertIds = triggeredAlerts.map(a => a.alert_id);
    await markAlertsAsTriggered(alertIds);

    // Output report for Hermes to send
    console.log('\n📤 Report ready for delivery');
    console.log('─────────────────────────────────');
    console.log(report);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
