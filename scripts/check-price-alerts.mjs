#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

function calculateSavings(targetPrice, currentPrice) {
  const savings = targetPrice - currentPrice;
  const percentage = ((savings / targetPrice) * 100).toFixed(1);
  return { savings, percentage };
}

async function main() {
  console.log('🔔 Checking price alerts...');
  
  // Query active alerts that haven't been triggered yet
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select(`
      id,
      user_id,
      target_price,
      triggered_at,
      products(id, name, slug, lowest_price, image_url)
    `)
    .eq('is_active', true)
    .is('triggered_at', null);
  
  if (error) {
    console.error('❌ Error fetching alerts:', error);
    process.exit(1);
  }
  
  console.log(`📊 Found ${alerts.length} active alerts`);
  
  // Filter alerts where target price is reached
  const triggeredAlerts = alerts.filter(alert => {
    const currentPrice = alert.products?.lowest_price;
    return currentPrice && currentPrice > 0 && currentPrice <= alert.target_price;
  });
  
  console.log(`🎯 ${triggeredAlerts.length} alerts triggered`);
  
  if (triggeredAlerts.length === 0) {
    console.log('✅ No alerts to deliver');
    return;
  }
  
  // Group alerts by user
  const alertsByUser = new Map();
  for (const alert of triggeredAlerts) {
    if (!alertsByUser.has(alert.user_id)) {
      alertsByUser.set(alert.user_id, []);
    }
    alertsByUser.get(alert.user_id).push(alert);
  }
  
  console.log(`👥 Alerts for ${alertsByUser.size} users`);
  
  let successCount = 0;
  let failedCount = 0;
  
  // Process each user's alerts
  for (const [userId, userAlerts] of alertsByUser.entries()) {
    try {
      // Fetch user data
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError || !userData.user) {
        console.error(`❌ Failed to fetch user ${userId}:`, userError);
        failedCount += userAlerts.length;
        continue;
      }
      
      const userName = userData.user.user_metadata?.display_name || 'Pemburu Harga';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Format message for this user
      let message = `🔔 *ALERT HARGA!*\n\n`;
      message += `Hai ${userName}! 🎉\n\n`;
      message += `Produk yang Anda pantau sudah mencapai target harga:\n\n`;
      
      for (let i = 0; i < userAlerts.length; i++) {
        const alert = userAlerts[i];
        const product = alert.products;
        const currentPrice = product.lowest_price;
        const { savings, percentage } = calculateSavings(alert.target_price, currentPrice);
        
        message += `${i + 1}. *${product.name}*\n`;
        message += `   Target: ${formatRupiah(alert.target_price)}\n`;
        message += `   Harga sekarang: ${formatRupiah(currentPrice)} ✨\n`;
        message += `   Hemat: ${formatRupiah(savings)} (${percentage}%)\n`;
        message += `   Link: ${appUrl}/product/${product.slug}\n\n`;
      }
      
      message += `⚡ Buruan cek sebelum harga naik lagi!\n`;
      message += `💡 Harga bisa berubah sewaktu-waktu.`;
      
      // Send via Telegram
      try {
        execSync(`hermes send --to telegram:AGR "${message.replace(/"/g, '\\"')}"`, {
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        console.log(`✅ Sent ${userAlerts.length} alerts to ${userName}`);
        
        // Mark alerts as delivered
        for (const alert of userAlerts) {
          const { error: updateError } = await supabase
            .from('price_alerts')
            .update({
              triggered_at: new Date().toISOString(),
              is_active: false
            })
            .eq('id', alert.id);
          
          if (updateError) {
            console.error(`⚠️  Failed to mark alert ${alert.id} as delivered:`, updateError);
          }
        }
        
        successCount += userAlerts.length;
      } catch (sendError) {
        console.error(`❌ Failed to send message to ${userName}:`, sendError.message);
        failedCount += userAlerts.length;
      }
      
    } catch (error) {
      console.error(`❌ Error processing user ${userId}:`, error);
      failedCount += userAlerts.length;
    }
  }
  
  console.log('\n📈 Summary:');
  console.log(`   Total triggered: ${triggeredAlerts.length}`);
  console.log(`   Successfully sent: ${successCount}`);
  console.log(`   Failed: ${failedCount}`);
  
  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
