#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function queryAlerts() {
  console.log('📊 Current Alert Status:\n');
  
  // Get all alerts with product info
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
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!alerts || alerts.length === 0) {
    console.log('No alerts in database');
    return;
  }

  console.log(`Total alerts: ${alerts.length}\n`);

  alerts.forEach((alert, i) => {
    const product = alert.product;
    const currentPrice = product?.lowest_price || 0;
    const targetPrice = alert.target_price;
    const diff = currentPrice - targetPrice;
    const pct = currentPrice > 0 ? ((diff / currentPrice) * 100).toFixed(1) : 0;
    
    console.log(`${i+1}. ${product?.name || 'Unknown Product'}`);
    console.log(`   Status: ${alert.is_active ? '✅ Active' : '❌ Inactive'}`);
    console.log(`   Target: Rp ${targetPrice.toLocaleString('id-ID')}`);
    console.log(`   Current: Rp ${currentPrice.toLocaleString('id-ID')}`);
    console.log(`   Difference: Rp ${Math.abs(diff).toLocaleString('id-ID')} (${diff > 0 ? `${pct}% above` : `${Math.abs(pct)}% below`} target)`);
    console.log(`   Triggered: ${alert.triggered_at ? new Date(alert.triggered_at).toLocaleString('id-ID') : 'Not yet'}`);
    console.log(`   Created: ${new Date(alert.created_at).toLocaleString('id-ID')}`);
    console.log('');
  });

  // Summary
  const active = alerts.filter(a => a.is_active).length;
  const triggered = alerts.filter(a => a.triggered_at).length;
  const ready = alerts.filter(a => a.is_active && !a.triggered_at && a.product?.lowest_price && a.product.lowest_price <= a.target_price).length;

  console.log('📈 Summary:');
  console.log(`   Active: ${active}`);
  console.log(`   Triggered: ${triggered}`);
  console.log(`   Ready to trigger: ${ready}`);
}

queryAlerts();
