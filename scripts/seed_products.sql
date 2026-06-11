-- BijakBeli.app - Seed Data for Testing
-- Created: 2026-06-12
-- Purpose: Populate database with 50 sample products for testing

-- Note: Run this against your Supabase database

-- Sample Products (50 items across 5 categories)

-- Category 1: Smartphones (10 products)
INSERT INTO products (name, category, brand, marketplace, url, current_price, original_price, discount_percentage, rating, sold_count, image_url, last_updated) VALUES
('iPhone 15 Pro Max 256GB', 'Electronics', 'Apple', 'tokopedia', 'https://tokopedia.com/sample-1', 19999000, 22999000, 13, 4.9, 1250, 'https://images.tokopedia.net/img/sample/iphone15.jpg', NOW()),
('Samsung Galaxy S24 Ultra 512GB', 'Electronics', 'Samsung', 'tokopedia', 'https://tokopedia.com/sample-2', 18499000, 21999000, 16, 4.8, 890, 'https://images.tokopedia.net/img/sample/s24.jpg', NOW()),
('Xiaomi 14 Pro 256GB', 'Electronics', 'Xiaomi', 'shopee', 'https://shopee.co.id/sample-3', 10999000, 12999000, 15, 4.7, 2340, 'https://cf.shopee.co.id/sample/xiaomi14.jpg', NOW()),
('OPPO Find X7 Ultra 16GB/512GB', 'Electronics', 'OPPO', 'tokopedia', 'https://tokopedia.com/sample-4', 14999000, 16999000, 12, 4.6, 567, 'https://images.tokopedia.net/img/sample/oppo.jpg', NOW()),
('Vivo X100 Pro 12GB/256GB', 'Electronics', 'Vivo', 'bukalapak', 'https://bukalapak.com/sample-5', 11999000, 13499000, 11, 4.7, 789, 'https://s-media-cache-ak0.pinimg.com/sample/vivo.jpg', NOW()),
('Realme GT 5 Pro 16GB/512GB', 'Electronics', 'Realme', 'shopee', 'https://shopee.co.id/sample-6', 8999000, 9999000, 10, 4.5, 1456, 'https://cf.shopee.co.id/sample/realme.jpg', NOW()),
('Google Pixel 9 Pro 256GB', 'Electronics', 'Google', 'tokopedia', 'https://tokopedia.com/sample-7', 15999000, 17999000, 11, 4.8, 432, 'https://images.tokopedia.net/img/sample/pixel9.jpg', NOW()),
('OnePlus 12 16GB/512GB', 'Electronics', 'OnePlus', 'shopee', 'https://shopee.co.id/sample-8', 10499000, 11999000, 13, 4.6, 678, 'https://cf.shopee.co.id/sample/oneplus.jpg', NOW()),
('Nothing Phone 2a 12GB/256GB', 'Electronics', 'Nothing', 'tokopedia', 'https://tokopedia.com/sample-9', 5999000, 6499000, 8, 4.4, 2890, 'https://images.tokopedia.net/img/sample/nothing.jpg', NOW()),
('Asus ROG Phone 8 Pro 24GB/1TB', 'Electronics', 'Asus', 'bukalapak', 'https://bukalapak.com/sample-10', 16999000, 19999000, 15, 4.9, 234, 'https://s-media-cache-ak0.pinimg.com/sample/rog.jpg', NOW());

