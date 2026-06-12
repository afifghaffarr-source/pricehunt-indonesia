-- Migration 111: Seed Data for Testing (COMPLETE & FIXED)
-- Created: 2026-06-12
-- Purpose: Populate database with 10 products + marketplace prices
-- Schema: Matches actual products table (slug, name, category, etc.)

-- ============================================================================
-- STEP 1: Ensure marketplaces exist (idempotent)
-- ============================================================================

INSERT INTO marketplaces (name, display_name, base_url, color, is_active) VALUES
('tokopedia', 'Tokopedia', 'https://www.tokopedia.com', '#42B549', TRUE),
('shopee', 'Shopee', 'https://shopee.co.id', '#EE4D2D', TRUE),
('bukalapak', 'Bukalapak', 'https://www.bukalapak.com', '#E31E52', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 2: Insert 10 sample products
-- ============================================================================

INSERT INTO products (slug, name, category, description, image_url, lowest_price, highest_price, average_price, deal_score) VALUES
('iphone-15-pro-max-256gb', 'iPhone 15 Pro Max 256GB', 'Electronics', 'Flagship Apple smartphone dengan chip A17 Pro dan kamera 48MP', 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2023/9/13/iphone-15-pro-max.jpg', 19999000, 22999000, 20999000, 85),
('samsung-s24-ultra-512gb', 'Samsung Galaxy S24 Ultra 512GB', 'Electronics', 'Flagship Samsung dengan S Pen, kamera 200MP, dan AI features', 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2024/1/18/s24-ultra.jpg', 18499000, 21999000, 19999000, 82),
('xiaomi-14-pro-256gb', 'Xiaomi 14 Pro 256GB', 'Electronics', 'Flagship Xiaomi dengan Leica camera dan Snapdragon 8 Gen 3', 'https://cf.shopee.co.id/file/xiaomi-14-pro-500x500.jpg', 10999000, 12999000, 11999000, 78),
('asus-rog-zephyrus-g14', 'ASUS ROG Zephyrus G14 Ryzen 9', 'Electronics', 'Gaming laptop compact 14 inch dengan Ryzen 9 dan RTX 4060', 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2023/5/rog-g14.jpg', 24999000, 27999000, 26499000, 88),
('macbook-pro-16-m3-max', 'MacBook Pro 16 M3 Max', 'Electronics', 'Professional laptop dengan chip M3 Max untuk creative professionals', 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2023/11/mbp-16-m3.jpg', 54999000, 59999000, 57499000, 90),
('airpods-pro-2-usbc', 'Apple AirPods Pro 2nd Gen USB-C', 'Electronics', 'TWS premium dengan Active Noise Cancellation dan spatial audio', 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2023/9/airpods-pro-2.jpg', 3999000, 4299000, 4149000, 85),
('sony-wh1000xm5', 'Sony WH-1000XM5 Headphone', 'Electronics', 'Headphone over-ear dengan ANC terbaik di kelasnya', 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2022/5/wh1000xm5.jpg', 4999000, 5999000, 5499000, 92),
('nike-air-max-270', 'Nike Air Max 270 Black White', 'Fashion', 'Sepatu casual Nike dengan teknologi Air Max cushioning', 'https://images.tokopedia.net/img/cache/500-square/product/air-max-270.jpg', 1899000, 2199000, 2049000, 75),
('samsung-ac-1pk-inverter', 'Samsung AC Split 1 PK Inverter', 'Home', 'AC hemat energi dengan teknologi digital inverter', 'https://images.tokopedia.net/img/cache/500-square/product/samsung-ac-1pk.jpg', 3999000, 4599000, 4299000, 80),
('lg-kulkas-side-by-side-613l', 'LG Kulkas Side by Side 613L', 'Home', 'Kulkas besar dengan dispenser, ice maker, dan InstaView door', 'https://cf.shopee.co.id/file/lg-kulkas-side-by-side-500x500.jpg', 14999000, 16999000, 15999000, 83)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 3: Insert prices for each product across marketplaces
-- ============================================================================

-- iPhone 15 Pro Max
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 19999000, 'https://www.tokopedia.com/apple/iphone-15-pro-max-256gb', 'iBox Official Store', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 20499000, 'https://shopee.co.id/apple-iphone-15-pro-max-256gb', 'Eraspace Official', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 22999000, 'https://www.bukalapak.com/p/iphone-15-pro-max-256gb', 'Digimap Official', 4.7, TRUE);

-- Samsung S24 Ultra
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'samsung-s24-ultra-512gb'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 18499000, 'https://www.tokopedia.com/samsung/galaxy-s24-ultra-512gb', 'Samsung Official Store', 5.0, TRUE),
((SELECT id FROM products WHERE slug = 'samsung-s24-ultra-512gb'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 19999000, 'https://shopee.co.id/samsung-galaxy-s24-ultra-512gb', 'Samsung Official Shop', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'samsung-s24-ultra-512gb'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 21999000, 'https://www.bukalapak.com/p/samsung-s24-ultra-512gb', 'Erafone Official', 4.8, TRUE);

-- Xiaomi 14 Pro
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'xiaomi-14-pro-256gb'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 11999000, 'https://www.tokopedia.com/xiaomi/14-pro-256gb', 'Xiaomi Official Store', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'xiaomi-14-pro-256gb'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 10999000, 'https://shopee.co.id/xiaomi-14-pro-256gb', 'Xiaomi Official Shop', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'xiaomi-14-pro-256gb'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 12999000, 'https://www.bukalapak.com/p/xiaomi-14-pro-256gb', 'Mi Store Official', 4.7, TRUE);

-- ASUS ROG Zephyrus G14
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'asus-rog-zephyrus-g14'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 24999000, 'https://www.tokopedia.com/asus/rog-zephyrus-g14-2024', 'ASUS Official Store', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'asus-rog-zephyrus-g14'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 26499000, 'https://shopee.co.id/asus-rog-zephyrus-g14', 'ROG Official Shop', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'asus-rog-zephyrus-g14'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 27999000, 'https://www.bukalapak.com/p/asus-rog-g14-2024', 'ASUS Store', 4.7, TRUE);

-- MacBook Pro 16 M3 Max
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'macbook-pro-16-m3-max'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 54999000, 'https://www.tokopedia.com/apple/macbook-pro-16-m3-max', 'iBox Official Store', 5.0, TRUE),
((SELECT id FROM products WHERE slug = 'macbook-pro-16-m3-max'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 57499000, 'https://shopee.co.id/macbook-pro-16-m3-max', 'Eraspace Official', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'macbook-pro-16-m3-max'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 59999000, 'https://www.bukalapak.com/p/macbook-pro-16-m3-max', 'Digimap Official', 4.8, TRUE);

-- AirPods Pro 2
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'airpods-pro-2-usbc'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 3999000, 'https://www.tokopedia.com/apple/airpods-pro-2-usbc', 'iBox Official Store', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'airpods-pro-2-usbc'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 4149000, 'https://shopee.co.id/airpods-pro-2-usbc', 'Eraspace Official', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'airpods-pro-2-usbc'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 4299000, 'https://www.bukalapak.com/p/airpods-pro-2-usbc', 'Apple Store', 4.7, TRUE);

-- Sony WH-1000XM5
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'sony-wh1000xm5'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 4999000, 'https://www.tokopedia.com/sony/wh-1000xm5', 'Sony Official Store', 5.0, TRUE),
((SELECT id FROM products WHERE slug = 'sony-wh1000xm5'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 5499000, 'https://shopee.co.id/sony-wh-1000xm5', 'Sony Official Shop', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'sony-wh1000xm5'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 5999000, 'https://www.bukalapak.com/p/sony-wh1000xm5', 'Sony Store', 4.8, TRUE);

-- Nike Air Max 270
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'nike-air-max-270'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 1899000, 'https://www.tokopedia.com/nike/air-max-270-black-white', 'Nike Official Store', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'nike-air-max-270'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 2049000, 'https://shopee.co.id/nike-air-max-270', 'Nike Official Shop', 4.7, TRUE),
((SELECT id FROM products WHERE slug = 'nike-air-max-270'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 2199000, 'https://www.bukalapak.com/p/nike-air-max-270', 'Nike Store', 4.6, TRUE);

-- Samsung AC
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'samsung-ac-1pk-inverter'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 3999000, 'https://www.tokopedia.com/samsung/ac-1pk-inverter', 'Samsung Official Store', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'samsung-ac-1pk-inverter'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 4299000, 'https://shopee.co.id/samsung-ac-1pk-inverter', 'Samsung Official Shop', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'samsung-ac-1pk-inverter'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 4599000, 'https://www.bukalapak.com/p/samsung-ac-1pk-inverter', 'Electronic City', 4.7, TRUE);

-- LG Kulkas
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'lg-kulkas-side-by-side-613l'), (SELECT id FROM marketplaces WHERE name = 'tokopedia'), 14999000, 'https://www.tokopedia.com/lg/kulkas-side-by-side-613l', 'LG Official Store', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'lg-kulkas-side-by-side-613l'), (SELECT id FROM marketplaces WHERE name = 'shopee'), 15999000, 'https://shopee.co.id/lg-kulkas-side-by-side-613l', 'LG Official Shop', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'lg-kulkas-side-by-side-613l'), (SELECT id FROM marketplaces WHERE name = 'bukalapak'), 16999000, 'https://www.bukalapak.com/p/lg-kulkas-side-by-side-613l', 'Electronic City', 4.7, TRUE);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Inserted:
--   - 3 marketplaces (Tokopedia, Shopee, Bukalapak)
--   - 10 products across 3 categories
--   - 30 prices (10 products x 3 marketplaces)
-- 
-- Total rows: 43
-- 
-- Verify with:
--   SELECT COUNT(*) FROM products;        -- Should return 10
--   SELECT COUNT(*) FROM prices;          -- Should return 30
--   SELECT COUNT(*) FROM marketplaces;    -- Should return at least 3
-- ============================================================================
