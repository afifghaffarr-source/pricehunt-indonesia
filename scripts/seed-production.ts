#!/usr/bin/env bun
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TOKOPEDIA_ID = 'b5955e0a-8f32-43e3-bd5c-c5d37b333efa'
const SHOPEE_ID = 'c60af940-c71e-4a81-ad50-bfab7875a35f'

async function seedProduction() {
  console.log('🌱 Seeding production database...\n')

  // 1. Get or create products
  console.log('📦 Checking products...')
  let { data: products } = await supabase
    .from('products')
    .select('*')
    .in('slug', ['iphone-15-pro-max-256gb', 'samsung-galaxy-s24-ultra-512gb', 'sony-wh-1000xm5-wireless-headphones'])

  if (!products || products.length === 0) {
    console.log('📦 Creating products...')
    const { data: newProducts, error } = await supabase
      .from('products')
      .insert([
        {
          name: 'iPhone 15 Pro Max 256GB',
          slug: 'iphone-15-pro-max-256gb',
          description: 'iPhone 15 Pro Max dengan chip A17 Pro, kamera 48MP, dan layar Super Retina XDR 6.7 inch.',
          image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
          category: 'Smartphone',
          specs: {
            brand: 'Apple',
            model: 'iPhone 15 Pro Max',
            storage: '256GB',
            processor: 'A17 Pro'
          }
        },
        {
          name: 'Samsung Galaxy S24 Ultra 512GB',
          slug: 'samsung-galaxy-s24-ultra-512gb',
          description: 'Samsung Galaxy S24 Ultra dengan S Pen, kamera 200MP, dan layar Dynamic AMOLED 6.8 inch.',
          image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
          category: 'Smartphone',
          specs: {
            brand: 'Samsung',
            model: 'Galaxy S24 Ultra',
            storage: '512GB'
          }
        },
        {
          name: 'Sony WH-1000XM5 Wireless Headphones',
          slug: 'sony-wh-1000xm5-wireless-headphones',
          description: 'Headphone nirkabel premium dengan noise cancellation terbaik di kelasnya.',
          image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
          category: 'Audio',
          specs: {
            brand: 'Sony',
            model: 'WH-1000XM5'
          }
        }
      ])
      .select()

    if (error) {
      console.error('❌ Error creating products:', error)
      return
    }
    products = newProducts
  }

  console.log(`✅ ${products.length} products ready\n`)

  // 2. Create offers (using CORRECT schema!)
  console.log('💰 Creating offers...')
  
  const offers = [
    // iPhone - Tokopedia Official
    {
      product_id: products[0].id,
      marketplace_id: TOKOPEDIA_ID,
      url: 'https://www.tokopedia.com/apple/iphone-15-pro-max-256gb',
      title: 'iPhone 15 Pro Max 256GB - Natural Titanium',
      price: 21999000,
      original_price: 23999000,
      // discount_percentage - auto-calculated
      in_stock: true,
      seller_name: 'Apple Official Store',
      seller_rating: 4.9,
      shipping_cost: 0,
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400',
      category_hint: 'Smartphone',
      validation_status: 'pending',
      confidence_label: 'sangat dipercaya'
    },
    // iPhone - Shopee Official
    {
      product_id: products[0].id,
      marketplace_id: SHOPEE_ID,
      url: 'https://shopee.co.id/apple-official/iphone-15-pro-max-256gb',
      title: 'iPhone 15 Pro Max 256GB Official',
      price: 21499000,
      original_price: 23999000,
      // discount_percentage - auto-calculated
      in_stock: true,
      seller_name: 'Apple Official Shop',
      seller_rating: 4.8,
      shipping_cost: 0,
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400',
      category_hint: 'Smartphone',
      validation_status: 'pending',
      confidence_label: 'sangat dipercaya'
    },
    // iPhone - Suspicious deal
    {
      product_id: products[0].id,
      marketplace_id: TOKOPEDIA_ID,
      url: 'https://www.tokopedia.com/gadgetmurah/iphone-15-pro-max-256gb',
      title: 'iPhone 15 Pro Max 256GB Murah Banget!!!',
      price: 15999000,
      original_price: 23999000,
      // discount_percentage - auto-calculated
      in_stock: true,
      seller_name: 'GadgetMurah123',
      seller_rating: 3.2,
      shipping_cost: 50000,
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400',
      category_hint: 'Smartphone',
      validation_status: 'pending',
      confidence_label: 'perlu dicek ulang'
    },
    // Samsung - Tokopedia
    {
      product_id: products[1].id,
      marketplace_id: TOKOPEDIA_ID,
      url: 'https://www.tokopedia.com/samsung/galaxy-s24-ultra-512gb',
      title: 'Samsung Galaxy S24 Ultra 512GB',
      price: 24999000,
      original_price: 26999000,
      // discount_percentage - auto-calculated
      in_stock: true,
      seller_name: 'Samsung Official Store',
      seller_rating: 4.9,
      shipping_cost: 0,
      image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
      category_hint: 'Smartphone',
      validation_status: 'pending',
      confidence_label: 'sangat dipercaya'
    },
    // Samsung - Shopee
    {
      product_id: products[1].id,
      marketplace_id: SHOPEE_ID,
      url: 'https://shopee.co.id/samsung-official/galaxy-s24-ultra-512gb',
      title: 'Galaxy S24 Ultra 512GB Official',
      price: 24899000,
      original_price: 26999000,
      // discount_percentage - auto-calculated
      in_stock: true,
      seller_name: 'Samsung Official Shop',
      seller_rating: 4.9,
      shipping_cost: 0,
      image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
      category_hint: 'Smartphone',
      validation_status: 'pending',
      confidence_label: 'sangat dipercaya'
    },
    // Sony - Tokopedia
    {
      product_id: products[2].id,
      marketplace_id: TOKOPEDIA_ID,
      url: 'https://www.tokopedia.com/sony/wh-1000xm5',
      title: 'Sony WH-1000XM5 Black',
      price: 5499000,
      original_price: 5999000,
      // discount_percentage - auto-calculated
      in_stock: true,
      seller_name: 'Sony Official Store',
      seller_rating: 4.8,
      shipping_cost: 0,
      image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400',
      category_hint: 'Audio',
      validation_status: 'pending',
      confidence_label: 'dipercaya'
    },
    // Sony - Shopee
    {
      product_id: products[2].id,
      marketplace_id: SHOPEE_ID,
      url: 'https://shopee.co.id/sony-official/wh-1000xm5',
      title: 'Sony WH-1000XM5 Wireless',
      price: 5399000,
      original_price: 5999000,
      // discount_percentage - auto-calculated
      in_stock: true,
      seller_name: 'Sony Official Shop',
      seller_rating: 4.7,
      shipping_cost: 0,
      image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400',
      category_hint: 'Audio',
      validation_status: 'pending',
      confidence_label: 'dipercaya'
    }
  ]

  const { data: insertedOffers, error: offersError } = await supabase
    .from('offers')
    .insert(offers)
    .select()

  if (offersError) {
    console.error('❌ Error creating offers:', offersError)
    return
  }

  console.log(`✅ Created ${insertedOffers.length} offers\n`)

  console.log('✨ Production data seeded successfully!\n')
  console.log('📊 Summary:')
  console.log(`   - ${products.length} products`)
  console.log(`   - ${insertedOffers.length} offers`)
  console.log('\n🌐 Check: https://pricehunt-indonesia.vercel.app/api/products')
}

seedProduction().catch(console.error)
