-- CORRECTED: Auto-create crawl targets with proper schema
-- Based on actual crawl_targets table structure

-- First, check if marketplaces table exists and get IDs
-- Then create crawl targets for products missing them

INSERT INTO crawl_targets (
  product_id,
  url,
  domain,
  marketplace_id,
  offer_id,
  priority_score,
  crawl_status,
  next_crawl_at,
  last_crawled_at,
  error_count,
  source,
  metadata,
  created_at,
  updated_at
)
SELECT 
  p.id as product_id,
  p.url as url,
  CASE 
    WHEN p.marketplace = 'tokopedia' THEN 'tokopedia.com'
    WHEN p.marketplace = 'shopee' THEN 'shopee.co.id'
    WHEN p.marketplace = 'bukalapak' THEN 'bukalapak.com'
    WHEN p.marketplace = 'lazada' THEN 'lazada.co.id'
    WHEN p.marketplace = 'blibli' THEN 'blibli.com'
    WHEN p.marketplace = 'tiktok' THEN 'shop.tiktok.com'
    ELSE 'unknown.com'
  END as domain,
  NULL as marketplace_id, -- Will be populated if marketplaces table exists
  NULL as offer_id, -- Will be linked after first crawl
  80 as priority_score, -- High priority for initial crawl
  'queued' as crawl_status,
  NOW() as next_crawl_at, -- Crawl immediately
  NULL as last_crawled_at,
  0 as error_count,
  'auto_generated' as source,
  jsonb_build_object(
    'product_name', p.name,
    'marketplace', p.marketplace,
    'auto_created', true,
    'created_reason', 'missing_crawl_target'
  ) as metadata,
  NOW() as created_at,
  NOW() as updated_at
FROM products p
LEFT JOIN crawl_targets ct ON ct.product_id = p.id
WHERE ct.id IS NULL -- Only products without crawl targets
  AND p.url IS NOT NULL 
  AND p.url != ''
  AND p.url NOT LIKE '%sample%'
  AND p.url NOT LIKE '%test%'
  AND p.marketplace IS NOT NULL;

-- Show results
SELECT 
  COUNT(*) as new_crawl_targets_created,
  'Crawl targets auto-generated' as message
FROM crawl_targets ct
WHERE ct.created_at >= NOW() - INTERVAL '30 seconds'
  AND ct.source = 'auto_generated';

-- Show products that still need manual URL setup
SELECT 
  p.id,
  p.name,
  p.marketplace,
  p.url,
  CASE 
    WHEN p.url IS NULL OR p.url = '' THEN 'Missing URL'
    WHEN p.url LIKE '%sample%' OR p.url LIKE '%test%' THEN 'Sample/Test URL'
    WHEN p.marketplace IS NULL THEN 'Missing marketplace'
    ELSE 'Unknown issue'
  END as issue
FROM products p
LEFT JOIN crawl_targets ct ON ct.product_id = p.id
WHERE ct.id IS NULL
LIMIT 20;
