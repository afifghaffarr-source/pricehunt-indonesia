#!/usr/bin/env node
/**
 * Apply Migration 110 to Supabase Database
 * Uses service role key to execute SQL directly
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Your Supabase service role key
 * 
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node tools/apply_migration.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load .env.local
config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read from environment variables (NEVER hardcode!)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL=https://xxx.supabase.co');
  console.error('   SUPABASE_SERVICE_KEY=your-service-role-key');
  console.error('\nSet them in .env.local or pass as command args');
  process.exit(1);
}

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
    
    // Fallback: Try using psql with connection string from env
    const DB_URL = process.env.DATABASE_URL;
    if (!DB_URL) {
      console.error('\n❌ DATABASE_URL not set for psql fallback');
      console.log('⚠️  Please apply migration manually via Supabase Dashboard');
      process.exit(1);
    }
    
    const { execSync } = await import('child_process');
    try {
      const result = execSync(
        `psql "${DB_URL}" -f "${migrationPath}"`,
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
