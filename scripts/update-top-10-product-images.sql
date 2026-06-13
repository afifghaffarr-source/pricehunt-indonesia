-- Manual image fix for top 10 priority products
-- Using stable, high-quality Unsplash images
-- Generated: 2026-06-13

-- 1. iPhone 15 Pro Max 256GB
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80', 
    updated_at = NOW()
WHERE id = '0a24c5b0-08c6-4e77-a1ea-5ab6a79d1d1c';

-- 2. Samsung Galaxy S24 Ultra 512GB
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80', 
    updated_at = NOW()
WHERE id = 'cd5bcf79-c1e9-43bc-9247-257c39200a69';

-- 3. Sony WH-1000XM5 Headphone
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80', 
    updated_at = NOW()
WHERE id = '250240cb-9af5-4011-9ed1-fe096a1508a3';

-- 4. Apple AirPods Pro 2nd Gen USB-C
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=800&q=80', 
    updated_at = NOW()
WHERE id = '494f21ee-b688-4ea2-9e9d-5f250d076b30';

-- 5. Apple iPhone 15 Pro Max 256GB (duplicate)
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80', 
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000002';

-- 6. ASUS ROG Zephyrus G14 GA402
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80', 
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000004';

-- 7. Dyson V15 Detect Absolute
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&q=80', 
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000006';

-- 8. Logitech MX Master 3S Mouse
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&q=80', 
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000007';

-- 9. MacBook Pro 16 M3 Max
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', 
    updated_at = NOW()
WHERE id = 'c6e4b39d-966c-4612-a306-e996edaa7857';

-- 10. Nintendo Switch OLED Model
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800&q=80', 
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000008';

-- Verify updates
SELECT 
  p.name,
  p.image_url,
  'Updated with Unsplash' as status
FROM products p
WHERE p.id IN (
  '0a24c5b0-08c6-4e77-a1ea-5ab6a79d1d1c',
  'cd5bcf79-c1e9-43bc-9247-257c39200a69',
  '250240cb-9af5-4011-9ed1-fe096a1508a3',
  '494f21ee-b688-4ea2-9e9d-5f250d076b30',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  'c6e4b39d-966c-4612-a306-e996edaa7857',
  '00000000-0000-0000-0000-000000000008'
)
ORDER BY p.name;
