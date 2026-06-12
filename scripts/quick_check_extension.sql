-- ============================================================================
-- BIJAKBELI EXTENSION BETA - QUICK DAILY CHECK
-- ============================================================================
-- Purpose: 30-second daily health check (simplified version)
-- Usage: Copy-paste ke Supabase SQL Editor
-- Updated: 2026-06-13
-- ============================================================================

WITH stats AS (
  SELECT 
    -- Collection stats
    COUNT(*) as total_all_time,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as collected_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as collected_7d,
    
    -- Matching stats
    COUNT(product_id) as total_matched,
    COUNT(*) FILTER (WHERE product_id IS NULL) as total_orphaned,
    COUNT(product_id) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::numeric / 
      NULLIF(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0) * 100 as match_rate_7d,
    
    -- Activity
    MAX(created_at) as last_collection,
    COUNT(DISTINCT product_url) as unique_products,
    COUNT(DISTINCT DATE(created_at)) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as active_days_7d
  FROM offers
  WHERE source = 'extension_snapshot'
)
SELECT 
  '📊 EXTENSION BETA - QUICK CHECK' as dashboard,
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator,
  '' as blank1,
  
  -- Header stats
  '📥 COLLECTIONS:' as metric1,
  total_all_time::text || ' total  |  ' ||
  collected_7d::text || ' last 7d  |  ' ||
  collected_24h::text || ' last 24h' as value1,
  '' as blank2,
  
  '🎯 MATCHING:' as metric2,
  total_matched::text || ' matched (visible)  |  ' ||
  total_orphaned::text || ' orphaned  |  ' ||
  COALESCE(ROUND(match_rate_7d, 1)::text || '% success rate', 'N/A') as value2,
  '' as blank3,
  
  '📈 ACTIVITY:' as metric3,
  unique_products::text || ' unique products  |  ' ||
  active_days_7d::text || ' active days (7d)  |  ' ||
  'Last: ' || TO_CHAR(last_collection, 'DD/MM HH24:MI') as value3,
  '' as blank4,
  
  '🏥 HEALTH:' as metric4,
  CASE 
    WHEN collected_24h >= 5 AND match_rate_7d >= 80 THEN '🟢 EXCELLENT - Everything working great!'
    WHEN collected_24h >= 1 AND match_rate_7d >= 60 THEN '🟡 GOOD - On track, minor improvements possible'
    WHEN collected_24h >= 1 THEN '🟠 FAIR - Collections OK, matching needs work'
    WHEN total_all_time >= 1 THEN '🔴 INACTIVE - No recent collections'
    ELSE '⚪ NO DATA - Extension not used yet'
  END as value4,
  '' as blank5,
  
  '💡 ACTION:' as metric5,
  CASE 
    WHEN collected_24h = 0 AND total_all_time = 0 THEN '→ Share extension link dengan beta testers'
    WHEN collected_24h = 0 THEN '→ Follow up dengan beta testers (no activity 24h)'
    WHEN match_rate_7d < 60 THEN '→ Add more products to database (low match rate)'
    WHEN total_orphaned >= 10 THEN '→ Review orphaned offers, create missing products'
    WHEN collected_24h < 5 THEN '→ Recruit more beta testers (target: 10+ collections/day)'
    ELSE '→ All good! Keep monitoring daily 🎉'
  END as value5,
  '' as blank6,
  
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator2,
  '✅ ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS') as timestamp,
  '🎯 Beta Target: 50+ products, 80%+ match rate' as target
FROM stats;


-- ============================================================================
-- RECENT ACTIVITY (Last 5 collections)
-- ============================================================================
SELECT 
  '' as spacer,
  '📝 RECENT ACTIVITY (Last 5):' as header,
  '' as blank
UNION ALL
SELECT 
  '',
  '─────────────────────────────────────',
  ''
UNION ALL
SELECT 
  TO_CHAR(o.created_at, 'DD/MM HH24:MI') as time,
  m.name || ': ' || LEFT(o.title, 45) || 
    CASE WHEN LENGTH(o.title) > 45 THEN '...' ELSE '' END as product,
  CASE 
    WHEN o.product_id IS NOT NULL THEN '✅ Matched'
    ELSE '⏳ Orphaned'
  END as status
FROM offers o
JOIN marketplaces m ON o.marketplace_id = m.id
WHERE o.source = 'extension_snapshot'
ORDER BY o.created_at DESC
LIMIT 5;
