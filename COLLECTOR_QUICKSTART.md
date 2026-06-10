# 🤖 QUICK START: Implement Tokopedia Collector

**Goal:** Get REAL marketplace data flowing in 2-4 hours  
**Difficulty:** Medium  
**Prerequisites:** Python 3.11+, Playwright installed

---

## 📋 Overview

This guide helps you implement a basic Tokopedia price collector that:
- Scrapes product data from Tokopedia
- Sends to `/api/ingestion` endpoint
- Populates your database with real prices
- Runs on schedule (hourly/daily)

---

## 🚀 Step 1: Setup Local Environment (15 min)

**1.1 Install Dependencies**
```bash
cd ~/projects/pricehunt-indonesia/collectors

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser
playwright install chromium
```

**1.2 Create .env File**
```bash
cp .env.example .env
```

**Edit `.env`:**
```env
# PriceHunt API
PRICEHUNT_API_URL=https://your-app.vercel.app
INGESTION_SECRET=demo-ingestion-secret-67890

# Supabase (untuk query product/marketplace IDs)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key-here

# Collector Settings
COLLECTOR_NAME=tokopedia_playwright_collector
LOG_LEVEL=INFO
RETRY_COUNT=3
RETRY_DELAY=5
```

---

## 💻 Step 2: Implement Tokopedia Collector (1-2 hours)

**2.1 Create `tokopedia_collector.py`:**

```python
# collectors/tokopedia_collector.py

import asyncio
import re
from playwright.async_api import async_playwright, Page
from base_collector import BaseCollector
from ingestion_client import IngestionClient
import logging

logger = logging.getLogger(__name__)

class TokopediaCollector(BaseCollector):
    """Tokopedia marketplace collector using Playwright."""
    
    def __init__(self):
        super().__init__(marketplace_name="tokopedia")
        self.base_url = "https://www.tokopedia.com"
    
    async def scrape_product_url(self, url: str, product_id: str) -> dict:
        """
        Scrape single product from Tokopedia URL.
        
        Args:
            url: Tokopedia product URL
            product_id: UUID from database
            
        Returns:
            Offer dict with price data
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(2000)  # Wait for JS rendering
                
                # Extract price
                price_el = await page.query_selector('[data-testid="lblPDP Price"]')
                if not price_el:
                    raise ValueError("Price element not found")
                
                price_text = await price_el.inner_text()
                price = self._parse_price(price_text)
                
                # Extract seller
                seller_el = await page.query_selector('[data-testid="llbPDPFooterShopName"]')
                seller_name = await seller_el.inner_text() if seller_el else "Unknown"
                
                # Extract stock status
                stock_btn = await page.query_selector('[data-testid="btnAtc"]')
                stock_text = await stock_btn.inner_text() if stock_btn else ""
                in_stock = "Tambah" in stock_text or "Beli" in stock_text
                
                # Extract rating
                rating_el = await page.query_selector('[data-testid="lblPDPDetailProductRatingNumber"]')
                rating_text = await rating_el.inner_text() if rating_el else "0"
                rating = float(rating_text.replace(",", ".")) if rating_text else 0.0
                
                # Extract reviews
                review_el = await page.query_selector('[data-testid="lblPDPDetailProductRatingCounter"]')
                review_text = await review_el.inner_text() if review_el else "0"
                review_count = self._parse_number(review_text)
                
                # Extract sold count
                sold_el = await page.query_selector('[data-testid="lblPDPDetailProductSoldCounter"]')
                sold_text = await sold_el.inner_text() if sold_el else "0"
                sold_count = self._parse_number(sold_text)
                
                offer = {
                    "product_id": product_id,
                    "marketplace_id": self.marketplace_id,
                    "url": url,
                    "current_price": price,
                    "seller_name": seller_name,
                    "stock_status": "in_stock" if in_stock else "out_of_stock",
                    "rating": rating,
                    "review_count": review_count,
                    "sold_count": sold_count,
                    "confidence_score": 90,  # High confidence for direct scrape
                }
                
                logger.info(f"✅ Scraped: {seller_name} - Rp {price:,}")
                return offer
                
            except Exception as e:
                logger.error(f"❌ Failed to scrape {url}: {e}")
                raise
            finally:
                await browser.close()
    
    def _parse_price(self, price_text: str) -> int:
        """Parse Indonesian price format to integer."""
        # "Rp1.500.000" → 1500000
        cleaned = re.sub(r"[Rp\s.]", "", price_text)
        return int(cleaned)
    
    def _parse_number(self, text: str) -> int:
        """Parse numbers with K/rb notation."""
        # "1.5rb" → 1500, "2K" → 2000
        text = text.lower().strip()
        
        if "rb" in text or "k" in text:
            num = float(re.sub(r"[^\d.]", "", text))
            return int(num * 1000)
        
        cleaned = re.sub(r"[^\d]", "", text)
        return int(cleaned) if cleaned else 0


async def main():
    """Example usage."""
    collector = TokopediaCollector()
    
    # Example: scrape known Tokopedia URLs for products in DB
    test_data = [
        {
            "product_id": "00000000-0000-0000-0000-000000000001",  # Samsung S24 from seed
            "url": "https://www.tokopedia.com/samsungofficial/samsung-galaxy-s24-ultra-12-256gb"
        }
    ]
    
    offers = []
    for item in test_data:
        try:
            offer = await collector.scrape_product_url(item["url"], item["product_id"])
            offers.append(offer)
        except Exception as e:
            logger.error(f"Failed: {e}")
    
    # Send to ingestion API
    if offers:
        client = IngestionClient()
        result = client.ingest_offers(
            job_name="tokopedia_manual_test",
            offers=offers
        )
        print(f"✅ Ingestion result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 🧪 Step 3: Test Locally (30 min)

**3.1 Add Test Product URLs to Database**

```sql
-- Supabase SQL Editor

