-- Migration 118: Improved Product Catalog with Detailed Names
-- Created: 2026-06-13
-- Purpose: Add specific product variants based on scraped marketplace data

-- Add detailed AirPods products
INSERT INTO products (name, category, price_range_min, price_range_max, image_url, created_at) VALUES
('Apple AirPods Pro 3 3rd Gen 2025 USB-C', 'Electronics', 4000000, 4600000, 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=800', NOW()),
('Apple AirPods Pro 2 Gen 2 USB-C Original', 'Electronics', 2300000, 3000000, 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=800', NOW())
ON CONFLICT (name) DO NOTHING;

-- Add laptop variants
INSERT INTO products (name, category, price_range_min, price_range_max, image_url, created_at) VALUES
('ASUS ROG Strix G17 G713PV Ryzen 9 7845HX RTX4060', 'Laptop', 23000000, 25000000, 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800', NOW()),
('ASUS ROG Strix G16 G614JI Core i9-13980HX RTX4070', 'Laptop', 22000000, 24000000, 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800', NOW()),
('Lenovo ThinkPad T14 Gen 6 Core Ultra 5', 'Laptop', 15000000, 18000000, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800', NOW()),
('Lenovo ThinkPad X1 Carbon Gen 11 Core i7', 'Laptop', 20000000, 25000000, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800', NOW()),
('Dell XPS 13 9350 Core Ultra 7 256V', 'Laptop', 19000000, 21000000, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800', NOW())
ON CONFLICT (name) DO NOTHING;

-- Add iPad variants
INSERT INTO products (name, category, price_range_min, price_range_max, image_url, created_at) VALUES
('Apple iPad Air 6 M2 2024 11 inch', 'Electronics', 8500000, 10000000, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800', NOW()),
('Apple iPad Air 6 M2 2024 13 inch', 'Electronics', 11000000, 13000000, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800', NOW())
ON CONFLICT (name) DO NOTHING;

-- Add accessories
INSERT INTO products (name, category, price_range_min, price_range_max, image_url, created_at) VALUES
('iPhone 15 Pro Max Case Casing Protective', 'Peripherals', 50000, 200000, 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800', NOW()),
('Samsung Galaxy S24 Ultra Case Ringke Onyx', 'Peripherals', 100000, 250000, 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800', NOW()),
('MacBook Air 13.6 M3 Case Casing Protective', 'Peripherals', 150000, 300000, 'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=800', NOW()),
('Gaming Mouse Wired RGB 1600 DPI', 'Peripherals', 50000, 150000, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800', NOW()),
('Mechanical Keyboard Gaming 65% Layout', 'Peripherals', 200000, 500000, 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800', NOW())
ON CONFLICT (name) DO NOTHING;

-- Update existing products to be more specific
UPDATE products SET name = 'Apple AirPods Pro 2nd Gen USB-C 2023' WHERE name = 'Apple AirPods Pro 2nd Gen USB-C';
UPDATE products SET name = 'Apple iPhone 15 Pro Max 256GB Natural Titanium' WHERE name = 'Apple iPhone 15 Pro Max 256GB';
UPDATE products SET name = 'Samsung Galaxy S24 Ultra 256GB Titanium Gray' WHERE name = 'Samsung Galaxy S24 Ultra 256GB';

