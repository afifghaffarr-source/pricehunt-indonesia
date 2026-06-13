#!/usr/bin/env python3
"""
Simple production scraper using HTTP requests only
"""
import asyncio
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

# Set DISPLAY for headless browser via XVFB
os.environ['DISPLAY'] = ':99'

from tokopedia_collector import TokopediaCollector
from config import get_config
import requests

# Load root .env.local
import dotenv
dotenv.load_dotenv(Path(__file__).parent.parent / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

async def run_scraper(limit=10):
    """Run scraper on queued crawl targets"""
    print("="*60)
    print("PRODUCTION SCRAPER (Simplified)")
    print("="*60)
    
    cfg = get_config()
    
    # Fetch queued targets via REST API
    print(f"\nFetching up to {limit} queued targets...")
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/crawl_targets",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        },
        params={
            "crawl_status": "eq.queued",
            "source": "eq.url_hunter",
            "order": "priority_score.desc",
            "limit": limit,
        },
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch targets: {response.status_code}")
        print(response.text[:500])
        return
    
    targets = response.json()
    
    if not targets:
        print("❌ No queued targets found")
        return
    
    print(f"✅ Found {len(targets)} targets to scrape\n")
    
    # Initialize collector
    collector = TokopediaCollector()
    
    success_count = 0
    fail_count = 0
    
    for i, target in enumerate(targets, 1):
        target_id = target['id']
        url = target['url']
        
        print(f"{'='*60}")
        print(f"Target {i}/{len(targets)}: {target_id[:8]}...")
        print(f"{'='*60}")
        print(f"URL: {url[:80]}...")
        
        # Update status to processing
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/crawl_targets",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            params={"id": f"eq.{target_id}"},
            json={"crawl_status": "processing"},
            timeout=10
        )
        
        try:
            # Scrape
            print(f"\n[1/3] Scraping...")
            result = await collector.scrape_product(url)
            
            if not result or not result.get('name'):
                print(f"   ❌ Scraping failed - no data")
                fail_count += 1
                
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
                        "error_message": "No data extracted"
                    },
                    timeout=10
                )
                continue
            
            print(f"   ✅ Scraped: {result['name'][:60]}...")
            print(f"   Price: Rp {result.get('price', 0):,.0f}")
            
            # Extract marketplace_product_id from URL (last segment)
            url_parts = url.rstrip('/').split('-')
            marketplace_product_id = url_parts[-1] if url_parts else None
            
            # Transform to API format
            print(f"\n[2/3] Preparing data...")
            
            # Build offer data - only include image_url if valid
            offer_data = {
                "marketplace": "tokopedia",
                "product_url": result.get('url', url),
                "title": result.get('name', ''),  # Map 'name' to 'title'
                "price": result.get('price'),
                "original_price": result.get('original_price', result.get('price')),  # Default to price
                "discount_percentage": result.get('discount_percentage', 0),
                "rating": result.get('rating', 0.0),
                "sold_count": result.get('sold_count', 0),
                "marketplace_product_id": marketplace_product_id or 'unknown',
                "source": "browser_collector",
            }
            
            # Add image_url only if valid
            image_url = result.get('image_url')
            if image_url and image_url.startswith('http'):
                offer_data['image_url'] = image_url
            
            # Ingest to API
            print(f"\n[3/3] Ingesting to database...")
            api_url = f"{cfg.pricehunt_api_url}/api/ingestion/offer-snapshot"
            headers = {
                "Authorization": f"Bearer {cfg.ingestion_secret}",
                "Content-Type": "application/json",
            }
            
            api_response = requests.post(api_url, json=offer_data, headers=headers, timeout=30)
            
            if api_response.status_code == 200:
                data = api_response.json()
                offer_id = data.get('data', {}).get('offer_id', 'unknown')
                confidence = data.get('data', {}).get('confidence_score', 0)
                
                print(f"   ✅ Ingested successfully")
                print(f"   Offer ID: {offer_id}")
                print(f"   Confidence: {confidence}%")
                
                success_count += 1
                
                # Update crawl_target status
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
                        "crawl_status": "success",
                        "last_status_code": 200,
                        "error_count": 0,
                        "error_message": None
                    },
                    timeout=10
                )
                
            else:
                print(f"   ❌ API error: {api_response.status_code}")
                print(f"   {api_response.text[:200]}")
                fail_count += 1
                
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
                        "last_status_code": api_response.status_code,
                        "error_message": api_response.text[:500]
                    },
                    timeout=10
                )
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            fail_count += 1
            
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
                    "error_message": str(e)[:500]
                },
                timeout=10
            )
        
        # Rate limiting
        if i < len(targets):
            print(f"\nWaiting 5 seconds...")
            await asyncio.sleep(5)
    
    print(f"\n{'='*60}")
    print(f"SCRAPER SUMMARY")
    print(f"{'='*60}")
    print(f"Total: {len(targets)}")
    print(f"Success: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"\n✅ Scraper complete!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=10, help='Max targets to process')
    args = parser.parse_args()
    
    asyncio.run(run_scraper(limit=args.limit))
