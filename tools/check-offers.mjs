#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: offers } = await supabase
  .from('offers')
  .select('id, url, source, created_at, last_checked_at, current_price')
  .eq('is_active', true)
  .order('created_at', { ascending: false })
  .limit(10);

console.log('Current offers in database:\n');
offers?.forEach(o => {
  console.log(`Source: ${o.source}`);
  console.log(`Created: ${o.created_at}`);
  console.log(`Last checked: ${o.last_checked_at || 'Never'}`);
  console.log(`Price: Rp ${o.current_price.toLocaleString()}`);
  console.log(`URL: ${o.url}`);
  console.log('');
});

console.log(`Total active offers: ${offers?.length || 0}`);