-- Category 2: Laptops (10 products)
INSERT INTO products (name, category, brand, marketplace, url, current_price, original_price, discount_percentage, rating, sold_count, image_url, last_updated) VALUES
('ASUS ROG Zephyrus G14 Ryzen 9', 'Electronics', 'Asus', 'tokopedia', 'https://tokopedia.com/laptop-1', 24999000, 27999000, 11, 4.8, 456, 'https://images.tokopedia.net/img/sample/asus-rog.jpg', NOW()),
('Lenovo Legion Pro 7i RTX 4080', 'Electronics', 'Lenovo', 'shopee', 'https://shopee.co.id/laptop-2', 32999000, 36999000, 11, 4.9, 234, 'https://cf.shopee.co.id/sample/legion.jpg', NOW()),
('MacBook Pro 16 M3 Max', 'Electronics', 'Apple', 'tokopedia', 'https://tokopedia.com/laptop-3', 54999000, 59999000, 8, 4.9, 678, 'https://images.tokopedia.net/img/sample/mbp.jpg', NOW()),
('Acer Predator Helios 18 i9 RTX4090', 'Electronics', 'Acer', 'bukalapak', 'https://bukalapak.com/laptop-4', 44999000, 49999000, 10, 4.7, 123, 'https://s-media-cache-ak0.pinimg.com/sample/predator.jpg', NOW()),
('MSI Titan 18 HX i9-14900HX RTX4090', 'Electronics', 'MSI', 'tokopedia', 'https://tokopedia.com/laptop-5', 89999000, 99999000, 10, 4.8, 45, 'https://images.tokopedia.net/img/sample/titan.jpg', NOW()),
('Dell XPS 15 9530 i9 RTX4070', 'Electronics', 'Dell', 'shopee', 'https://shopee.co.id/laptop-6', 34999000, 38999000, 10, 4.7, 234, 'https://cf.shopee.co.id/sample/xps.jpg', NOW()),
('HP Omen 16 i7 RTX4060', 'Electronics', 'HP', 'tokopedia', 'https://tokopedia.com/laptop-7', 19999000, 22999000, 13, 4.6, 567, 'https://images.tokopedia.net/img/sample/omen.jpg', NOW()),
('Razer Blade 15 i9 RTX4070', 'Electronics', 'Razer', 'bukalapak', 'https://bukalapak.com/laptop-8', 39999000, 44999000, 11, 4.8, 189, 'https://s-media-cache-ak0.pinimg.com/sample/blade.jpg', NOW()),
('Gigabyte AORUS 17X i9 RTX4090', 'Electronics', 'Gigabyte', 'shopee', 'https://shopee.co.id/laptop-9', 54999000, 59999000, 8, 4.7, 78, 'https://cf.shopee.co.id/sample/aorus.jpg', NOW()),
('Surface Laptop Studio 2 i7 RTX4050', 'Electronics', 'Microsoft', 'tokopedia', 'https://tokopedia.com/laptop-10', 29999000, 32999000, 9, 4.5, 345, 'https://images.tokopedia.net/img/sample/surface.jpg', NOW());

