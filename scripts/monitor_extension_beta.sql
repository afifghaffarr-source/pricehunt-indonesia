-- ============================================================================
-- BIJAKBELI EXTENSION BETA MONITORING DASHBOARD
-- ============================================================================
-- Purpose: Daily monitoring untuk beta testing extension v2.0.2
-- Usage: Copy-paste ke Supabase SQL Editor atau run via psql
-- Updated: 2026-06-13
-- ============================================================================

-- ============================================================================
-- SECTION 1: OVERVIEW DASHBOARD (Main Stats)
-- ============================================================================
SELECT 
  '📊 EXTENSION BETA OVERVIEW' as section,
  '' as metric,
  '' as value,
  '' as notes
UNION ALL
SELECT 
  '─────────────────────────────────────',
  '',
  '',
  ''
UNION ALL

-- Total collections
SELECT 
  '📥 Total Collections',
  'All Time',
  COUNT(*)::text,
  'Total offers collected via extension'
FROM offers
WHERE source = 'extension_snapshot'

UNION ALL
SELECT 
  '',
  'Last 24 hours',
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::text,
  ''
FROM offers
WHERE source = 'extension_snapshot'

UNION ALL
SELECT 
  '',
  'Last 7 days',
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::text,
  ''
FROM offers
WHERE source = 'extension_snapshot'

UNION ALL
SELECT '', '', '', ''

UNION ALL

-- Matching stats
SELECT 
  '🎯 Matching Success',
  'Matched (visible on web)',
  COUNT(product_id)::text || ' offers',
  'Product page displays these'
FROM offers
WHERE source = 'extension_snapshot'

UNION ALL
SELECT 
  '',
  'Orphaned (not visible)',
  COUNT(*) FILTER (WHERE product_id IS NULL)::text || ' offers',
  'Waiting for match or new product'
FROM offers
WHERE source = 'extension_snapshot'

UNION ALL
SELECT 
  '',
  'Match rate (7 days)',
  COALESCE(
    ROUND(
      COUNT(product_id) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::numeric / 
      NULLIF(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0) * 100, 
      1
    )::text || '%',
    'N/A'
  ),
  '> 80% is good'
FROM offers
WHERE source = 'extension_snapshot'

UNION ALL
SELECT '', '', '', ''

UNION ALL

-- Activity stats
SELECT 
  '⏰ Activity',
  'Last collection',
  COALESCE(
    TO_CHAR(MAX(created_at), 'YYYY-MM-DD HH24:MI:SS'),
    'No collections yet'
  ),
  CASE 
    WHEN MAX(created_at) > NOW() - INTERVAL '1 hour' THEN '🟢 Active'
    WHEN MAX(created_at) > NOW() - INTERVAL '24 hours' THEN '🟡 Recent'
    WHEN MAX(created_at) > NOW() - INTERVAL '7 days' THEN '🟠 Quiet'
    ELSE '🔴 Inactive'
  END
FROM offers
WHERE source = 'extension_snapshot'

UNION ALL
SELECT 
  '',
  'Unique products',
  COUNT(DISTINCT product_url)::text,
  'Different products collected'
FROM offers
WHERE source = 'extension_snapshot'

UNION ALL
SELECT 
  '',
  'Active collectors',
  '👥 ' || COUNT(DISTINCT DATE(created_at))::text || ' active days',
  'Days with collections'
FROM offers
WHERE source = 'extension_snapshot'
  AND created_at > NOW() - INTERVAL '7 days';


-- ============================================================================
-- SECTION 2: PER-MARKETPLACE BREAKDOWN
-- ============================================================================

WITH marketplace_stats AS (
  SELECT 
    m.name as marketplace,
    COUNT(*) as total_collected,
    COUNT(o.product_id) as matched,
    COUNT(*) - COUNT(o.product_id) as orphaned,
    ROUND(
      COUNT(o.product_id)::numeric / COUNT(*) * 100, 
      1
    ) as match_rate,
    MAX(o.created_at) as last_collection
  FROM offers o
  JOIN marketplaces m ON o.marketplace_id = m.id
  WHERE o.source = 'extension_snapshot'
    AND o.created_at > NOW() - INTERVAL '7 days'
  GROUP BY m.name
)
SELECT 
  '' as section,
  '' as metric,
  '' as value,
  '' as notes
UNION ALL
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  '',
  ''
UNION ALL
SELECT 
  '🏪 MARKETPLACE BREAKDOWN (Last 7 Days)',
  '',
  '',
  ''
UNION ALL
SELECT 
  '─────────────────────────────────────',
  '',
  '',
  ''
