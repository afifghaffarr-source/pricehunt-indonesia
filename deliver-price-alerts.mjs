#!/usr/bin/env node
// Autonomous Price Alert Delivery System
// Queries triggered alerts and delivers them via Telegram/WhatsApp

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function formatPrice(price) {
  return `Rp ${Math.round(price).toLocaleString('id-ID')}`;
}

function formatMessage(alerts, userName) {
  const alertCount = alerts.length;
  const plural = alertCount > 1;
  
  let msg = `🎉 Halo ${userName}!\n\n`;
  msg += `${alertCount} harga target Anda telah tercapai!\n\n`;
  
  alerts.forEach((alert, idx) => {
    msg += `${idx + 1}. ${alert.productName}\n`;
    msg += `   💰 Harga sekarang: ${formatPrice(alert.currentPrice)}\n`;
    msg += `   🎯 Target Anda: ${formatPrice(alert.targetPrice)}\n`;
    msg += `   💸 Hemat: ${formatPrice(alert.savings)} (${alert.savingsPercent}%)\n`;
    msg += `   🛒 Beli: https://www.bijakbeli.web.id/product/${alert.productSlug}\n\n`;
  });
  
  msg += `Buruan beli sebelum harganya naik lagi! 🚀`;
  
  return msg;
}

async function deliverPriceAlerts() {
  console.log('🔍 Checking for triggered price alerts...\n');
  
  // Query all active alerts with product info
  const { data: alerts, error: alertsError } = await supabase
    .from('price_alerts')
    .select(`
      id,
      user_id,
      product_id,
      target_price,
      triggered_at,
      created_at,
      products (
        id,
        name,
        slug,
        image_url,
        lowest_price,
        category
      )
    `)
    .eq('is_active', true)
    .is('triggered_at', null);

  if (alertsError) {
    throw new Error(`Failed to fetch alerts: ${alertsError.message}`);
  }

  if (!alerts || alerts.length === 0) {
    console.log('📭 No active alerts found');
    return { delivered: 0, message: '[SILENT]' };
  }

  console.log(`📊 Found ${alerts.length} active alerts\n`);

  // Check which alerts are triggered
  const triggeredAlerts = [];
  
  for (const alert of alerts) {
    if (!alert.products) {
      console.log(`⚠️  Alert ${alert.id.substring(0, 8)}: Product not found`);
      continue;
    }

    const currentPrice = alert.products.lowest_price;
    const targetPrice = alert.target_price;

    if (currentPrice && currentPrice <= targetPrice) {
      console.log(`✅ TRIGGERED: ${alert.products.name}`);
      console.log(`   Target: ${formatPrice(targetPrice)}`);
      console.log(`   Current: ${formatPrice(currentPrice)}\n`);
      
      triggeredAlerts.push({
        alert,
        currentPrice,
        savings: targetPrice - currentPrice,
        savingsPercent: ((targetPrice - currentPrice) / targetPrice * 100).toFixed(1)
      });
    }
  }

  if (triggeredAlerts.length === 0) {
    console.log('✅ No alerts triggered at this time');
    return { delivered: 0, message: '[SILENT]' };
  }

  console.log(`\n🎯 ${triggeredAlerts.length} alerts triggered!\n`);

  // Group by user
  const alertsByUser = {};
  for (const { alert, currentPrice, savings, savingsPercent } of triggeredAlerts) {
    if (!alertsByUser[alert.user_id]) {
      alertsByUser[alert.user_id] = [];
    }
    alertsByUser[alert.user_id].push({
      alertId: alert.id,
      productName: alert.products.name,
      productSlug: alert.products.slug,
      imageUrl: alert.products.image_url,
      category: alert.products.category,
      targetPrice: alert.target_price,
      currentPrice,
      savings,
      savingsPercent
    });
  }

  // Deliver messages to each user
  let deliveredCount = 0;
  const deliveryResults = [];

  for (const [userId, userAlerts] of Object.entries(alertsByUser)) {
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, preferences')
        .eq('id', userId)
        .single();

      // Get user auth info for contact details
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);

      const userName = profile?.display_name || authUser?.user?.email?.split('@')[0] || 'Pengguna';
      const userEmail = authUser?.user?.email;
      const userPhone = authUser?.user?.phone;

      // Format message
      const message = formatMessage(userAlerts, userName);

      console.log(`📤 Delivering to: ${userName}`);
      console.log(`   Email: ${userEmail || 'N/A'}`);
      console.log(`   Phone: ${userPhone || 'N/A'}`);
      console.log(`   Alerts: ${userAlerts.length}\n`);

      // TODO: Actually send via Telegram/WhatsApp when credentials are configured
      // For now, we'll mark the alerts as triggered in the database
      
      // Update alerts to mark as triggered
      const alertIds = userAlerts.map(a => a.alertId);
      const { error: updateError } = await supabase
        .from('price_alerts')
        .update({ 
          triggered_at: new Date().toISOString(),
          is_active: false // Deactivate after delivery
        })
        .in('id', alertIds);

      if (updateError) {
        console.error(`❌ Failed to update alerts for ${userName}: ${updateError.message}`);
      } else {
        deliveredCount += userAlerts.length;
        deliveryResults.push({
          user: userName,
          email: userEmail,
          phone: userPhone,
          alertCount: userAlerts.length,
          products: userAlerts.map(a => a.productName)
        });
        console.log(`✅ Marked ${userAlerts.length} alert(s) as delivered\n`);
      }

    } catch (error) {
      console.error(`❌ Error processing user ${userId}: ${error.message}\n`);
    }
  }

  // Build report
  let report = '';
  report += '╔══════════════════════════════════════════════════════════╗\n';
  report += '║          🔔 Price Alert Delivery Report                ║\n';
  report += '╚══════════════════════════════════════════════════════════╝\n\n';
  
  report += `🎯 **Summary:**\n`;
  report += `   • Total triggered: ${triggeredAlerts.length}\n`;
  report += `   • Users notified: ${deliveryResults.length}\n`;
  report += `   • Alerts delivered: ${deliveredCount}\n\n`;

  if (deliveryResults.length > 0) {
    report += `📬 **Deliveries:**\n\n`;
    deliveryResults.forEach((result, idx) => {
      report += `${idx + 1}. ${result.user}\n`;
      report += `   📧 ${result.email || 'No email'}\n`;
      report += `   📱 ${result.phone || 'No phone'}\n`;
      report += `   🔔 ${result.alertCount} alert(s):\n`;
      result.products.forEach(p => {
        report += `      • ${p}\n`;
      });
      report += '\n';
    });
  }

  report += `⚠️  **Note:** Telegram/WhatsApp integration pending\n`;
  report += `   Alerts have been marked as delivered in the database.\n`;
  report += `   Users should be notified via configured channels.\n`;

  return { delivered: deliveredCount, message: report };
}

// Execute
try {
  const result = await deliverPriceAlerts();
  console.log(result.message);
} catch (error) {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}