-- Category 3: Audio & Wearables (10 products)
INSERT INTO products (name, category, brand, marketplace, url, current_price, original_price, discount_percentage, rating, sold_count, image_url, last_updated) VALUES
('Apple AirPods Pro 2nd Gen USB-C', 'Electronics', 'Apple', 'tokopedia', 'https://tokopedia.com/audio-1', 3999000, 4299000, 7, 4.9, 3450, 'https://images.tokopedia.net/img/sample/airpods.jpg', NOW()),
('Samsung Galaxy Buds 2 Pro', 'Electronics', 'Samsung', 'shopee', 'https://shopee.co.id/audio-2', 2299000, 2799000, 18, 4.7, 5670, 'https://cf.shopee.co.id/sample/buds2.jpg', NOW()),
('Sony WH-1000XM5 Headphone', 'Electronics', 'Sony', 'tokopedia', 'https://tokopedia.com/audio-3', 4999000, 5999000, 17, 4.9, 1234, 'https://images.tokopedia.net/img/sample/sony-wh.jpg', NOW()),
('Apple Watch Series 9 GPS 45mm', 'Electronics', 'Apple', 'bukalapak', 'https://bukalapak.com/watch-1', 6999000, 7999000, 13, 4.8, 890, 'https://s-media-cache-ak0.pinimg.com/sample/aws9.jpg', NOW()),
('Samsung Galaxy Watch 6 Classic', 'Electronics', 'Samsung', 'shopee', 'https://shopee.co.id/watch-2', 4499000, 5299000, 15, 4.7, 1456, 'https://cf.shopee.co.id/sample/gw6.jpg', NOW()),
('Huawei Watch GT 4 46mm', 'Electronics', 'Huawei', 'tokopedia', 'https://tokopedia.com/watch-3', 2799000, 3299000, 15, 4.6, 2340, 'https://images.tokopedia.net/img/sample/gt4.jpg', NOW()),
('iPad Pro 12.9 M2 256GB WiFi', 'Electronics', 'Apple', 'tokopedia', 'https://tokopedia.com/tablet-1', 16999000, 18999000, 11, 4.9, 567, 'https://images.tokopedia.net/img/sample/ipadpro.jpg', NOW()),
('Samsung Galaxy Tab S9 Ultra 12GB', 'Electronics', 'Samsung', 'shopee', 'https://shopee.co.id/tablet-2', 14999000, 16999000, 12, 4.8, 789, 'https://cf.shopee.co.id/sample/tabs9.jpg', NOW()),
('Xiaomi Pad 6 Pro 12.4 inch', 'Electronics', 'Xiaomi', 'bukalapak', 'https://bukalapak.com/tablet-3', 5999000, 6999000, 14, 4.7, 3456, 'https://s-media-cache-ak0.pinimg.com/sample/pad6.jpg', NOW()),
('JBL Quantum 910X Gaming Headset', 'Electronics', 'JBL', 'tokopedia', 'https://tokopedia.com/audio-4', 3499000, 3999000, 13, 4.6, 1234, 'https://images.tokopedia.net/img/sample/quantum.jpg', NOW());

-- Category 4: Fashion (10 products)
INSERT INTO products (name, category, brand, marketplace, url, current_price, original_price, discount_percentage, rating, sold_count, image_url, last_updated) VALUES
('Nike Air Max 270 Black White', 'Fashion', 'Nike', 'tokopedia', 'https://tokopedia.com/fashion-1', 1899000, 2199000, 14, 4.7, 4567, 'https://images.tokopedia.net/img/sample/airmax.jpg', NOW()),
('Adidas Ultraboost 23 Core Black', 'Fashion', 'Adidas', 'shopee', 'https://shopee.co.id/fashion-2', 2799000, 3199000, 13, 4.8, 3456, 'https://cf.shopee.co.id/sample/ultraboost.jpg', NOW()),
('Converse Chuck 70 High Top', 'Fashion', 'Converse', 'bukalapak', 'https://bukalapak.com/fashion-3', 899000, 1099000, 18, 4.6, 8901, 'https://s-media-cache-ak0.pinimg.com/sample/chuck70.jpg', NOW()),
('Vans Old Skool Classic Black', 'Fashion', 'Vans', 'tokopedia', 'https://tokopedia.com/fashion-4', 799000, 949000, 16, 4.7, 12345, 'https://images.tokopedia.net/img/sample/oldskool.jpg', NOW()),
('New Balance 530 White Navy', 'Fashion', 'New Balance', 'shopee', 'https://shopee.co.id/fashion-5', 1299000, 1499000, 13, 4.6, 5678, 'https://cf.shopee.co.id/sample/nb530.jpg', NOW()),
('Tas Ransel Bodypack 2846 Black', 'Fashion', 'Bodypack', 'tokopedia', 'https://tokopedia.com/bag-1', 449000, 549000, 18, 4.5, 6789, 'https://images.tokopedia.net/img/sample/bodypack.jpg', NOW()),
('Herschel Little America Backpack', 'Fashion', 'Herschel', 'bukalapak', 'https://bukalapak.com/bag-2', 1799000, 1999000, 10, 4.8, 2345, 'https://s-media-cache-ak0.pinimg.com/sample/herschel.jpg', NOW()),
('Fossil Gen 6 Smartwatch FTW4059', 'Fashion', 'Fossil', 'shopee', 'https://shopee.co.id/watch-4', 3299000, 3799000, 13, 4.6, 1234, 'https://cf.shopee.co.id/sample/fossil.jpg', NOW()),
('Casio G-Shock GA-2100 CasiOak', 'Fashion', 'Casio', 'tokopedia', 'https://tokopedia.com/watch-5', 1599000, 1799000, 11, 4.8, 7890, 'https://images.tokopedia.net/img/sample/gshock.jpg', NOW()),
('Seiko 5 Sports SRPD Automatic', 'Fashion', 'Seiko', 'bukalapak', 'https://bukalapak.com/watch-6', 2999000, 3499000, 14, 4.9, 1456, 'https://s-media-cache-ak0.pinimg.com/sample/seiko5.jpg', NOW());