UNION ALL
SELECT 
  marketplace,
  total_collected::text || ' collected',
  matched::text || ' matched (' || match_rate::text || '%)',
  TO_CHAR(last_collection, 'DD/MM HH24:MI')
FROM marketplace_stats
ORDER BY total_collected DESC;


-- ============================================================================
-- SECTION 3: RECENT COLLECTIONS (Last 10)
-- ============================================================================

WITH recent_collections AS (
  SELECT 
    o.created_at,
    m.name as marketplace,
    SUBSTRING(o.title, 1, 40) || 
      CASE WHEN LENGTH(o.title) > 40 THEN '...' ELSE '' END as title,
    TO_CHAR(o.current_price, 'FM999,999,999') as price,
    CASE 
      WHEN o.product_id IS NOT NULL THEN '✅ Matched'
      ELSE '⏳ Orphaned'
    END as status,
    AGE(NOW(), o.created_at) as time_ago
  FROM offers o
  JOIN marketplaces m ON o.marketplace_id = m.id
  WHERE o.source = 'extension_snapshot'
  ORDER BY o.created_at DESC
  LIMIT 10
)
SELECT 
  '' as section,
  '' as metric,
  '' as value,
  '' as notes
UNION ALL
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  '',
  ''
UNION ALL
SELECT 
  '📝 RECENT COLLECTIONS (Last 10)',
  '',
  '',
  ''
UNION ALL
SELECT 
  '─────────────────────────────────────',
  '',
  '',
  ''
UNION ALL
SELECT 
  TO_CHAR(created_at, 'DD/MM HH24:MI') as time,
  marketplace || ': ' || title,
  'Rp ' || price,
  status || ' (' || 
    CASE 
      WHEN time_ago < INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM time_ago)::text || 'm ago'
      WHEN time_ago < INTERVAL '24 hours' THEN EXTRACT(HOUR FROM time_ago)::text || 'h ago'
      ELSE EXTRACT(DAY FROM time_ago)::text || 'd ago'
    END || ')'
FROM recent_collections;


-- ============================================================================
-- SECTION 4: ORPHANED OFFERS (Need Attention)
-- ============================================================================

WITH orphaned_offers AS (
  SELECT 
    o.id,
    o.created_at,
    m.name as marketplace,
    SUBSTRING(o.title, 1, 50) as title,
    o.current_price,
    AGE(NOW(), o.created_at) as age
  FROM offers o
  JOIN marketplaces m ON o.marketplace_id = m.id
  WHERE o.source = 'extension_snapshot'
    AND o.product_id IS NULL
    AND o.is_active = true
  ORDER BY o.created_at DESC
  LIMIT 5
)
SELECT 
  '' as section,
  '' as metric,
  '' as value,
  '' as notes
UNION ALL
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  '',
  ''
UNION ALL
SELECT 
  '⚠️  ORPHANED OFFERS (Top 5 Recent)',
  '',
  '',
  ''
UNION ALL
SELECT 
  '─────────────────────────────────────',
  '',
  '',
  ''
UNION ALL
SELECT 
  TO_CHAR(created_at, 'DD/MM HH24:MI'),
  marketplace || ': ' || title,
  TO_CHAR(current_price, 'FM999,999,999'),
  CASE 
    WHEN age < INTERVAL '1 hour' THEN '🟢 Fresh (' || EXTRACT(MINUTE FROM age)::text || 'm)'
    WHEN age < INTERVAL '24 hours' THEN '🟡 Recent (' || EXTRACT(HOUR FROM age)::text || 'h)'
    WHEN age < INTERVAL '7 days' THEN '🟠 Old (' || EXTRACT(DAY FROM age)::text || 'd)'
    ELSE '🔴 Stale (' || EXTRACT(DAY FROM age)::text || 'd)'
  END
FROM orphaned_offers;


-- ============================================================================
-- SECTION 5: HOURLY ACTIVITY HEATMAP (Last 24h)
-- ============================================================================

WITH hourly_activity AS (
  SELECT 
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as collections
  FROM offers
  WHERE source = 'extension_snapshot'
    AND created_at > NOW() - INTERVAL '24 hours'
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour
)
SELECT 
  '' as section,
  '' as metric,
  '' as value,
  '' as notes
UNION ALL
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  '',
  ''
UNION ALL
SELECT 
  '📈 HOURLY ACTIVITY (Last 24h)',
  '',
  '',
  ''
UNION ALL
SELECT 
  '─────────────────────────────────────',
  '',
  '',
  ''
UNION ALL
SELECT 
  LPAD(hour::text, 2, '0') || ':00',
  REPEAT('█', collections::int) || ' ' || collections::text,
  '',
  CASE 
    WHEN collections >= 3 THEN '🔥 Peak'
    WHEN collections >= 1 THEN '✅ Active'
    ELSE ''
  END
