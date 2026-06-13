-- Fix broken product image URLs with stable Unsplash images
-- Generated: 2026-06-12

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800' WHERE name = 'MacBook Pro 16 M3 Max';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' WHERE name LIKE '%Sony WH-1000XM5%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=800' WHERE name LIKE '%AirPods Pro%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800' WHERE name LIKE '%Samsung Galaxy S24%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800' WHERE name LIKE '%Xiaomi 14 Pro%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800' WHERE name LIKE '%watch%' OR name LIKE '%Watch%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800' WHERE name LIKE '%iPad%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800' WHERE name LIKE '%Canon%' OR name LIKE '%camera%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=800' WHERE name LIKE '%ROG%' OR name LIKE '%gaming%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800' WHERE name LIKE '%Lenovo%' OR name LIKE '%Legion%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1511385348-c6c5f071cd0d?w=800' WHERE name LIKE '%iPhone 15%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800' WHERE name LIKE '%smartwatch%' OR category = 'Wearables';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' WHERE name LIKE '%headphone%' OR name LIKE '%Headphone%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800' WHERE name LIKE '%keyboard%' OR name LIKE '%Keyboard%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800' WHERE name LIKE '%laptop%' AND image_url LIKE '%sample%';

-- Fallback: update any remaining broken URLs with generic electronics image
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800' 
WHERE image_url LIKE '%sample%' OR image_url LIKE '%placehold%' OR image_url LIKE '%test%';

-- Log update count
SELECT 'Updated ' || COUNT(*) || ' products' as result FROM products WHERE image_url LIKE '%unsplash%';
