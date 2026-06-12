#!/bin/bash
# Monitor BijakBeli extension beta activity
# Usage: ./monitor_beta.sh

echo "📊 BijakBeli Extension - Beta Activity Monitor"
echo "=============================================="
echo ""

# Check recent offers from chrome-extension source
echo "🔍 Recent Chrome Extension Collections (Last 24h):"
echo ""
echo "Run this SQL in Supabase:"
echo ""
cat << 'SQL'
-- Check offers collected via extension
SELECT 
  created_at,
  marketplace,
  title,
  price,
  source,
  confidence_score,
  product_id IS NOT NULL as matched
FROM offers
WHERE source = 'chrome-extension'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
SQL

echo ""
echo "=============================================="
echo ""

# Summary stats
echo "📈 Beta Testing Summary Stats:"
echo ""
echo "Run this SQL in Supabase:"
echo ""
cat << 'SQL'
-- Beta testing metrics
WITH extension_offers AS (
  SELECT *
  FROM offers
  WHERE source = 'chrome-extension'
)
SELECT 
  COUNT(*) as total_collections,
  COUNT(DISTINCT marketplace) as marketplaces_used,
  COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as auto_matched,
  ROUND(100.0 * COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) / COUNT(*), 1) as match_rate_pct,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  MIN(created_at) as first_collection,
  MAX(created_at) as last_collection
FROM extension_offers;
SQL

echo ""
echo "=============================================="
echo ""

# By marketplace
echo "🏪 Collections by Marketplace:"
echo ""
echo "Run this SQL in Supabase:"
echo ""
cat << 'SQL'
-- Breakdown by marketplace
SELECT 
  marketplace,
  COUNT(*) as collections,
  COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as matched,
  ROUND(AVG(confidence_score), 1) as avg_confidence
FROM offers
WHERE source = 'chrome-extension'
GROUP BY marketplace
ORDER BY collections DESC;
SQL

echo ""
echo "=============================================="
echo ""

# Hourly activity
echo "⏰ Collection Activity by Hour (Last 7 days):"
echo ""
echo "Run this SQL in Supabase:"
echo ""
cat << 'SQL'
-- Hourly activity pattern
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as collections,
  STRING_AGG(DISTINCT marketplace, ', ') as marketplaces
FROM offers
WHERE source = 'chrome-extension'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;
SQL

echo ""
echo "=============================================="
echo ""

# Check auto-matching logs
echo "🔄 Auto-Matching Cron Status:"
echo ""
echo "tail -20 /home/ubuntu/projects/bijakbeli-app/logs/cron_auto_match.log"
echo ""
echo "=============================================="
echo ""

# Check API logs
echo "📡 Extension API Calls (Last 50 lines):"
echo ""
echo "# Check Vercel logs or application logs for /api/ingestion/offer-snapshot"
echo "# Look for requests with source='chrome-extension'"
echo ""
echo "=============================================="
echo ""

echo "✅ Monitoring Guide Created!"
echo ""
echo "To monitor beta activity:"
echo "1. Run the SQL queries above in Supabase SQL Editor"
echo "2. Check cron logs: tail -f ~/projects/bijakbeli-app/logs/cron_auto_match.log"
echo "3. Watch for browser notifications when cron runs"
echo "4. Verify new products appearing on www.bijakbeli.app"
echo ""
echo "📞 Contact beta testers if:"
echo "- No collections after 24 hours"
echo "- Match rate drops below 80%"
echo "- Multiple failed ingestions"
echo ""
