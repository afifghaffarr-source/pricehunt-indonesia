-- Migration 116 v2: Seed Crawl Targets (Schema-Corrected)
-- Date: 2026-06-12
-- Status: ✅ APPLIED SUCCESSFULLY (28 targets created)
-- Purpose: Populate crawl_targets from existing offers + product expansion

-- PART A: Seed from existing offers (11 URLs with known marketplaces)
INSERT INTO crawl_targets (
  url,
  domain,
  marketplace_id,
  product_id,
  offer_id,
  priority_score,
  crawl_status,
  last_crawled_at,
  source,
  metadata
)
SELECT 
  o.url,
  SPLIT_PART(REPLACE(REPLACE(o.url, 'https://', ''), 'http://', ''), '/', 1) as domain,
  o.marketplace_id,
  o.product_id,
  o.id as offer_id,
  CASE 
    WHEN o.product_id IS NOT NULL THEN 80
    ELSE 60
  END as priority_score,
  'pending' as crawl_status,
  o.last_crawled_at,
  'existing_offer' as source,
  jsonb_build_object(
    'source', 'existing_offer',
    'offer_id', o.id,
    'seller_name', o.seller_name,
    'current_price', o.current_price,
    'seeded_at', NOW()
  ) as metadata
FROM offers o
WHERE o.url IS NOT NULL
  AND o.is_active = true
ON CONFLICT (url) DO NOTHING;

-- PART B: Generate search URLs for product expansion
INSERT INTO crawl_targets (
  url,
  domain,
  marketplace_id,
  product_id,
  priority_score,
  crawl_status,
  source,
  metadata
)
SELECT 
  'https://' || m.base_url || '/search?q=' || REPLACE(p.name, ' ', '+') as url,
  m.base_url as domain,
  m.id as marketplace_id,
  p.id as product_id,
  50 as priority_score,
  'pending' as crawl_status,
  'product_expansion' as source,
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
  SELECT DISTINCT product_id 
  FROM offers 
  WHERE product_id IS NOT NULL
)
  AND m.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM offers o 
    WHERE o.product_id = p.id 
      AND o.marketplace_id = m.id
  )
ON CONFLICT (url) DO NOTHING;

-- Summary
DO $$
DECLARE
  part_a_count INTEGER;
  part_b_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO part_a_count 
  FROM crawl_targets 
  WHERE source = 'existing_offer';
  
  SELECT COUNT(*) INTO part_b_count 
  FROM crawl_targets 
  WHERE source = 'product_expansion';
  
  SELECT COUNT(*) INTO total_count FROM crawl_targets;
  
  RAISE NOTICE 'Seeding complete:';
  RAISE NOTICE '  - Part A (existing offers): % targets', part_a_count;
  RAISE NOTICE '  - Part B (product expansion): % targets', part_b_count;
  RAISE NOTICE '  - Total crawl targets: %', total_count;
END $$;

-- VERIFICATION RESULTS (2026-06-12):
-- ✅ 11 existing_offer targets (priority 60-80)
-- ✅ 17 product_expansion targets (priority 50)
-- ✅ 28 total crawl targets
-- ✅ All status: pending
