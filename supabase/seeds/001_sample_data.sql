-- Sample Data for BijakBeli.app
-- Run this in Supabase SQL Editor to populate test data

-- Insert sample products
INSERT INTO products (name, slug, description, image_url, category, brand, model)
VALUES 
  (
    'iPhone 15 Pro Max 256GB',
    'iphone-15-pro-max-256gb',
    'iPhone 15 Pro Max dengan chip A17 Pro, kamera 48MP, dan layar Super Retina XDR 6.7 inch.',
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
    'Smartphone',
    'Apple',
    'iPhone 15 Pro Max'
  ),
  (
    'Samsung Galaxy S24 Ultra 512GB',
    'samsung-galaxy-s24-ultra-512gb',
    'Samsung Galaxy S24 Ultra dengan S Pen, kamera 200MP, dan layar Dynamic AMOLED 6.8 inch.',
    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
    'Smartphone',
    'Samsung',
    'Galaxy S24 Ultra'
  ),
  (
    'Sony WH-1000XM5 Wireless Headphones',
    'sony-wh-1000xm5-wireless-headphones',
    'Headphone nirkabel premium dengan noise cancellation terbaik di kelasnya.',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
    'Audio',
    'Sony',
    'WH-1000XM5'
  )
ON CONFLICT (slug) DO NOTHING
RETURNING id, name;

