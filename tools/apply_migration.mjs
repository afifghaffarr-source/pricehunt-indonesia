#!/usr/bin/env node
/**
 * Apply Migration 110 to Supabase Database
 * Uses service role key to execute SQL directly
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://oklaxwjoyttpwgxhphko.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGF4d2pveXR0cHdneGhwaGtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDgwMDE1MywiZXhwIjoyMDk2Mzc2MTUzfQ.r8WXjPpakSohNaNpwezvPWwU9HKoaCmJOAx-98yf4bE';

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function main() {
  console.log('🚀 Applying Migration 110...\n');

  // Read migration file
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '110_enhanced_data_collection.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log(`📄 Migration file: ${migrationPath}`);
  console.log(`📏 SQL size: ${sql.length} bytes\n`);

  try {
    console.log('⏳ Executing SQL via Supabase REST API...');
    const result = await executeSql(sql);
    console.log('✅ Migration applied successfully!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Trying alternative: Direct PostgreSQL execution...');
    
    // Fallback: Try using psql with connection string
    const { execSync } = await import('child_process');
    try {
      const result = execSync(
        `psql "postgresql://postgres.oklaxwjoyttpwgxhphko:${SERVICE_KEY}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" -f "${migrationPath}"`,
        { encoding: 'utf-8' }
      );
      console.log(result);
      console.log('✅ Migration applied via psql!');
    } catch (psqlError) {
      console.error('❌ psql also failed:', psqlError.message);
      console.log('\n⚠️  Please apply migration manually via Supabase Dashboard');
      process.exit(1);
    }
  }
}

main().catch(console.error);
