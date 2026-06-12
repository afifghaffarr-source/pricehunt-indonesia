#!/usr/bin/env node
/**
 * Quick script to fetch products with their crawl targets
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Get products with their crawl targets
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug
    `)
    .limit(20);

  if (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${products.length} products\n`);

  // For each product, get their crawl targets
  for (const product of products) {
    const { data: targets, error: targetsError } = await supabase
      .from('crawl_targets')
      .select('url, marketplace_id, priority_score, last_crawled_at')
      .eq('product_id', product.id)
      .order('priority_score', { ascending: false });

    if (targetsError) {
      console.error(`❌ Error fetching targets for ${product.name}:`, targetsError);
      continue;
    }

    console.log(`📦 ${product.name}`);
    console.log(`   Targets: ${targets?.length || 0}`);
    
    if (targets && targets.length > 0) {
      targets.forEach(t => {
        console.log(`   - ${t.url}`);
      });
    }
    console.log('');
  }
}

main().catch(console.error);
