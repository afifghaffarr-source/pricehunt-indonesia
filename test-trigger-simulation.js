#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simulate what would happen if price drops below target
async function simulateTriggeredAlert() {
  console.log('🧪 Simulating triggered alert scenario...\n');
  
  const mockAlerts = [{
    id: 'test-123',
    user_id: 'test-user-456',
    target_price: 360000,
    created_at: new Date().toISOString(),
    product: {
      id: 'prod-789',
      name: 'Xiaomi Smart Band 8',
      slug: 'xiaomi-smart-band-8',
      image_url: 'https://example.com/image.jpg',
      lowest_price: 349000  // Dropped below target!
    }
  }];

  console.log('📋 Simulated triggered alerts:\n');
  
  mockAlerts.forEach(alert => {
    const product = alert.product;
    const currentPrice = product.lowest_price;
    const targetPrice = alert.target_price;
    const savings = targetPrice - currentPrice;
    const percentage = ((savings / targetPrice) * 100).toFixed(1);
    
    console.log(`🎯 ${product.name}`);
    console.log(`   Target: Rp ${targetPrice.toLocaleString('id-ID')}`);
    console.log(`   Current: Rp ${currentPrice.toLocaleString('id-ID')}`);
    console.log(`   Savings: Rp ${savings.toLocaleString('id-ID')} (${percentage}% below target!)`);
    console.log('');
  });

  // Format the notification message
  const userName = 'User';
  let message = `🎉 *Price Alert Triggered!*\n\n`;
  message += `Hi ${userName}! Great news — your price target has been reached:\n\n`;

  mockAlerts.forEach((alert, index) => {
    const product = alert.product;
    const currentPrice = product.lowest_price;
    const targetPrice = alert.target_price;
    const savings = targetPrice - currentPrice;
    const percentage = ((savings / targetPrice) * 100).toFixed(1);
    
    message += `*${index + 1}. ${product.name}*\n`;
    message += `├ 🎯 Your Target: Rp ${targetPrice.toLocaleString('id-ID')}\n`;
    message += `├ 💰 Current Price: Rp ${currentPrice.toLocaleString('id-ID')}\n`;
    message += `├ 💸 Extra Savings: Rp ${savings.toLocaleString('id-ID')} (${percentage}% below target!)\n`;
    message += `└ 🛒 Buy now: https://www.bijakbeli.web.id/product/${product.slug}\n\n`;
  });

  message += `\n⏰ *Act fast!* Prices can change anytime.\n`;
  message += `📱 Manage your alerts: https://www.bijakbeli.web.id/settings/notifications\n\n`;
  message += `_BijakBeli.app — Beli yang Tepat, di Waktu yang Tepat_ 🎯`;

  console.log('📤 Formatted notification message:\n');
  console.log('═'.repeat(70));
  console.log(message);
  console.log('═'.repeat(70));
  console.log(`\n✅ Message ready for delivery (${message.length} characters)`);
  console.log('\n💡 In production, this would be sent via Telegram/WhatsApp');
}

simulateTriggeredAlert();
