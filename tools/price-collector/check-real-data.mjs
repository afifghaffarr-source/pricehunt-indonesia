#!/usr/bin/env node
/**
 * Check for real offer data in BijakBeli database
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
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

const supabase = createClient(supabaseUrl, supabaseKey);

// Check offers
const { data: offers, error } = await supabase
  .from('offers')
  .select(`
    id,
    title,
    url,
    current_price,
    last_checked_at,
    source,
    validation_status,
    marketplaces (name)
  `)
  .order('last_checked_at', { ascending: false, nullsLast: true })
  .limit(20);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('='.repeat(80));
console.log('BijakBeli Offers - Real Data Check');
console.log('='.repeat(80));
console.log(`Total offers checked: ${offers.length}\n`);

const realOffers = offers.filter(o => 
  !o.url.includes('official-store') && 
  !o.url.includes('official-shop') &&
  !o.url.includes('test-')
);

console.log(`Real marketplace URLs: ${realOffers.length}`);
console.log(`Placeholder URLs: ${offers.length - realOffers.length}\n`);

if (realOffers.length > 0) {
  console.log('Real offers found:');
  realOffers.forEach((offer, idx) => {
    console.log(`${idx + 1}. ${offer.marketplaces?.name || 'unknown'}`);
    console.log(`   URL: ${offer.url}`);
    console.log(`   Price: Rp${offer.current_price?.toLocaleString() || 'N/A'}`);
    console.log(`   Last checked: ${offer.last_checked_at || 'never'}`);
    console.log(`   Source: ${offer.source}`);
    console.log('');
  });
}
