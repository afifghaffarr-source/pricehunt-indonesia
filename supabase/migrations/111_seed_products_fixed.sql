-- Migration 111: Seed Products for Testing (FIXED)
-- Created: 2026-06-12
-- Purpose: Populate database with 10 sample products + prices

-- Insert 10 products (correct schema)
INSERT INTO products (slug, name, category, description, image_url, lowest_price, highest_price, average_price, deal_score) VALUES
('iphone-15-pro-max-256gb', 'iPhone 15 Pro Max 256GB', 'Electronics', 'Flagship Apple smartphone dengan chip A17 Pro', 'https://images.tokopedia.net/img/sample/iphone15.jpg', 19999000, 22999000, 20999000, 85),
('samsung-s24-ultra-512gb', 'Samsung Galaxy S24 Ultra 512GB', 'Electronics', 'Flagship Samsung dengan S Pen dan kamera 200MP', 'https://images.tokopedia.net/img/sample/s24.jpg', 18499000, 21999000, 19999000, 82),
('xiaomi-14-pro-256gb', 'Xiaomi 14 Pro 256GB', 'Electronics', 'Flagship Xiaomi dengan Leica camera', 'https://cf.shopee.co.id/sample/xiaomi14.jpg', 10999000, 12999000, 11999000, 78),
('asus-rog-zephyrus-g14', 'ASUS ROG Zephyrus G14 Ryzen 9', 'Electronics', 'Gaming laptop compact dengan Ryzen 9 dan RTX', 'https://images.tokopedia.net/img/sample/asus-rog.jpg', 24999000, 27999000, 26499000, 88),
('macbook-pro-16-m3-max', 'MacBook Pro 16 M3 Max', 'Electronics', 'Professional laptop dengan chip M3 Max', 'https://images.tokopedia.net/img/sample/mbp.jpg', 54999000, 59999000, 57499000, 90),
('airpods-pro-2-usbc', 'Apple AirPods Pro 2nd Gen USB-C', 'Electronics', 'TWS premium dengan ANC dan spatial audio', 'https://images.tokopedia.net/img/sample/airpods.jpg', 3999000, 4299000, 4149000, 85),
('sony-wh1000xm5', 'Sony WH-1000XM5 Headphone', 'Electronics', 'Headphone ANC terbaik dari Sony', 'https://images.tokopedia.net/img/sample/sony-wh.jpg', 4999000, 5999000, 5499000, 92),
('nike-air-max-270', 'Nike Air Max 270 Black White', 'Fashion', 'Sepatu casual Nike dengan teknologi Air Max', 'https://images.tokopedia.net/img/sample/airmax.jpg', 1899000, 2199000, 2049000, 75),
('samsung-ac-1pk-inverter', 'Samsung AC Split 1 PK Inverter', 'Home', 'AC hemat energi dengan teknologi inverter', 'https://images.tokopedia.net/img/sample/ac-samsung.jpg', 3999000, 4599000, 4299000, 80),
('lg-kulkas-side-by-side', 'LG Kulkas Side by Side 613L', 'Home', 'Kulkas besar dengan dispenser dan ice maker', 'https://cf.shopee.co.id/sample/kulkas-lg.jpg', 14999000, 16999000, 15999000, 83);

-- Get marketplace UUIDs for price inserts
-- Note: Run this query first to get actual UUIDs, then update the price inserts below
-- SELECT id, name FROM marketplaces;

-- Insert prices for each product (using marketplace UUIDs)
-- You'll need to replace the UUID placeholders with actual marketplace IDs from your database

-- Example structure (replace UUIDs):
-- INSERT INTO prices (product_id, marketplace_id, price, url, seller, in_stock) 
-- SELECT 
--   (SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'),
--   (SELECT id FROM marketplaces WHERE name = 'tokopedia'),
--   19999000,
--   'https://tokopedia.com/sample-1',
--   'Official Store',
--   TRUE;

-- Alternative: Use this query to generate price inserts dynamically
-- Copy the output and run it separately

SELECT format(
  'INSERT INTO prices (product_id, marketplace_id, price, url, seller, in_stock) VALUES (%L, %L, %s, %L, %L, TRUE);',
  (SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'),
  (SELECT id FROM marketplaces WHERE name = 'tokopedia'),
  19999000,
  'https://tokopedia.com/iphone-15-pro',
  'Apple Store Official'
);

-- End of migration
-- Total: 10 products inserted
-- Prices: Need to be inserted separately with actual marketplace UUIDs
