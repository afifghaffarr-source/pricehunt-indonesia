-- ============================================================================
-- FIX: Insert 30 prices for migration 111 products
-- Run this in Supabase SQL Editor
-- ============================================================================

-- iPhone 15 Pro Max prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 19999000, 'https://www.tokopedia.com/apple/iphone-15-pro-max-256gb', 'iBox Official Store', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 20499000, 'https://shopee.co.id/apple-iphone-15-pro-max-256gb', 'Eraspace Official', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 21999000, 'https://www.bukalapak.com/p/iphone-15-pro-max-256gb', 'Digimap Official', 4.7, TRUE);

-- Samsung S24 Ultra 512GB prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'samsung-s24-ultra-512gb'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 18499000, 'https://www.tokopedia.com/samsung/galaxy-s24-ultra-512gb', 'Samsung Official Store', 5.0, TRUE),
((SELECT id FROM products WHERE slug = 'samsung-s24-ultra-512gb'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 19999000, 'https://shopee.co.id/samsung-galaxy-s24-ultra-512gb', 'Samsung Official Shop', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'samsung-s24-ultra-512gb'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 20999000, 'https://www.bukalapak.com/p/samsung-galaxy-s24-ultra-512gb', 'Samsung Store', 4.8, TRUE);

-- Xiaomi 14 Pro prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'xiaomi-14-pro-256gb'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 11999000, 'https://www.tokopedia.com/xiaomi/14-pro-256gb', 'Xiaomi Official Store', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'xiaomi-14-pro-256gb'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 10999000, 'https://shopee.co.id/xiaomi-14-pro-256gb', 'Xiaomi Official Shop', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'xiaomi-14-pro-256gb'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 12999000, 'https://www.bukalapak.com/p/xiaomi-14-pro-256gb', 'Mi Store Official', 4.7, TRUE);

-- ASUS ROG Zephyrus G14 prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'asus-rog-zephyrus-g14'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 24999000, 'https://www.tokopedia.com/asus/rog-zephyrus-g14-2024', 'ASUS Official Store', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'asus-rog-zephyrus-g14'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 26499000, 'https://shopee.co.id/asus-rog-zephyrus-g14', 'ROG Official Shop', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'asus-rog-zephyrus-g14'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 27999000, 'https://www.bukalapak.com/p/asus-rog-g14-2024', 'ASUS Store', 4.7, TRUE);

-- MacBook Pro 16 M3 Max prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'macbook-pro-16-m3-max'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 54999000, 'https://www.tokopedia.com/apple/macbook-pro-16-m3-max', 'iBox Official Store', 5.0, TRUE),
((SELECT id FROM products WHERE slug = 'macbook-pro-16-m3-max'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 57499000, 'https://shopee.co.id/macbook-pro-16-m3-max', 'Eraspace Official', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'macbook-pro-16-m3-max'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 59999000, 'https://www.bukalapak.com/p/macbook-pro-16-m3-max', 'Digimap Official', 4.8, TRUE);

-- AirPods Pro 2 USB-C prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'airpods-pro-2-usbc'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 3999000, 'https://www.tokopedia.com/apple/airpods-pro-2-usbc', 'iBox Official Store', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'airpods-pro-2-usbc'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 4149000, 'https://shopee.co.id/airpods-pro-2-usbc', 'Eraspace Official', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'airpods-pro-2-usbc'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 4299000, 'https://www.bukalapak.com/p/airpods-pro-2-usbc', 'Apple Store', 4.7, TRUE);

-- Sony WH-1000XM5 prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'sony-wh1000xm5'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 4999000, 'https://www.tokopedia.com/sony/wh-1000xm5', 'Sony Official Store', 5.0, TRUE),
((SELECT id FROM products WHERE slug = 'sony-wh1000xm5'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 5499000, 'https://shopee.co.id/sony-wh-1000xm5', 'Sony Official Shop', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'sony-wh1000xm5'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 5999000, 'https://www.bukalapak.com/p/sony-wh1000xm5', 'Sony Store', 4.8, TRUE);

-- Nike Air Max 270 prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'nike-air-max-270'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 1899000, 'https://www.tokopedia.com/nike/air-max-270-black-white', 'Nike Official Store', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'nike-air-max-270'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 2049000, 'https://shopee.co.id/nike-air-max-270', 'Nike Official Shop', 4.7, TRUE),
((SELECT id FROM products WHERE slug = 'nike-air-max-270'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 2199000, 'https://www.bukalapak.com/p/nike-air-max-270', 'Nike Store', 4.6, TRUE);

-- Adidas Ultraboost 23 prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'adidas-ultraboost-23'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 2499000, 'https://www.tokopedia.com/adidas/ultraboost-23', 'Adidas Official Store', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'adidas-ultraboost-23'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 2699000, 'https://shopee.co.id/adidas-ultraboost-23', 'Adidas Official Shop', 4.8, TRUE),
((SELECT id FROM products WHERE slug = 'adidas-ultraboost-23'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 2899000, 'https://www.bukalapak.com/p/adidas-ultraboost-23', 'Adidas Store', 4.7, TRUE);

-- LG OLED C3 prices
INSERT INTO prices (product_id, marketplace_id, price, url, seller, seller_rating, in_stock) VALUES
((SELECT id FROM products WHERE slug = 'lg-oled-c3-65'), (SELECT id FROM marketplaces WHERE name = 'Tokopedia'), 24999000, 'https://www.tokopedia.com/lg/oled-c3-65-inch', 'LG Official Store', 5.0, TRUE),
((SELECT id FROM products WHERE slug = 'lg-oled-c3-65'), (SELECT id FROM marketplaces WHERE name = 'Shopee'), 26999000, 'https://shopee.co.id/lg-oled-c3-65-inch', 'LG Official Shop', 4.9, TRUE),
((SELECT id FROM products WHERE slug = 'lg-oled-c3-65'), (SELECT id FROM marketplaces WHERE name = 'Bukalapak'), 28999000, 'https://www.bukalapak.com/p/lg-oled-c3-65-inch', 'Electronic City', 4.8, TRUE);