-- Get product IDs (you'll need to note these after running the above)
-- For now, we'll assume sequential IDs 1, 2, 3

-- Get marketplace IDs
-- Assuming: 1=Tokopedia, 2=Shopee (from earlier seeds)

-- Get data source ID for manual_admin
-- Assuming: id=2 for manual_admin

-- Insert offers for iPhone 15 Pro Max
INSERT INTO offers (
  product_id, 
  marketplace_id, 
  external_id, 
  url, 
  seller_name, 
  seller_rating,
  current_price, 
  original_price,
  stock_status,
  shipping_cost,
  last_checked_at,
  data_source_id,
  validation_status,
  confidence_score,
  anomaly_flags
)
VALUES 
  -- Tokopedia offer
  (
    1,
    1,
    'TOKP-IP15PM-001',
    'https://www.tokopedia.com/apple/iphone-15-pro-max-256gb',
    'Apple Official Store',
    4.9,
    21999000,
    23999000,
    'in_stock',
    0,
    NOW() - INTERVAL '2 hours',
    2,
    'verified',
    95,
    ARRAY[]::text[]
  ),
  -- Shopee offer (lower price)
  (
    1,
    2,
    'SHOPEE-IP15PM-001',
    'https://shopee.co.id/apple-official/iphone-15-pro-max-256gb',
    'Apple Official Shop',
    4.8,
    21499000,
    23999000,
    'in_stock',
    0,
    NOW() - INTERVAL '1 hour',
    2,
    'verified',
    92,
    ARRAY[]::text[]
  ),
  -- Suspicious low price offer (for conflict testing)
  (
    1,
    1,
    'TOKP-IP15PM-002',
    'https://www.tokopedia.com/gadgetmurah/iphone-15-pro-max-256gb',
    'GadgetMurah123',
    3.2,
    15999000,
    23999000,
    'in_stock',
    50000,
    NOW() - INTERVAL '30 minutes',
    2,
    'needs_review',
    45,
    ARRAY['price_too_low', 'suspicious_discount']::text[]
  );

-- Insert offers for Samsung Galaxy S24 Ultra
INSERT INTO offers (
  product_id, 
  marketplace_id, 
  external_id, 
  url, 
  seller_name, 
  seller_rating,
  current_price, 
  original_price,
  stock_status,
  last_checked_at,
  data_source_id,
  validation_status,
  confidence_score
)
VALUES 
  (
    2,
    1,
    'TOKP-S24U-001',
    'https://www.tokopedia.com/samsung/galaxy-s24-ultra-512gb',
    'Samsung Official Store',
    4.9,
    24999000,
    26999000,
    'in_stock',
    NOW() - INTERVAL '3 hours',
    2,
    'verified',
    96
  ),
  (
    2,
    2,
    'SHOPEE-S24U-001',
    'https://shopee.co.id/samsung-official/galaxy-s24-ultra-512gb',
    'Samsung Official Shop',
    4.9,
    24899000,
    26999000,
    'in_stock',
    NOW() - INTERVAL '2 hours',
    2,
    'verified',
    94
  );

-- Insert offers for Sony WH-1000XM5
INSERT INTO offers (
  product_id, 
  marketplace_id, 
  external_id, 
  url, 
  seller_name, 
  seller_rating,
  current_price, 
  original_price,
  stock_status,
  last_checked_at,
  data_source_id,
  validation_status,
  confidence_score
)
VALUES 
  (
    3,
    1,
    'TOKP-SONYXM5-001',
    'https://www.tokopedia.com/sony/wh-1000xm5',
    'Sony Official Store',
    4.8,
    5499000,
    5999000,
    'in_stock',
    NOW() - INTERVAL '4 hours',
    2,
    'verified',
    93
  ),
  (
    3,
    2,
    'SHOPEE-SONYXM5-001',
    'https://shopee.co.id/sony-official/wh-1000xm5',
    'Sony Official Shop',
    4.7,
    5399000,
    5999000,
    'in_stock',
    NOW() - INTERVAL '1 hour',
    2,
    'verified',
    91
  );

-- Insert price snapshots (historical data)
-- For iPhone 15 Pro Max from Tokopedia (assuming offer_id = 1)
INSERT INTO price_snapshots (offer_id, price, checked_at, data_source_id)
VALUES 
  (1, 22999000, NOW() - INTERVAL '7 days', 2),
  (1, 22499000, NOW() - INTERVAL '5 days', 2),
  (1, 22199000, NOW() - INTERVAL '3 days', 2),
  (1, 21999000, NOW() - INTERVAL '2 hours', 2);

-- For iPhone 15 Pro Max from Shopee (assuming offer_id = 2)
INSERT INTO price_snapshots (offer_id, price, checked_at, data_source_id)
VALUES 
  (2, 22499000, NOW() - INTERVAL '6 days', 2),
  (2, 22199000, NOW() - INTERVAL '4 days', 2),
  (2, 21799000, NOW() - INTERVAL '2 days', 2),
  (2, 21499000, NOW() - INTERVAL '1 hour', 2);

-- Insert a price conflict for the suspicious offer
INSERT INTO price_conflicts (
  product_id,
  offer_id,
  conflict_type,
  detected_price,
  average_market_price,
  deviation_percentage,
  confidence_score,
  status
)
VALUES (
  1,
  3,
  'outlier_vs_average',
  15999000,
  21749000,
  26.4,
  85,
  'pending'
);

-- Insert a recheck request
INSERT INTO recheck_requests (
  product_id,
  marketplace_id,
  reason,
  notes,
  status
)
VALUES (
  1,
  1,
  'price_changed',
  'User reported price drop on Tokopedia',
  'pending'
);

-- Insert crawl targets for automated refresh
INSERT INTO crawl_targets (
  product_id,
  marketplace_id,
  priority_score,
  next_check_at,
  check_frequency_hours,
  last_checked_at,
  status
)
VALUES 
  (1, 1, 85, NOW() + INTERVAL '2 hours', 2, NOW() - INTERVAL '2 hours', 'active'),
  (1, 2, 82, NOW() + INTERVAL '3 hours', 3, NOW() - INTERVAL '1 hour', 'active'),
  (2, 1, 75, NOW() + INTERVAL '6 hours', 6, NOW() - INTERVAL '3 hours', 'active'),
  (2, 2, 73, NOW() + INTERVAL '6 hours', 6, NOW() - INTERVAL '2 hours', 'active'),
  (3, 1, 65, NOW() + INTERVAL '12 hours', 12, NOW() - INTERVAL '4 hours', 'active'),
  (3, 2, 63, NOW() + INTERVAL '12 hours', 12, NOW() - INTERVAL '1 hour', 'active');

-- Verification queries
SELECT 'Products created:' as status, COUNT(*) as count FROM products;
SELECT 'Offers created:' as status, COUNT(*) as count FROM offers;
SELECT 'Price snapshots:' as status, COUNT(*) as count FROM price_snapshots;
SELECT 'Price conflicts:' as status, COUNT(*) as count FROM price_conflicts;
SELECT 'Recheck requests:' as status, COUNT(*) as count FROM recheck_requests;
SELECT 'Crawl targets:' as status, COUNT(*) as count FROM crawl_targets;
