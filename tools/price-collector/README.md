# BijakBeli.app - Price Collector

**Transparent semi-automated** price data collection tool untuk marketplace Indonesia.

## ⚖️ Ethics & Transparency

This collector operates with full transparency:
- ✅ **NO anti-detection tricks** (no stealth mode, no automation hiding)
- ✅ **Semi-manual workflow** (admin reviews pages before extraction)
- ✅ **Respectful rate limiting** (2-5 second delays)
- ✅ **Public data only** (no login, no cookies, no personal data)
- ✅ **Visible browser** (headless=false by default)
- ❌ **NO captcha bypass**
- ❌ **NO cloudflare evasion**
- ❌ **NO bot detection hiding**

**Purpose:** Help consumers compare prices from publicly visible product pages.

## Status: ✅ CONFIGURED & READY

**Production API:** https://bijakbeli-app.vercel.app  
**Authentication:** INGESTION_SECRET configured in Vercel + local .env  
**Last tested:** 2026-06-11 (API connection successful)

## Setup (Already Done)

1. ✅ Python 3.11+ venv created with all dependencies
2. ✅ INGESTION_SECRET generated and added to Vercel production
3. ✅ `.env` configured to use production API
4. ✅ API connection tested successfully

## Usage

### Activate venv
```bash
cd ~/projects/bijakbeli-app/tools/price-collector
source venv/bin/activate
```

### Test API Connection
```bash
python collector.py test
```

### Collect Data - URL Mode
Extract data from a specific product URL:
```bash
python collector.py url --marketplace tokopedia --url "https://www.tokopedia.com/..."
```

### Collect Data - Keyword Mode
Search by keyword and select products:
```bash
python collector.py keyword --marketplace tokopedia --keyword "iphone 15 pro max" --limit 5
```

### Collect Data - Manual Mode
Open browser and manually browse, then extract:
```bash
python collector.py manual --marketplace shopee
```

## Automation

### Quick Manual Run
```bash
cd ~/projects/bijakbeli-app/tools/price-collector && \
source venv/bin/activate && \
python collector.py keyword --marketplace tokopedia --keyword "smartphone" --limit 3
```

### Cron Job Example
Run daily at 2 AM to collect data:
```cron
0 2 * * * cd ~/projects/bijakbeli-app/tools/price-collector && source venv/bin/activate && python collector.py keyword --marketplace tokopedia --keyword "trending" --limit 10 >> ~/logs/price-collector.log 2>&1
```

## Configuration

`.env` file (already configured):
- `BIJAKBELI_API_URL`: Production URL
- `INGESTION_SECRET`: Matches Vercel environment variable
- `DEFAULT_MARKETPLACE`: tokopedia
- `COLLECTOR_HEADLESS`: false (shows browser)
- Rate limits: 2-5 second delays between requests

## Schema Notes (CRITICAL!)

**Actual offers table schema** (discovered 2026-06-11):
- `price` (NOT current_price)
- `in_stock` boolean (NOT stock_status enum)
- `shipping_cost` (NOT shipping_estimate)

The collector sends data to `/api/ingestion/offer-snapshot` which:
1. Normalizes the data
2. Creates/finds product by URL
3. Creates offer record in `offers` table
4. Creates price_snapshot for history
5. Runs confidence scoring and anomaly detection

## Supported Marketplaces

- ✅ Tokopedia (full support)
- ✅ Shopee (full support)
- ⏳ Lazada (parsers ready, not tested)
- ⏳ Bukalapak (parsers ready, not tested)
- ⏳ Blibli (parsers ready, not tested)

## Output

Collector sends data to production API and displays:
- ✅ Success with offer_id, confidence score, confidence label
- ⚠️ Warnings if any (low confidence, potential anomalies)
- ❌ Errors with details

All data is stored in:
- `offers` table (main offer data)
- `price_snapshots` table (historical price tracking)
- `ingestion_logs` table (audit trail)

## Next Steps

1. **Test real collection**: Run URL mode with actual product
2. **Setup cron**: Schedule periodic data collection
3. **Monitor**: Check ingestion_logs and offers table
4. **Expand**: Add more keywords/products to track

## Troubleshooting

### API Connection Failed
- Check INGESTION_SECRET matches Vercel env var
- Verify production URL is accessible
- Check network connectivity

### Browser Not Opening
- Set `COLLECTOR_HEADLESS=false` in .env
- Check Playwright is installed: `playwright install`

### Data Not Appearing
- Check ingestion_logs table for errors
- Verify offers table has data
- Remember: UI still uses old `prices` table (Phase 7 will migrate)

## Files

- `collector.py`: Main CLI entry point
- `config.py`: Configuration loader
- `api_client.py`: API communication
- `base_collector.py`: Base collector class
- `marketplaces/tokopedia.py`: Tokopedia scraper
- `marketplaces/shopee.py`: Shopee scraper
- `normalizer.py`: Data normalization
- `generic_parser.py`: Generic HTML parser

---

**For automation questions, see:** `bijakbeli-development` skill  
**For schema questions, see:** Memory (BijakBeli critical schema notes)
