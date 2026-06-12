#!/usr/bin/env node
// Check for alerts that were previously triggered but not delivered

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTriggeredAlerts() {
  console.log('🔍 Checking for previously triggered but undelivered alerts...\n');

  // Check alerts that have triggered_at set but are still active
  const { data: triggered, error } = await supabase
    .from('price_alerts')
    .select(`
      id,
      user_id,
      product_id,
      target_price,
      triggered_at,
      is_active,
      created_at,
      products (
        id,
        name,
        slug,
        image_url,
        lowest_price
      )
    `)
    .eq('is_active', true)
    .not('triggered_at', 'is', null);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!triggered || triggered.length === 0) {
    console.log('✅ No previously triggered alerts found');
    return;
  }

  console.log(`📬 Found ${triggered.length} previously triggered alerts:\n`);
  
  for (const alert of triggered) {
    console.log(`Alert ${alert.id.substring(0, 8)}...`);
    console.log(`  Product: ${alert.products?.name || 'Unknown'}`);
    console.log(`  Triggered: ${alert.triggered_at}`);
    console.log(`  Target: Rp ${alert.target_price.toLocaleString('id-ID')}`);
    console.log(`  Current: Rp ${alert.products?.lowest_price?.toLocaleString('id-ID') || 'N/A'}`);
    console.log('');
  }

  return triggered;
}

checkTriggeredAlerts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
