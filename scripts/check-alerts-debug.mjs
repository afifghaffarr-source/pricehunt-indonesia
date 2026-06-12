#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select(`
      id,
      target_price,
      is_active,
      triggered_at,
      created_at,
      products(name, slug, lowest_price, highest_price)
    `)
    .eq('is_active', true)
    .is('triggered_at', null);
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log('Active alerts:', alerts.length);
  for (const alert of alerts) {
    console.log('\nAlert:', {
      product: alert.products?.name,
      target_price: alert.target_price,
      current_lowest: alert.products?.lowest_price,
      triggered: alert.products?.lowest_price <= alert.target_price
    });
  }
}

main();
