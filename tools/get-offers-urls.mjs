#!/usr/bin/env node
/**
 * Get product offers with their URLs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Get offers with URLs grouped by product
  const { data: offers, error } = await supabase
    .from('offers')
    .select(`
      id,
      product_id,
      url,
      marketplace_id,
      current_price,
      last_checked_at,
      products(name, slug),
      marketplaces(name)
    `)
    .not('url', 'is', null)
    .eq('is_active', true)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(100);

  if (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${offers.length} offers with URLs\n`);

  // Group by product
  const byProduct = {};
  offers.forEach(offer => {
    const productId = offer.product_id;
    if (!byProduct[productId]) {
      byProduct[productId] = {
        name: offer.products?.name || 'Unknown',
        slug: offer.products?.slug || 'unknown',
        offers: []
      };
    }
    byProduct[productId].offers.push({
      url: offer.url,
      marketplace: offer.marketplaces?.name || 'Unknown',
      price: offer.current_price,
      last_checked: offer.last_checked_at
    });
  });

  // Display top 10 products by offer count
  const sorted = Object.entries(byProduct)
    .sort((a, b) => b[1].offers.length - a[1].offers.length)
    .slice(0, 10);

  console.log('📊 Top 10 products by offer count:\n');
  sorted.forEach(([productId, data], idx) => {
    console.log(`${idx + 1}. ${data.name}`);
    console.log(`   Offers: ${data.offers.length}`);
    data.offers.forEach(offer => {
      console.log(`   - [${offer.marketplace}] ${offer.url}`);
    });
    console.log('');
  });

  // Output all URLs for batch collection
  console.log('\n📋 All URLs (for batch collection):\n');
  offers.forEach(offer => {
    console.log(offer.url);
  });
}

main().catch(console.error);
