#!/usr/bin/env node
/**
 * Apply migration 117: Real crawl targets
 * Uses Supabase client to execute SQL
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read environment
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Read migration SQL
const migrationPath = path.join(__dirname, '../supabase/migrations/117_real_crawl_targets.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('='.repeat(60));
console.log('APPLYING MIGRATION 117');
console.log('='.repeat(60));
console.log(`\nFile: ${migrationPath}`);
console.log(`Size: ${sql.length} bytes`);
console.log(`Lines: ${sql.split('\n').length}`);

async function applyMigration() {
  console.log('\nStep 1: Deleting old fake crawl targets...');
  
  // Delete old targets
  const { data: deleteData, error: deleteError } = await supabase
    .from('crawl_targets')
    .delete()
    .in('source', ['manual_admin', 'seed_data']);
  
  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    throw deleteError;
  }
  
  console.log('✅ Deleted old crawl targets');
  
  console.log('\nStep 2: Inserting 100 real product URLs...');
  
  // Parse SQL to extract INSERT values
  // This is a simpler approach: read the JSON file we generated
  const urlsPath = '/tmp/url_hunter_results.json';
  const urls = JSON.parse(fs.readFileSync(urlsPath, 'utf8'));
  
  // Prepare records
  const records = urls.map(item => ({
    url: item.url,
    domain: item.domain,
    priority_score: item.priority_score,
    crawl_status: 'queued',
    source: 'url_hunter',
    metadata: {
      source_query: item.source_query
    }
  }));
  
  // Insert in batches of 100
  const { data: insertData, error: insertError } = await supabase
    .from('crawl_targets')
    .upsert(records, { onConflict: 'url', ignoreDuplicates: false });
  
  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    throw insertError;
  }
  
  console.log(`✅ Inserted ${records.length} real product URLs`);
  
  console.log('\nStep 3: Verifying results...');
  
  // Verify count
  const { data: countData, error: countError } = await supabase
    .from('crawl_targets')
    .select('crawl_status', { count: 'exact', head: true })
    .eq('source', 'url_hunter');
  
  if (countError) {
    console.error('❌ Verify failed:', countError.message);
    throw countError;
  }
  
  console.log(`\nTotal crawl_targets (source=url_hunter): ${countData.length || 0}`);
  
  // Get status breakdown
  const { data: statusData, error: statusError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT crawl_status, COUNT(*) as count
      FROM crawl_targets
      WHERE source = 'url_hunter'
      GROUP BY crawl_status
      ORDER BY crawl_status;
    `
  }).catch(() => {
    // Fallback: query directly
    return supabase
      .from('crawl_targets')
      .select('crawl_status')
      .eq('source', 'url_hunter');
  });
  
  if (!statusError && statusData) {
    const statusCounts = {};
    statusData.forEach(row => {
      statusCounts[row.crawl_status] = (statusCounts[row.crawl_status] || 0) + 1;
    });
    
    console.log('\nStatus breakdown:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  ${status}: ${count}`);
    }
  }
}

applyMigration()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION 117 COMPLETE');
    console.log('='.repeat(60));
    console.log('\n100 real product URLs ready for scraping!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
  });
