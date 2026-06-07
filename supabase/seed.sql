-- =============================================
-- PriceHunt Indonesia — Seed Data
-- =============================================
-- Jalankan SETELAH schema migration.
-- Paste di Supabase SQL Editor > New Query > Run.
-- =============================================

-- 1. MARKETPLACES
-- =============================================
INSERT INTO marketplaces (name, display_name, base_url, color) VALUES
  ('tokopedia', 'Tokopedia', 'https://tokopedia.com', '#42b549'),
  ('shopee', 'Shopee', 'https://shopee.co.id', '#ee4d2d'),
  ('bukalapak', 'Bukalapak', 'https://bukalapak.com', '#e31e52'),
  ('lazada', 'Lazada', 'https://lazada.co.id', '#0f146d'),
  ('blibli', 'Blibli', 'https://blibli.com', '#0095da'),
  ('tiktok', 'TikTok Shop', 'https://shop.tiktok.com', '#010101')
ON CONFLICT (name) DO NOTHING;

-- 2. PRODUCTS
-- =============================================
INSERT INTO products (id, slug, name, category, description, image_url, specs, ai_verdict, lowest_price, highest_price, average_price, deal_score) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'samsung-galaxy-s24-ultra',
    'Samsung Galaxy S24 Ultra 256GB',
    'Smartphone',
    'Smartphone flagship Samsung dengan S Pen, kamera 200MP, dan chipset Snapdragon 8 Gen 3. Layar Dynamic AMOLED 6.8 inch dengan refresh rate 120Hz.',
    'https://placehold.co/400x400/e2e8f0/64748b?text=Samsung+S24',
    '{"RAM":"12GB","Storage":"256GB","Kamera":"200MP + 12MP + 50MP + 10MP","Baterai":"5000mAh","Chipset":"Snapdragon 8 Gen 3","Layar":"6.8\" Dynamic AMOLED 2X"}',
    'Harga terbaik ada di Tokopedia saat ini. Kami prediksi harga akan turun 5-8% dalam 2 minggu ke depan menjelang promo mid-year sale. Beli sekarang jika butuh, tapi bisa tunggu jika tidak mendesak.',
    17500000, 21500000, 19200000, 89
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'apple-iphone-15-pro-max',
    'Apple iPhone 15 Pro Max 256GB',
    'Smartphone',
    'iPhone terbaru dengan chip A17 Pro, kamera 48MP, dan desain titanium. Mendukung USB-C dan Action Button.',
    'https://placehold.co/400x400/e2e8f0/64748b?text=iPhone+15+Pro',
    '{"RAM":"8GB","Storage":"256GB","Kamera":"48MP + 12MP + 12MP","Baterai":"4441mAh","Chipset":"A17 Pro","Layar":"6.7\" Super Retina XDR OLED"}',
    'iPhone 15 Pro Max memiliki harga yang relatif stabil. Harga terbaik saat ini di Shopee dengan promo cashback. Tidak perlu menunggu karena harga iPhone jarang turun signifikan.',
    18500000, 22000000, 20100000, 82
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'sony-wh-1000xm5',
    'Sony WH-1000XM5 Headphone Wireless',
    'Audio',
    'Headphone noise cancelling terbaik dari Sony. Kualitas audio Hi-Res, 30 jam baterai, dan mikrofon 8 untuk panggilan jernih.',
    'https://placehold.co/400x400/e2e8f0/64748b?text=Sony+WH1000XM5',
    '{"Tipe":"Over-ear","Noise Cancelling":"Ya (Adaptive)","Baterai":"30 jam","Bluetooth":"5.2","Berat":"250g","Driver":"30mm"}',
    'Headphone ini sering diskon di Bukalapak dan Blibli. Tunggu promo weekend atau harbolnas untuk harga terbaik. Harga saat ini termasuk rata-rata.',
    3800000, 5200000, 4500000, 72
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'asus-rog-zephyrus-g14',
    'ASUS ROG Zephyrus G14 GA402',
    'Laptop',
    'Laptop gaming tipis dan ringan dengan AMD Ryzen 9 dan RTX 4060. Layar 14 inch QHD+ 165Hz, cocok untuk gaming dan content creation.',
    'https://placehold.co/400x400/e2e8f0/64748b?text=ROG+G14',
    '{"Prosesor":"AMD Ryzen 9 7940HS","GPU":"NVIDIA RTX 4060 8GB","RAM":"16GB DDR5","Storage":"1TB NVMe SSD","Layar":"14\" QHD+ 165Hz","Berat":"1.72kg"}',
    'Laptop gaming premium dengan harga kompetitif. Tokopedia dan Blibli sering memberikan bonus aksesoris. Harga saat ini sudah cukup baik, tidak perlu menunggu.',
    20500000, 26000000, 23000000, 78
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'xiaomi-smart-band-8',
    'Xiaomi Smart Band 8',
    'Wearable',
    'Smartwatch fitness tracker dengan layar AMOLED 1.62 inch, 150+ mode olahraga, dan baterai tahan 16 hari. Tahan air 5ATM.',
    'https://placehold.co/400x400/e2e8f0/64748b?text=Xiaomi+Band+8',
    '{"Layar":"1.62\" AMOLED","Baterai":"16 hari","Tahan Air":"5ATM","Mode Olahraga":"150+","Berat":"27.5g","Konektivitas":"Bluetooth 5.1"}',
    'Harga sangat bervariasi antar marketplace! Shopee dan TikTok Shop sering menawarkan harga termurah dengan voucher. Ini produk yang worth it untuk dibeli sekarang.',
    399000, 650000, 500000, 91
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'dyson-v15-detect',
    'Dyson V15 Detect Absolute',
    'Home Appliance',
    'Vacuum cleaner cordless premium dengan laser detection untuk debu halus. Teknologi piezo sensor dan LCD screen untuk analisis debu real-time.',
    'https://placehold.co/400x400/e2e8f0/64748b?text=Dyson+V15',
    '{"Daya":"230AW suction","Baterai":"60 menit","Kapasitas":"0.76L","Berat":"3.1kg","Filter":"HEPA","Layar":"LCD Piezo"}',
    'Dyson jarang diskon besar. Jika menemukan harga di bawah Rp9.500.000, itu sudah deal bagus. Lazada kadang menawarkan cicilan 0% yang menguntungkan.',
    8800000, 11500000, 9900000, 75
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'logitech-mx-master-3s',
    'Logitech MX Master 3S Mouse',
    'Peripherals',
    'Mouse wireless premium untuk produktivitas dengan sensor 8000 DPI, scroll wheel MagSpeed, dan konektivitas multi-device via Bluetooth dan Logi Bolt.',
    'https://placehold.co/400x400/e2e8f0/64748b?text=MX+Master+3S',
    '{"Sensor":"8000 DPI","Konektivitas":"Bluetooth + Logi Bolt","Baterai":"70 hari","Quick Charge":"3 menit = 3 jam","Berat":"141g","Tombol":"7 tombol"}',
    'Mouse ini harga stabil dan jarang diskon besar. Beli di marketplace yang menawarkan garansi resmi. Harga saat ini wajar dan tidak perlu menunggu.',
    1350000, 1850000, 1600000, 68
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'nintendo-switch-oled',
    'Nintendo Switch OLED Model',
    'Gaming',
    'Konsol hybrid dengan layar OLED 7 inch, audio enhanced, dan dock dengan LAN port. Cocok untuk gaming di rumah dan on-the-go.',
    'https://placehold.co/400x400/e2e8f0/64748b?text=Switch+OLED',
    '{"Layar":"7\" OLED","Storage":"64GB","Baterai":"4.5 - 9 jam","Resolusi":"1280x720 (handheld)","Dock":"HDMI + LAN Port","Berat":"420g (dengan Joy-Con)"}',
    'Nintendo Switch OLED memiliki harga yang cukup stabil. Tokopedia dan Shopee bersaing ketat. Tunggu bundle deal yang biasanya muncul menjelang liburan.',
    4800000, 6200000, 5500000, 80
  )
