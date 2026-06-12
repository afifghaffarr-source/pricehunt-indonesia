#!/usr/bin/env node
// Price Alert Checker - Autonomous cron job
// Checks for triggered alerts and delivers notifications

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPriceAlerts() {
  try {
    console.log('🔍 Checking for triggered price alerts...\n');

    // Get all active alerts
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
      console.error('❌ Error fetching alerts:', alertsError);
      return;
    }

    if (!alerts || alerts.length === 0) {
      console.log('📭 No active alerts found');
      return;
    }

    console.log(`📊 Found ${alerts.length} active alerts\n`);

    // Check which alerts have been triggered
    const triggeredAlerts = [];
    
    for (const alert of alerts) {
      if (!alert.products) {
        console.log(`⚠️  Alert ${alert.id}: Product not found`);
        continue;
      }

      const currentPrice = alert.products.lowest_price;
      const targetPrice = alert.target_price;

      console.log(`Alert ${alert.id.substring(0, 8)}...`);
      console.log(`  Product: ${alert.products.name}`);
      console.log(`  Target: Rp ${targetPrice.toLocaleString('id-ID')}`);
      console.log(`  Current: Rp ${currentPrice ? currentPrice.toLocaleString('id-ID') : 'N/A'}`);

      if (currentPrice && currentPrice <= targetPrice) {
        console.log(`  ✅ TRIGGERED! Price reached target\n`);
        triggeredAlerts.push({
          alert,
          currentPrice,
          savings: targetPrice - currentPrice,
          savingsPercent: ((targetPrice - currentPrice) / targetPrice * 100).toFixed(1)
        });
      } else {
        console.log(`  ⏳ Not triggered yet\n`);
      }
    }

    if (triggeredAlerts.length === 0) {
      console.log('✅ No alerts triggered at this time');
      return;
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

    console.log('📦 Alerts grouped by user:');
    for (const [userId, userAlerts] of Object.entries(alertsByUser)) {
      console.log(`\n👤 User ${userId.substring(0, 8)}... (${userAlerts.length} alerts)`);
      for (const alert of userAlerts) {
        console.log(`   • ${alert.productName}`);
        console.log(`     💰 Rp ${alert.currentPrice.toLocaleString('id-ID')} (save Rp ${alert.savings.toLocaleString('id-ID')}, ${alert.savingsPercent}%)`);
      }
    }

    // Check for user contact info
    console.log('\n📞 Checking user contact information...');
    
    for (const userId of Object.keys(alertsByUser)) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, display_name, preferences')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.log(`⚠️  Could not fetch profile for user ${userId.substring(0, 8)}...`);
        continue;
      }

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authError) {
        console.log(`⚠️  Could not fetch auth info for user ${userId.substring(0, 8)}...`);
        continue;
      }

      console.log(`\n👤 ${profile?.display_name || 'Unknown User'}`);
      console.log(`   Email: ${authUser.user?.email || 'N/A'}`);
      console.log(`   Phone: ${authUser.user?.phone || 'N/A'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total active alerts: ${alerts.length}`);
    console.log(`Triggered alerts: ${triggeredAlerts.length}`);
    console.log(`Users to notify: ${Object.keys(alertsByUser).length}`);
    console.log('='.repeat(60));

    return {
      totalAlerts: alerts.length,
      triggeredCount: triggeredAlerts.length,
      alertsByUser,
      hasTriggered: triggeredAlerts.length > 0
    };

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    throw error;
  }
}

// Run the check
checkPriceAlerts()
  .then((result) => {
    if (result && result.hasTriggered) {
      console.log('\n⚠️  NOTE: Messaging infrastructure (Telegram/WhatsApp) not yet configured');
      console.log('ℹ️  Alerts detected but cannot be delivered to users');
      process.exit(0);
    } else {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
