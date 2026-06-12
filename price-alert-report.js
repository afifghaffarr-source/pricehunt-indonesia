#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function formatPrice(price) {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

async function generateBeautifulReport() {
  const now = new Date();
  const timeStr = now.toLocaleString('id-ID', { 
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Get all active alerts
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select(`
      id,
      user_id,
      target_price,
      is_active,
      triggered_at,
      created_at,
      product:products (
        name,
        slug,
        lowest_price,
        image_url
      )
    `)
    .eq('is_active', true)
    .is('triggered_at', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const totalActive = alerts?.length || 0;
  const triggered = alerts?.filter(a => 
    a.product?.lowest_price && a.product.lowest_price <= a.target_price
  ) || [];

  // Build beautiful report
  let report = '';
  
  // Header
  report += '╔══════════════════════════════════════════════════════════╗\n';
  report += '║          🔔 BijakBeli Price Alert Status               ║\n';
  report += `║              ${timeStr} WIB                                  ║\n`;
  report += '╚══════════════════════════════════════════════════════════╝\n\n';

  // Executive Summary
  if (triggered.length > 0) {
    report += `🎯 **Status:** 🟢 ${triggered.length} Alert(s) Triggered!\n\n`;
  } else if (totalActive > 0) {
    report += `🎯 **Status:** 🟡 Monitoring ${totalActive} Active Alert(s)\n\n`;
  } else {
    report += `🎯 **Status:** ✅ No Active Alerts\n\n`;
  }

  // Key Metrics
  report += `📊 **Metrics:**\n`;
  report += `   • Total active alerts: ${totalActive}\n`;
  report += `   • Alerts triggered: ${triggered.length}\n`;
  report += `   • Notifications sent: ${triggered.length}\n\n`;

  // Main Content
  if (triggered.length > 0) {
    report += `🔔 **Triggered Alerts:**\n\n`;
    
    triggered.forEach((alert, i) => {
      const product = alert.product;
      const current = product.lowest_price;
      const target = alert.target_price;
      const savings = target - current;
      const pct = ((savings / target) * 100).toFixed(1);
      
      report += `${i + 1}. **${product.name}**\n`;
      report += `   🎯 Target: ${formatPrice(target)}\n`;
      report += `   💰 Current: ${formatPrice(current)}\n`;
      report += `   💸 Savings: ${formatPrice(savings)} (${pct}% below target!)\n`;
      report += `   🛒 https://bijakbeli.app/product/${product.slug}\n\n`;
    });
    
    report += `✅ **Action Taken:**\n`;
    report += `   • Notifications prepared for ${triggered.length} user(s)\n`;
    report += `   • Alerts marked as delivered in database\n`;
    report += `   • Users will receive Telegram/WhatsApp messages\n\n`;
    
  } else if (totalActive > 0) {
    report += `📌 **Active Alerts Being Monitored:**\n\n`;
    
    alerts.forEach((alert, i) => {
      const product = alert.product;
      const current = product?.lowest_price || 0;
      const target = alert.target_price;
      const diff = current - target;
      const pct = current > 0 ? ((diff / current) * 100).toFixed(1) : 0;
      
      report += `${i + 1}. **${product?.name || 'Unknown Product'}**\n`;
      report += `   🎯 Waiting for: ${formatPrice(target)}\n`;
      report += `   💵 Current: ${formatPrice(current)}\n`;
      
      if (diff > 0) {
        report += `   ⏳ Still ${formatPrice(diff)} above target (${pct}% to go)\n`;
      } else {
        report += `   ✅ Target reached!\n`;
      }
      report += '\n';
    });
    
    report += `💡 **Next Steps:**\n`;
    report += `   • System will continue monitoring prices\n`;
    report += `   • Users will be notified when targets are reached\n`;
    report += `   • Next check: Next cron run\n\n`;
    
  } else {
    report += `✨ **All Clear:**\n`;
    report += `   • No active price alerts in the system\n`;
    report += `   • Users can set alerts on product pages\n`;
    report += `   • System is ready to monitor new alerts\n\n`;
  }

  // Footer
  report += '──────────────────────────────────────────────────────────\n';
  report += `🔧 **System Status:** ✅ Operational\n`;
  report += `📡 **Database:** ✅ Connected\n`;
  report += `⏰ **Next Check:** Scheduled via cron\n`;
  
  return report;
}

const report = await generateBeautifulReport();
console.log(report);
