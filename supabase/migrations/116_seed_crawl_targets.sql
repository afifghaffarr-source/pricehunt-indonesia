-- Migration 116: Seed Crawl Targets (Initial Dataset)
-- Date: 2026-06-12
-- Purpose: Populate crawl_targets from existing offers + product expansion

-- PART A: Seed from existing offers (11 URLs with known marketplaces)
-- These are proven URLs that already exist in our database
INSERT INTO crawl_targets (
  product_id,
  marketplace,
  url,
  priority,
  crawl_status,
  last_crawled_at,
  metadata
)
SELECT 
  o.product_id,
  m.name as marketplace,
  o.url,
  CASE 
    WHEN o.product_id IS NOT NULL THEN 80  -- High priority: linked to product
    ELSE 60  -- Medium priority: orphaned offers
  END as priority,
  'pending' as crawl_status,
  o.last_checked_at,
  jsonb_build_object(
    'source', 'existing_offer',
    'offer_id', o.id,
    'seller_name', o.seller_name,
    'current_price', o.current_price,
    'seeded_at', NOW()
  ) as metadata
FROM offers o
INNER JOIN marketplaces m ON m.id = o.marketplace_id
WHERE o.url IS NOT NULL
  AND o.is_active = true
ON CONFLICT (url) DO NOTHING;

-- PART B: Generate crawl targets from products (expansion strategy)
-- For each product, create potential crawl targets for major marketplaces
-- Note: These are speculative URLs - may need adjustment based on actual marketplace URL patterns

-- First, let's create targets for products that already have offers (to discover more sellers)
INSERT INTO crawl_targets (
  product_id,
  marketplace,
  url,
  priority,
  crawl_status,
  metadata
)
SELECT 
  p.id as product_id,
  m.name as marketplace,
  -- Generate search URL pattern (will need to be handled by collector)
  'https://' || m.base_url || '/search?q=' || REPLACE(p.name, ' ', '+') as url,
  50 as priority,  -- Medium-low priority: discovery mode
  'pending' as crawl_status,
  jsonb_build_object(
    'source', 'product_expansion',
    'product_name', p.name,
    'product_slug', p.slug,
    'strategy', 'marketplace_search',
    'seeded_at', NOW()
  ) as metadata
FROM products p
CROSS JOIN marketplaces m
WHERE p.id IN (
  -- Only products that already have at least one offer (proven products)
  SELECT DISTINCT product_id 
  FROM offers 
  WHERE product_id IS NOT NULL
)
  AND m.is_active = true
  AND NOT EXISTS (
    -- Don't create duplicate targets for marketplace we already have
    SELECT 1 FROM offers o 
    WHERE o.product_id = p.id 
      AND o.marketplace_id = m.id
  )
ON CONFLICT (url) DO NOTHING;

-- Summary query to show what was seeded
DO $$
DECLARE
  part_a_count INTEGER;
  part_b_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO part_a_count 
  FROM crawl_targets 
  WHERE metadata->>'source' = 'existing_offer';
  
  SELECT COUNT(*) INTO part_b_count 
  FROM crawl_targets 
  WHERE metadata->>'source' = 'product_expansion';
  
  SELECT COUNT(*) INTO total_count FROM crawl_targets;
  
  RAISE NOTICE 'Seeding complete:';
  RAISE NOTICE '  - Part A (existing offers): % targets', part_a_count;
  RAISE NOTICE '  - Part B (product expansion): % targets', part_b_count;
  RAISE NOTICE '  - Total crawl targets: %', total_count;
END $$;
