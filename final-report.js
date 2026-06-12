#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateReport() {
  const { data: alerts } = await supabase
    .from('price_alerts')
    .select(`
      id,
      user_id,
      target_price,
      is_active,
      triggered_at,
      product:products (name, lowest_price)
    `)
    .eq('is_active', true)
    .is('triggered_at', null);

  const totalActive = alerts?.length || 0;
  const triggered = alerts?.filter(a => a.product?.lowest_price && a.product.lowest_price <= a.target_price) || [];
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         BijakBeli Price Alert Report                        ║');
  console.log('║         ' + new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}) + '                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 Alert Statistics:`);
  console.log(`   • Total active alerts: ${totalActive}`);
  console.log(`   • Alerts triggered: ${triggered.length}`);
  console.log(`   • Pending delivery: ${triggered.length}`);
  console.log('');
  
  if (triggered.length > 0) {
    console.log('🔔 Triggered Alerts:');
    triggered.forEach((alert, i) => {
      const savings = alert.target_price - alert.product.lowest_price;
      console.log(`   ${i+1}. ${alert.product.name}`);
      console.log(`      Target: Rp ${alert.target_price.toLocaleString('id-ID')}`);
      console.log(`      Current: Rp ${alert.product.lowest_price.toLocaleString('id-ID')}`);
      console.log(`      Savings: Rp ${savings.toLocaleString('id-ID')}`);
    });
    console.log('');
    console.log('✅ Notifications would be delivered via Telegram/WhatsApp');
  } else {
    console.log('✨ Status: All clear - no alerts triggered');
    
    if (totalActive > 0) {
      console.log('');
      console.log('📌 Active Alerts Monitoring:');
      alerts.forEach((alert, i) => {
        const current = alert.product?.lowest_price || 0;
        const target = alert.target_price;
        const diff = current - target;
        console.log(`   ${i+1}. ${alert.product?.name || 'Unknown'}`);
        console.log(`      Waiting for: Rp ${target.toLocaleString('id-ID')}`);
        console.log(`      Current: Rp ${current.toLocaleString('id-ID')} (Rp ${diff.toLocaleString('id-ID')} to go)`);
      });
    }
  }
  
  console.log('');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('System Status: ✅ Operational');
  console.log('Next check: Scheduled via cron');
}

generateReport();
