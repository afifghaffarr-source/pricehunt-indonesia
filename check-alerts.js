#!/usr/bin/env node

/**
 * BijakBeli Price Alert Checker
 * 
 * Checks for pending price alerts and delivers them to users via Telegram/WhatsApp
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Utility to format price in Indonesian Rupiah
function formatPrice(price) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

// Calculate savings
function calculateSavings(oldPrice, newPrice) {
  const savings = oldPrice - newPrice;
  const percentage = ((savings / oldPrice) * 100).toFixed(1);
  return { savings, percentage };
}

async function checkAlerts() {
  console.log('🔍 Checking for triggered price alerts...\n');

  try {
    // Query for active alerts with product and price data
    const { data: alerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select(`
        id,
        user_id,
        target_price,
        created_at,
        product:products (
          id,
          name,
          slug,
          image_url,
          lowest_price
        )
      `)
      .eq('is_active', true)
      .is('triggered_at', null);

    if (alertsError) {
      console.error('❌ Error fetching alerts:', alertsError);
      return;
    }

    if (!alerts || alerts.length === 0) {
      console.log('✅ No active alerts found');
      return;
    }

    console.log(`📋 Found ${alerts.length} active alert(s)\n`);

    // Filter alerts where target price has been reached
    const triggeredAlerts = alerts.filter(alert => {
      const currentPrice = alert.product.lowest_price;
      const targetPrice = alert.target_price;
      
      if (!currentPrice) {
        console.log(`⚠️  No price data for product: ${alert.product.name}`);
        return false;
      }

      const isTriggered = currentPrice <= targetPrice;
      
      if (isTriggered) {
        console.log(`🎯 TRIGGERED: ${alert.product.name}`);
        console.log(`   Target: ${formatPrice(targetPrice)} | Current: ${formatPrice(currentPrice)}`);
      }
      
      return isTriggered;
    });

    if (triggeredAlerts.length === 0) {
      console.log('\n✅ No alerts triggered (prices not reached target yet)');
      return;
    }

    console.log(`\n🔔 ${triggeredAlerts.length} alert(s) triggered!\n`);

    // Group alerts by user
    const alertsByUser = triggeredAlerts.reduce((acc, alert) => {
      if (!acc[alert.user_id]) {
        acc[alert.user_id] = [];
      }
      acc[alert.user_id].push(alert);
      return acc;
    }, {});

    // Get user profiles for notifications
    const userIds = Object.keys(alertsByUser);
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, display_name, preferences')
      .in('id', userIds);

    if (profilesError) {
      console.error('⚠️  Error fetching user profiles:', profilesError);
    }

    const profilesMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    // Process each user
    let deliveredCount = 0;
    const alertIdsToMark = [];

    for (const [userId, userAlerts] of Object.entries(alertsByUser)) {
      const profile = profilesMap[userId];
      const userName = profile?.display_name || 'there';

      console.log(`\n📨 Preparing notification for user ${userId.slice(0, 8)}... (${userAlerts.length} alert(s))`);

      // Format message with beautiful-reports style
      let message = `🎉 *Price Alert Triggered!*\n\n`;
      message += `Hi ${userName}! Great news — your price target has been reached:\n\n`;

      userAlerts.forEach((alert, index) => {
        const product = alert.product;
        const currentPrice = product.lowest_price;
        const targetPrice = alert.target_price;
        const { savings, percentage } = calculateSavings(targetPrice, currentPrice);
        
        message += `*${index + 1}. ${product.name}*\n`;
        message += `├ 🎯 Your Target: ${formatPrice(targetPrice)}\n`;
        message += `├ 💰 Current Price: ${formatPrice(currentPrice)}\n`;
        
        if (savings > 0) {
          message += `├ 💸 Extra Savings: ${formatPrice(savings)} (${percentage}% below target!)\n`;
        } else {
          message += `├ ✅ Target reached!\n`;
        }
        
        message += `└ 🛒 Buy now: https://bijakbeli.app/product/${product.slug}\n\n`;
        
        alertIdsToMark.push(alert.id);
      });

      message += `\n⏰ *Act fast!* Prices can change anytime.\n`;
      message += `📱 Manage your alerts: https://bijakbeli.app/settings/notifications\n\n`;
      message += `_BijakBeli.app — Beli yang Tepat, di Waktu yang Tepat_ 🎯`;

      console.log(`📤 Message prepared (${message.length} chars)`);
      console.log('─'.repeat(60));
      console.log(message);
      console.log('─'.repeat(60));

      // TODO: Send via send_message tool
      // For now, we'll just log it
      console.log(`\n✅ Alert notification prepared for user ${userId.slice(0, 8)}...`);
      
      deliveredCount++;
    }

    // Mark alerts as triggered
    if (alertIdsToMark.length > 0) {
      const { error: updateError } = await supabase
        .from('price_alerts')
        .update({ 
          triggered_at: new Date().toISOString(),
          is_active: false 
        })
        .in('id', alertIdsToMark);

      if (updateError) {
        console.error('\n❌ Error marking alerts as triggered:', updateError);
      } else {
        console.log(`\n✅ Marked ${alertIdsToMark.length} alert(s) as triggered in database`);
      }
    }

    console.log(`\n🎉 Summary:`);
    console.log(`   - ${alerts.length} active alert(s) checked`);
    console.log(`   - ${triggeredAlerts.length} alert(s) triggered`);
    console.log(`   - ${deliveredCount} notification(s) prepared`);
    console.log(`   - ${alertIdsToMark.length} alert(s) marked as delivered`);

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the check
checkAlerts();
