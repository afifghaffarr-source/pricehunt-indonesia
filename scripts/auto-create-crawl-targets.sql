-- Auto-create crawl targets for all products missing them
-- This should have been automated from the start

-- Insert crawl targets for products that don't have any
INSERT INTO crawl_targets (
  product_id,
  url,
  marketplace,
  priority,
  crawl_interval_minutes,
  next_crawl_at,
  crawl_status,
  created_at,
  updated_at
)
SELECT 
  p.id as product_id,
  p.url as url,
  p.marketplace as marketplace,
  5 as priority, -- medium priority
  360 as crawl_interval_minutes, -- 6 hours
  NOW() as next_crawl_at, -- crawl immediately
  'queued' as crawl_status,
  NOW() as created_at,
  NOW() as updated_at
FROM products p
LEFT JOIN crawl_targets ct ON ct.product_id = p.id
WHERE ct.id IS NULL -- only products without crawl targets
  AND p.url IS NOT NULL 
  AND p.url != ''
  AND p.marketplace IS NOT NULL;

-- Show what was created
SELECT 
  COUNT(*) as new_crawl_targets_created,
  'Crawl targets auto-generated for products' as message
FROM crawl_targets ct
WHERE ct.created_at >= NOW() - INTERVAL '10 seconds';

-- Show products still without targets (need manual marketplace URLs)
SELECT 
  p.id,
  p.name,
  p.marketplace,
  p.url,
  'Missing valid marketplace URL' as issue
FROM products p
LEFT JOIN crawl_targets ct ON ct.product_id = p.id
WHERE ct.id IS NULL
  AND (p.url IS NULL OR p.url = '' OR p.marketplace IS NULL)
LIMIT 20;
