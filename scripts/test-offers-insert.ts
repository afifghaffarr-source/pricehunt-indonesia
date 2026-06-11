#!/usr/bin/env bun
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  console.log('🧪 Testing offers insert with real UUIDs...\n')

  const TOKOPEDIA_ID = 'b5955e0a-8f32-43e3-bd5c-c5d37b333efa'
  const SHOPEE_ID = 'c60af940-c71e-4a81-ad50-bfab7875a35f'

  // Get first product
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .limit(1)

  if (!products || products.length === 0) {
    console.log('❌ No products')
    return
  }

  console.log(`✅ Product ID: ${products[0].id}`)

  // Try with only required fields
  console.log('\n💰 Test 1: With price field...')
  const { data: offer1, error: error1 } = await supabase
    .from('offers')
    .insert([{
      product_id: products[0].id,
      marketplace_id: TOKOPEDIA_ID,
      url: 'https://tokopedia.com/test-' + Date.now(),
      price: 21999000
    }])
    .select()

  if (error1) {
    console.log('❌ Error:', error1.message)
    console.log('Details:', error1.details || 'none')
  } else {
    console.log('✅ SUCCESS!', offer1)
  }
}

testInsert().catch(console.error)
