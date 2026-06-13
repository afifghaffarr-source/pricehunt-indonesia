#!/usr/bin/env python3
"""
Production scraper: Process crawl_targets queue
Scrapes 100 real URLs and ingests to database
"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from tokopedia_collector import TokopediaCollector
from config import get_config
import requests
from supabase import create_client

async def run_scraper(limit=10):
    """Run scraper on queued crawl targets"""
    print("="*60)
    print("PRODUCTION SCRAPER")
    print("="*60)
    
    cfg = get_config()
    
    # Initialize Supabase
    supabase = create_client(cfg.supabase_url, cfg.supabase_key)
    
    # Fetch queued targets
    print(f"\nFetching up to {limit} queued targets...")
    response = supabase.table('crawl_targets')\
        .select('*')\
        .eq('crawl_status', 'queued')\
        .eq('source', 'url_hunter')\
        .order('priority_score', desc=True)\
        .limit(limit)\
        .execute()
    
    targets = response.data
    
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
        supabase.table('crawl_targets').update({
            'crawl_status': 'processing'
        }).eq('id', target_id).execute()
        
        try:
            # Scrape
            print(f"\n[1/3] Scraping...")
            result = await collector.scrape(url)
            
            if not result or not result.get('title'):
                print(f"   ❌ Scraping failed - no data")
                fail_count += 1
                supabase.table('crawl_targets').update({
                    'crawl_status': 'failed',
                    'error_count': target.get('error_count', 0) + 1,
                    'error_message': 'No data extracted'
                }).eq('id', target_id).execute()
                continue
            
            print(f"   ✅ Scraped: {result['title'][:60]}...")
            print(f"   Price: Rp {result.get('price', 0):,.0f}")
            
            # Transform to API format
            print(f"\n[2/3] Preparing data...")
            offer_data = {
                "marketplace": "tokopedia",
                "product_url": result.get('url', url),
                "title": result.get('title', ''),
                "price": result.get('price'),
                "original_price": result.get('original_price'),
                "discount_percentage": result.get('discount_percentage'),
                "rating": result.get('rating'),
                "sold_count": result.get('sold_count'),
                "image_url": result.get('image_url'),
                "marketplace_product_id": result.get('marketplace_product_id'),
                "source": "browser_collector",
            }
            
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
                supabase.table('crawl_targets').update({
                    'crawl_status': 'success',
                    'last_crawled_at': 'now()',
                    'last_status_code': 200,
                    'error_count': 0,
                    'error_message': None
                }).eq('id', target_id).execute()
                
            else:
                print(f"   ❌ API error: {api_response.status_code}")
                print(f"   {api_response.text[:200]}")
                fail_count += 1
                
                supabase.table('crawl_targets').update({
                    'crawl_status': 'failed',
                    'last_status_code': api_response.status_code,
                    'error_count': target.get('error_count', 0) + 1,
                    'error_message': api_response.text[:500]
                }).eq('id', target_id).execute()
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            fail_count += 1
            
            supabase.table('crawl_targets').update({
                'crawl_status': 'failed',
                'error_count': target.get('error_count', 0) + 1,
                'error_message': str(e)[:500]
            }).eq('id', target_id).execute()
        
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