-- Category 5: Home Appliances (10 products)
INSERT INTO products (name, category, brand, marketplace, url, current_price, original_price, discount_percentage, rating, sold_count, image_url, last_updated) VALUES
('Samsung AC Split 1 PK Inverter', 'Home', 'Samsung', 'tokopedia', 'https://tokopedia.com/home-1', 3999000, 4599000, 13, 4.7, 2345, 'https://images.tokopedia.net/img/sample/ac-samsung.jpg', NOW()),
('LG AC Dual Inverter 1.5 PK', 'Home', 'LG', 'shopee', 'https://shopee.co.id/home-2', 4799000, 5499000, 13, 4.8, 1890, 'https://cf.shopee.co.id/sample/ac-lg.jpg', NOW()),
('Daikin AC Inverter 1 PK R32', 'Home', 'Daikin', 'bukalapak', 'https://bukalapak.com/home-3', 5299000, 5999000, 12, 4.9, 1567, 'https://s-media-cache-ak0.pinimg.com/sample/ac-daikin.jpg', NOW()),
('Sharp Kulkas 2 Pintu 271L Inverter', 'Home', 'Sharp', 'tokopedia', 'https://tokopedia.com/home-4', 4499000, 4999000, 10, 4.6, 3456, 'https://images.tokopedia.net/img/sample/kulkas-sharp.jpg', NOW()),
('LG Kulkas Side by Side 613L', 'Home', 'LG', 'shopee', 'https://shopee.co.id/home-5', 14999000, 16999000, 12, 4.8, 567, 'https://cf.shopee.co.id/sample/kulkas-lg.jpg', NOW()),
('Samsung Kulkas French Door 810L', 'Home', 'Samsung', 'tokopedia', 'https://tokopedia.com/home-6', 24999000, 27999000, 11, 4.9, 234, 'https://images.tokopedia.net/img/sample/kulkas-samsung.jpg', NOW()),
('Sony Bravia XR 65 inch 4K OLED', 'Home', 'Sony', 'bukalapak', 'https://bukalapak.com/home-7', 29999000, 34999000, 14, 4.9, 456, 'https://s-media-cache-ak0.pinimg.com/sample/tv-sony.jpg', NOW()),
('Samsung QLED 55 inch Q70C 4K', 'Home', 'Samsung', 'shopee', 'https://shopee.co.id/home-8', 10999000, 12999000, 15, 4.7, 1234, 'https://cf.shopee.co.id/sample/tv-samsung.jpg', NOW()),
('LG OLED 55 inch C3 evo 4K', 'Home', 'LG', 'tokopedia', 'https://tokopedia.com/home-9', 18999000, 21999000, 14, 4.8, 789, 'https://images.tokopedia.net/img/sample/tv-lg.jpg', NOW()),
('TCL Mini LED 65 inch C745 4K', 'Home', 'TCL', 'bukalapak', 'https://bukalapak.com/home-10', 12999000, 14999000, 13, 4.6, 1456, 'https://s-media-cache-ak0.pinimg.com/sample/tv-tcl.jpg', NOW());

-- End of seed data
-- Total: 50 products across 5 categories
-- Run this SQL against your Supabase database to populate sample data