-- Get marketplace ID
SELECT id, name FROM marketplaces WHERE name = 'tokopedia';
-- Copy the UUID

-- Add Tokopedia URLs to existing products
UPDATE products
SET specs = jsonb_set(
  specs,
  '{tokopedia_url}',
  '"https://www.tokopedia.com/samsungofficial/samsung-galaxy-s24-ultra"'
)
WHERE slug = 'samsung-galaxy-s24-ultra';
```

**3.2 Run Test**
```bash
cd ~/projects/pricehunt-indonesia/collectors
source venv/bin/activate
python tokopedia_collector.py
```

**Expected Output:**
```
✅ Scraped: Samsung Official Store - Rp 18,999,000
✅ Ingestion result: {'success': True, 'offers_created': 1}
```

**3.3 Verify in Database**
```sql
-- Check prices table
SELECT 
  p.name,
  m.display_name,
  pr.price,
  pr.seller,
  pr.last_updated
FROM prices pr
JOIN products p ON pr.product_id = p.id
JOIN marketplaces m ON pr.marketplace_id = m.id
WHERE m.name = 'tokopedia'
ORDER BY pr.last_updated DESC;
```

---

## 🚀 Step 4: Deploy Collector (1 hour)

**Option A: Railway (Recommended)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init
# Project name: pricehunt-collectors

# Set environment variables
railway variables set PRICEHUNT_API_URL=https://your-app.vercel.app
railway variables set INGESTION_SECRET=demo-ingestion-secret-67890
# ... set all vars from .env

# Deploy
railway up

# Schedule cron (Railway dashboard)
# Command: python tokopedia_collector.py
# Schedule: 0 */2 * * * (every 2 hours)
```

**Option B: Render**

```yaml
# render.yaml
services:
  - type: cron
    name: tokopedia-collector
    env: python
    buildCommand: pip install -r requirements.txt && playwright install chromium
    startCommand: python tokopedia_collector.py
    schedule: "0 */2 * * *"  # Every 2 hours
    envVars:
      - key: PRICEHUNT_API_URL
        sync: false
      - key: INGESTION_SECRET
        sync: false
```

**Option C: VPS Cron** (if you have existing VPS)

```bash
# On VPS
cd /opt/pricehunt-collectors
git clone <repo>
cd collectors
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# Add to crontab
crontab -e

# Add line:
0 */2 * * * cd /opt/pricehunt-collectors/collectors && /opt/pricehunt-collectors/collectors/venv/bin/python tokopedia_collector.py >> /var/log/tokopedia-collector.log 2>&1
```

---

## 📊 Step 5: Monitor & Scale (ongoing)

**5.1 Check Logs**
```bash
# Railway
railway logs

# Render
# Dashboard → Service → Logs

# VPS
tail -f /var/log/tokopedia-collector.log
```

**5.2 Monitor Ingestion**
```sql
-- Supabase SQL Editor
SELECT 
  job_name,
  status,
  offers_processed,
  created_at
FROM ingestion_logs
ORDER BY created_at DESC
LIMIT 10;
```

**5.3 Scale to More Products**

Add more product URLs:
```python
# tokopedia_collector.py

PRODUCTS_TO_SCRAPE = [
    {"product_id": "uuid-1", "url": "https://tokopedia.com/..."},
    {"product_id": "uuid-2", "url": "https://tokopedia.com/..."},
    # ... add 10-50 products
]
```

---

## 🎯 Next Steps

**Short-term:**
- [ ] Add error handling & retries
- [ ] Implement rate limiting (2-5s delay between requests)
- [ ] Add CAPTCHA detection
- [ ] Rotate user agents

**Medium-term:**
- [ ] Implement Shopee collector
- [ ] Implement Lazada collector
- [ ] Add proxy rotation
- [ ] Distributed collecting (multiple workers)

**Long-term:**
- [ ] ML-based price anomaly detection
- [ ] Auto-discovery of new products
- [ ] Real-time price monitoring

---

## ⚠️ Legal & Best Practices

**Rate Limiting:**
- Max 1 request per 3 seconds
- Respect robots.txt
- Use polite user agent

**Terms of Service:**
- Review marketplace ToS
- Don't overload servers
- Consider official APIs if available

**Data Usage:**
- Only scrape publicly available data
- Don't store PII
- Respect copyright on images/descriptions

---

## 🐛 Common Issues

**Playwright timeout:**
- Increase timeout: `timeout=60000`
- Check network connectivity
- Verify URL is accessible

**Element not found:**
- Tokopedia might have changed HTML
- Use browser inspector to find new selectors
- Add wait_for_selector before querying

**CAPTCHA blocking:**
- Slow down requests
- Rotate user agents
- Consider using residential proxies

---

**Estimated Time:** 2-4 hours  
**Result:** Real Tokopedia data in your app  
**Scalability:** Easy to add more marketplaces

---

*Created: 11 Juni 2026, 08:00 WIB*
