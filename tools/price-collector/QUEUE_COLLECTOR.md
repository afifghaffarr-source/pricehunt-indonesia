# Queue-Based Collector

**New in Phase 9:** Data collection using refresh queue API instead of direct database access.

## Overview

This collector fetches targets from `/api/refresh/queue` API endpoint, which provides:
- ✅ Priority-sorted targets
- ✅ Smart scheduling (next_crawl_at)
- ✅ Status tracking (queued/processing/success/failed)
- ✅ No direct database access needed

## Prerequisites

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variable
export INGESTION_SECRET="your-secret-here"
```

## Usage

### Basic Run (Fetch 10 targets)
```bash
python queue_collector.py
```

### Environment Variables
```bash
# Required
INGESTION_SECRET=***  # Same secret as ingestion API

# Optional
NEXT_PUBLIC_APP_URL=https://www.bijakbeli.web.id  # Default
```

## How It Works

```
1. Fetch targets from /api/refresh/queue
   ├── Returns 10 highest priority targets
   ├── Filtered by next_crawl_at <= NOW
   └── Sorted by priority_score DESC

2. For each target:
   ├── Crawl the URL (TODO: implement with base_collector.py)
   ├── Extract price data
   ├── Submit to /api/ingestion/offer-snapshot
   └── Wait 3 seconds (rate limiting)

3. Report summary (success/failed counts)
```

## TODO: Implement Real Crawling

Current implementation is a **skeleton**. To make it functional:

1. **Import base_collector:**
```python
from base_collector import BasePriceCollector

def crawl_target(target):
    collector = BasePriceCollector()
    return collector.extract_from_url(target['url'])
```

2. **Handle errors gracefully:**
- Captcha detected → skip with warning
- Network timeout → retry with backoff
- Blocked → mark target as failed

3. **Update target status** (optional):
```python
# After successful crawl, call:
# POST /api/refresh/trigger with success status
```

## Architecture

```
┌─────────────────┐
│ Supabase DB     │
│ crawl_targets   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GET /api/       │
│ refresh/queue   │  ← Authenticated with INGESTION_SECRET
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ queue_collector │
│ .py             │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/      │
│ ingestion/      │  ← Submit extracted offers
│ offer-snapshot  │
└─────────────────┘
```

## Comparison: Old vs New

| Feature | Old (Direct DB) | New (Queue API) |
|---------|----------------|-----------------|
| Database access | Direct via Supabase client | API only |
| Credentials | Service role key | INGESTION_SECRET |
| Security | RLS bypass needed | Standard auth |
| Priority logic | In collector code | In API (centralized) |
| Status tracking | Manual updates | API managed |
| Deployment | Needs DB credentials | Portable |

## Cron Job Example

```bash
# /etc/cron.d/bijakbeli-collector
# Run every 6 hours
0 */6 * * * ubuntu cd /home/ubuntu/projects/bijakbeli-app/tools/price-collector && /usr/bin/python3 queue_collector.py >> /var/log/bijakbeli-collector.log 2>&1
```

## Monitoring

Check logs for:
```
✅ Success: 8
❌ Failed: 2
📊 Total: 10
```

## Next Steps

1. Implement real crawling logic (integrate base_collector.py)
2. Add error handling and retry logic
3. Test with production queue
4. Schedule as cron job or systemd service
5. Monitor success/failure rates
6. Adjust priority scoring based on results

## Security Notes

- ✅ Uses INGESTION_SECRET (same as ingestion API)
- ✅ No database credentials in collector
- ✅ Rate limited (3 sec delay between crawls)
- ✅ No stealth/evasion techniques
- ✅ Respects robots.txt implicitly
