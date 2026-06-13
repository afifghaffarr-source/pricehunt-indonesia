#!/usr/bin/env node
/**
 * Fetch product URLs from BijakBeli database for price collection
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env.local
const envPath = join(__dirname, '../../.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getProductURLs() {
  // Get products with their offers
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      offers (
        id,
        marketplace_id,
        url,
        current_price,
        last_checked_at,
        marketplaces (
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(19);

  if (error) {
    console.error('Database error:', error);
    process.exit(1);
  }

  return products;
}

// Main execution
const products = await getProductURLs();

console.log('='.repeat(80));
console.log('BijakBeli Products with URLs');
console.log('='.repeat(80));
console.log(`Total products: ${products.length}\n`);

let urlCount = 0;
const urlsToUpdate = [];

products.forEach((product, idx) => {
  const hasOffers = product.offers && product.offers.length > 0;
  console.log(`${idx + 1}. ${product.name}`);
  console.log(`   Slug: ${product.slug}`);
  console.log(`   Offers: ${hasOffers ? product.offers.length : 0}`);
  
  if (hasOffers) {
    product.offers.forEach(offer => {
      const marketplace = offer.marketplaces?.name || 'unknown';
      console.log(`   → ${marketplace}: ${offer.url}`);
      urlsToUpdate.push(offer.url);
      urlCount++;
    });
  } else {
    console.log(`   → No offers yet`);
  }
  console.log('');
});

console.log('='.repeat(80));
console.log(`Total URLs to update: ${urlCount}`);
console.log('='.repeat(80));

// Output URLs for processing
if (urlCount > 0) {
  console.log('\nURLs for batch processing:');
  urlsToUpdate.forEach(url => console.log(url));
}
