# BijakBeli.app - Price Collectors

Python-based price collectors untuk scraping data harga dari marketplace Indonesia.

## 🎯 Overview

Collectors ini bertanggung jawab untuk:
- Scraping harga produk dari marketplace (Tokopedia, Shopee, Blibli, Lazada, dll)
- Validasi dan normalisasi data
- Mengirim data ke `/api/ingestion` endpoint
- Logging dan error handling

## 📋 Requirements

```bash
pip install -r requirements.txt
```

**Dependencies:**
- `playwright` - Browser automation
- `beautifulsoup4` - HTML parsing
- `requests` - HTTP client
- `python-dotenv` - Environment variables
- `pydantic` - Data validation

## ⚙️ Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

**Required Environment Variables:**

```env
# BijakBeli API
BIJAKBELI_API_URL=https://www.bijakbeli.web.id
INGESTION_SECRET=your-ingestion-secret-here

# Supabase (untuk query product/marketplace IDs)
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key

# Collector Settings
COLLECTOR_NAME=python_playwright_collector
LOG_LEVEL=INFO
RETRY_COUNT=3
RETRY_DELAY=5
```

## 🚀 Usage

### 1. Install Playwright Browsers

```bash
playwright install chromium
```

### 2. Run Single Marketplace Collector

```bash
# Tokopedia
python collectors/tokopedia_collector.py --category electronics --limit 50

# Shopee
python collectors/shopee_collector.py --category electronics --limit 50
```

### 3. Run All Collectors (Scheduled)

```bash
python run_all_collectors.py
```

### 4. Test Ingestion API

```bash
python test_ingestion.py
```

## 📂 Project Structure

```
collectors/
├── README.md                   # This file
├── requirements.txt            # Python dependencies
├── .env.example               # Environment template
├── config.py                  # Configuration loader
├── base_collector.py          # Base collector class
├── ingestion_client.py        # API client for ingestion
├── tokopedia_collector.py     # Tokopedia scraper
├── shopee_collector.py        # Shopee scraper
├── blibli_collector.py        # Blibli scraper (TODO)
├── lazada_collector.py        # Lazada scraper (TODO)
├── run_all_collectors.py      # Run all collectors
├── test_ingestion.py          # Test ingestion API
└── utils/
    ├── __init__.py
    ├── parser.py              # HTML parsing utilities
    ├── validator.py           # Data validation
    └── logger.py              # Logging setup
```

## 🔧 Collector Development

### Base Collector Class

Semua collectors harus extend `BaseCollector`:

```python
from base_collector import BaseCollector

class TokopediaCollector(BaseCollector):
    def __init__(self):
        super().__init__(marketplace_name="tokopedia")
    
    async def scrape_product(self, product_url: str):
        # Implementation
        pass
    
    async def scrape_search_results(self, query: str, limit: int = 50):
        # Implementation
        pass
```

### Data Model

Collectors harus return data sesuai schema:

```python
{
    "job_name": "tokopedia_electronics_hourly",
    "source": "python_playwright_collector",
    "offers": [
        {
            "product_id": "uuid-from-db",
            "marketplace_id": "uuid-from-db",
            "marketplace_product_id": "tokopedia-12345",
            "seller_name": "Official Store",
            "is_official_store": True,
            "url": "https://tokopedia.com/product/12345",
            "current_price": 5000000,
            "original_price": 6000000,
            "stock_status": "in_stock",
            "rating": 4.8,
            "review_count": 1234,
            "sold_count": 567,
            "confidence_score": 95,
        }
    ]
}
```

## 🛡️ Best Practices

### 1. Rate Limiting
- Jangan scrape terlalu cepat (gunakan delays)
- Respect robots.txt
- Rotate user agents

### 2. Error Handling
- Retry dengan exponential backoff
- Log semua errors
- Jangan crash on single product failure

### 3. Data Quality
- Validasi semua fields sebelum send
- Set confidence_score berdasarkan data completeness
- Detect dan flag suspicious prices

### 4. Monitoring
- Log progress setiap N products
- Track success/failure rates
- Alert jika failure rate tinggi

## 📊 Monitoring & Logs

Logs disimpan di `logs/` directory:

```
logs/
├── tokopedia_2026-06-11.log
├── shopee_2026-06-11.log
└── ingestion_2026-06-11.log
```

Check ingestion logs di admin dashboard atau database:

```sql
SELECT * FROM ingestion_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔄 Scheduling

Gunakan cron untuk scheduling:

```cron
# Run every hour
0 * * * * cd /path/to/collectors && python run_all_collectors.py

# Run specific marketplace every 2 hours
0 */2 * * * cd /path/to/collectors && python collectors/tokopedia_collector.py
```

Atau gunakan tools seperti:
- **systemd timers** (Linux)
- **Task Scheduler** (Windows)
- **GitHub Actions** (cloud-based)
- **Railway** (deployment platform)

## 🚨 Troubleshooting

### Playwright Not Found
```bash
playwright install chromium
```

### Ingestion Failed: 401 Unauthorized
Check INGESTION_SECRET di `.env` match dengan server

### Timeout Errors
Increase timeout di config:
```python
SCRAPE_TIMEOUT = 60  # seconds
```

### Rate Limited by Marketplace
Add delay between requests:
```python
await asyncio.sleep(random.uniform(2, 5))
```

## 📝 TODO

- [ ] Implement Blibli collector
- [ ] Implement Lazada collector
- [ ] Add proxy rotation
- [ ] Add CAPTCHA detection & handling
- [ ] Implement distributed collecting
- [ ] Add metrics dashboard
- [ ] Add price conflict detection
- [ ] Implement incremental updates (only changed products)

## 🔗 Related Documentation

- [Ingestion API Documentation](../src/app/api/ingestion/route.ts)
- [Database Schema](../supabase/migrations/)
- [Admin Dashboard](../src/app/admin/)

## 📞 Support

Jika ada masalah:
1. Check logs di `logs/` directory
2. Check ingestion_logs di database
3. Test dengan `test_ingestion.py`
4. Review marketplace HTML structure (might have changed)