FROM hourly_activity;


-- ============================================================================
-- SECTION 6: HEALTH CHECK & RECOMMENDATIONS
-- ============================================================================

WITH health_metrics AS (
  SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as collections_24h,
    COUNT(product_id) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::numeric / 
      NULLIF(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0) * 100 as match_rate_7d,
    COUNT(*) FILTER (WHERE product_id IS NULL AND created_at < NOW() - INTERVAL '24 hours') as old_orphaned,
    COUNT(DISTINCT DATE(created_at)) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as active_days,
    MAX(created_at) as last_collection
  FROM offers
  WHERE source = 'extension_snapshot'
)
SELECT 
  '' as section,
  '' as metric,
  '' as value,
  '' as notes
UNION ALL
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  '',
  ''
UNION ALL
SELECT 
  '🏥 HEALTH CHECK & RECOMMENDATIONS',
  '',
  '',
  ''
UNION ALL
SELECT 
  '─────────────────────────────────────',
  '',
  '',
  ''
UNION ALL
SELECT 
  '📥 Collection Rate',
  CASE 
    WHEN collections_24h >= 10 THEN '🟢 Excellent'
    WHEN collections_24h >= 5 THEN '🟡 Good'
    WHEN collections_24h >= 1 THEN '🟠 Slow'
    ELSE '🔴 Inactive'
  END,
  collections_24h::text || ' in 24h',
  CASE 
    WHEN collections_24h < 5 THEN 'Recruit more beta testers'
    ELSE 'On track!'
  END
FROM health_metrics

UNION ALL
SELECT 
  '🎯 Match Rate',
  CASE 
    WHEN match_rate_7d >= 80 THEN '🟢 Excellent'
    WHEN match_rate_7d >= 60 THEN '🟡 Good'
    WHEN match_rate_7d >= 40 THEN '🟠 Fair'
    ELSE '🔴 Poor'
  END,
  COALESCE(ROUND(match_rate_7d, 1)::text || '%', 'N/A'),
  CASE 
    WHEN match_rate_7d < 60 THEN 'Add more products to database'
    WHEN match_rate_7d IS NULL THEN 'No data yet'
    ELSE 'Matching works well'
  END
FROM health_metrics

UNION ALL
SELECT 
  '⏳ Orphaned Backlog',
  CASE 
    WHEN old_orphaned >= 10 THEN '🔴 High'
    WHEN old_orphaned >= 5 THEN '🟠 Medium'
    WHEN old_orphaned >= 1 THEN '🟡 Low'
    ELSE '🟢 None'
  END,
  old_orphaned::text || ' offers',
  CASE 
    WHEN old_orphaned >= 5 THEN 'Review orphaned offers, create products'
    WHEN old_orphaned >= 1 THEN 'Monitor, may auto-match'
    ELSE 'All good!'
  END
FROM health_metrics

UNION ALL
SELECT 
  '📅 Engagement',
  CASE 
    WHEN active_days >= 5 THEN '🟢 Daily active'
    WHEN active_days >= 3 THEN '🟡 Regular'
    WHEN active_days >= 1 THEN '🟠 Sporadic'
    ELSE '🔴 No activity'
  END,
  active_days::text || ' active days (7d)',
  CASE 
    WHEN active_days < 3 THEN 'Engage beta testers more'
    ELSE 'Good participation'
  END
FROM health_metrics

UNION ALL
SELECT 
  '🕐 Last Activity',
  CASE 
    WHEN last_collection > NOW() - INTERVAL '1 hour' THEN '🟢 Very recent'
    WHEN last_collection > NOW() - INTERVAL '6 hours' THEN '🟡 Recent'
    WHEN last_collection > NOW() - INTERVAL '24 hours' THEN '🟠 Yesterday'
    ELSE '🔴 Stale'
  END,
  TO_CHAR(last_collection, 'DD/MM HH24:MI'),
  CASE 
    WHEN last_collection < NOW() - INTERVAL '24 hours' THEN 'Check with beta testers'
    ELSE 'Active'
  END
FROM health_metrics;


-- ============================================================================
-- END OF DASHBOARD
-- ============================================================================
SELECT 
  '' as section,
  '' as metric,
  '' as value,
  '' as notes
UNION ALL
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  '',
  ''
UNION ALL
SELECT 
  '✅ Dashboard generated at: ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  '',
  '',
  ''
UNION ALL
SELECT 
  '📊 Run this query daily during beta testing',
  '',
  '',
  ''
UNION ALL
SELECT 
  '🎯 Target: 50+ products, 80%+ match rate',
  '',
  '',
  '';