ON CONFLICT (slug) DO NOTHING;

-- 3. PRICES (current prices per marketplace)
-- =============================================
DO $$
DECLARE
  mp RECORD;
  prod RECORD;
  base_price INTEGER;
  variance NUMERIC;
  rand_price INTEGER;
  rand_shipping INTEGER;
  rand_rating NUMERIC;
  rand_stock BOOLEAN;
  marketplace_data RECORD;
BEGIN
  -- For each product, generate prices for each marketplace
  FOR prod IN SELECT id, slug, lowest_price, highest_price FROM products LOOP
    base_price := (prod.lowest_price + prod.highest_price) / 2;
    
    FOR mp IN SELECT id, name FROM marketplaces LOOP
      -- Generate realistic price with variance
      rand_price := base_price + (random() * (prod.highest_price - prod.lowest_price) - (prod.highest_price - prod.lowest_price) / 2)::INTEGER;
      rand_shipping := CASE WHEN random() > 0.6 THEN 0 ELSE (random() * 20000)::INTEGER END;
      rand_rating := 4.0 + random();
      rand_stock := random() > 0.1;
      
      INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock, shipping_cost)
      VALUES (
        prod.id,
        mp.id,
        rand_price,
        'https://' || mp.name || '.co.id/product/' || prod.slug,
        initcap(mp.name) || ' Official Store',
        ROUND(rand_rating::NUMERIC, 1),
        rand_stock,
        rand_shipping
      )
      ON CONFLICT (product_id, marketplace_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 4. PRICE HISTORY (30 days of data)
-- =============================================
DO $$
DECLARE
  mp RECORD;
  prod RECORD;
  base_price INTEGER;
  day_offset INTEGER;
  hist_date DATE;
  rand_price INTEGER;
BEGIN
  FOR prod IN SELECT id, lowest_price, highest_price FROM products LOOP
    base_price := (prod.lowest_price + prod.highest_price) / 2;
    
    FOR day_offset IN 0..29 LOOP
      hist_date := CURRENT_DATE - day_offset;
      
      FOR mp IN SELECT id FROM marketplaces LOOP
        IF random() > 0.1 THEN
          rand_price := base_price + ((random() - 0.5) * (prod.highest_price - prod.lowest_price) * 0.8)::INTEGER;
          
          INSERT INTO price_history (product_id, marketplace_id, price, recorded_at)
          VALUES (prod.id, mp.id, rand_price, hist_date)
          ON CONFLICT (product_id, marketplace_id, recorded_at) DO NOTHING;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
