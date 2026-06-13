#!/usr/bin/env python3
"""
Cron-friendly scraper for periodic price updates
Runs every 6 hours to keep prices fresh
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Set DISPLAY for XVFB
os.environ['DISPLAY'] = ':99'

from tokopedia_collector import TokopediaCollector
from config import get_config
import requests

# Config
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'https://siwmmzzhfzfndfmbbyvj.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
BATCH_SIZE = 20  # Process 20 URLs per cron run
DELAY_BETWEEN = 3  # Seconds between requests

async def main():
    """Main cron scraper logic"""
    
    print(f"\n{'='*60}")
    print(f"CRON SCRAPER - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_ROLE_KEY not set!")
        sys.exit(1)
    
    # 1. Fetch queued targets (prioritize oldest)
    print(f"Fetching up to {BATCH_SIZE} targets...")
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/crawl_targets",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        params={
            "crawl_status": "eq.queued",
            "select": "id,url,domain",
            "order": "next_crawl_at.asc.nullsfirst,priority_score.desc",
            "limit": BATCH_SIZE
        },
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch targets: {response.status_code}")
        sys.exit(1)
    
    targets = response.json()
    print(f"✅ Found {len(targets)} targets to scrape\n")
    
    if not targets:
        print("No queued targets found. Exiting.")
        sys.exit(0)
    
    # 2. Scrape and ingest
    collector = TokopediaCollector()
    cfg = get_config()
    
    success_count = 0
    fail_count = 0
    
    for i, target in enumerate(targets, 1):
        target_id = target['id']
        url = target['url']
        
        print(f"\n[{i}/{len(targets)}] {target_id[:8]}...")
        print(f"URL: {url[:70]}...")
        
        try:
            # Scrape
            result = await collector.scrape_product(url)
            
            if not result or not result.get('name'):
                print(f"   ❌ No data extracted")
                fail_count += 1
                
                # Mark as failed
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/crawl_targets",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal"
                    },
                    params={"id": f"eq.{target_id}"},
                    json={
                        "crawl_status": "failed",
                        "error_message": "No data extracted",
                        "last_crawled_at": datetime.utcnow().isoformat()
                    },
                    timeout=10
                )
                continue
            
            print(f"   ✅ Scraped: {result['name'][:50]}...")
            print(f"   Price: Rp {result.get('price', 0):,.0f}")
            
            # Extract marketplace_product_id from URL
            url_parts = url.rstrip('/').split('-')
            marketplace_product_id = url_parts[-1] if url_parts else 'unknown'
            
            # Prepare offer data
            offer_data = {
                "marketplace": "tokopedia",
                "product_url": result.get('url', url),
                "title": result.get('name', ''),
                "price": result.get('price'),
                "original_price": result.get('original_price', result.get('price')),
                "discount_percentage": result.get('discount_percentage', 0),
                "rating": result.get('rating', 0.0),
                "sold_count": result.get('sold_count', 0),
                "marketplace_product_id": marketplace_product_id,
                "source": "browser_collector",
            }
            
            # Add image_url only if valid
            image_url = result.get('image_url')
            if image_url and image_url.startswith('http'):
                offer_data['image_url'] = image_url
            
            # Ingest to API
            ingest_response = requests.post(
                f"{cfg.pricehunt_api_url}/api/ingestion/offer-snapshot",
                headers={
                    "Content-Type": "application/json",
                    "X-Ingestion-Secret": cfg.ingestion_secret
                },
                json=offer_data,
                timeout=30
            )
            
            if ingest_response.status_code == 200:
                print(f"   ✅ Ingested successfully")
                success_count += 1
                
                # Mark as completed
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/crawl_targets",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal"
                    },
                    params={"id": f"eq.{target_id}"},
                    json={
                        "crawl_status": "completed",
                        "last_crawled_at": datetime.utcnow().isoformat(),
                        "error_message": None
                    },
                    timeout=10
                )
            else:
                print(f"   ❌ API error: {ingest_response.status_code}")
                fail_count += 1
                
                # Mark as failed
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/crawl_targets",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal"
                    },
                    params={"id": f"eq.{target_id}"},
                    json={
                        "crawl_status": "failed",
                        "error_message": f"API error: {ingest_response.status_code}",
                        "last_crawled_at": datetime.utcnow().isoformat()
                    },
                    timeout=10
                )
        
        except Exception as e:
            print(f"   ❌ Exception: {str(e)[:100]}")
            fail_count += 1
            
            # Mark as failed
            try:
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/crawl_targets",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal"
                    },
                    params={"id": f"eq.{target_id}"},
                    json={
                        "crawl_status": "failed",
                        "error_message": str(e)[:200],
                        "last_crawled_at": datetime.utcnow().isoformat()
                    },
                    timeout=10
                )
            except:
                pass
        
        # Delay between requests
        if i < len(targets):
            await asyncio.sleep(DELAY_BETWEEN)
    
    await collector.close()
    
    # Summary
    print(f"\n{'='*60}")
    print(f"CRON SCRAPER SUMMARY")
    print(f"{'='*60}")
    print(f"Total: {len(targets)}")
    print(f"Success: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    asyncio.run(main())
