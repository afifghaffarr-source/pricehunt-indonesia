#!/usr/bin/env python3
"""Test scraping + ingestion with real URLs from Phase A"""
import asyncio
import json
from tokopedia_collector import TokopediaCollector
from config import get_config
import requests

async def test_real_url(url: str, index: int):
    """Scrape and ingest a real URL"""
    print(f"\n{'='*60}")
    print(f"Test {index}: {url[:80]}...")
    print(f"{'='*60}")
    
    # Step 1: Scrape
    print(f"\n[1/2] Scraping...")
    collector = TokopediaCollector()
    
    try:
        product_data = await collector.scrape_product(url)
        
        if not product_data:
            print(f"   ❌ Scraping failed - no data extracted")
            return False
        
        print(f"   ✅ Scraping successful")
        print(f"   Title: {product_data.get('name', 'N/A')[:60]}...")
        print(f"   Price: Rp {product_data.get('price', 'N/A'):,}")
        
        # Step 2: Transform to API format
        offer_data = {
            "marketplace": "tokopedia",
            "product_url": product_data.get('url', url),
            "title": product_data.get('name', 'Unknown'),
            "price": product_data.get('price', 0),
            "rating": product_data.get('rating'),
            "sold_count": product_data.get('sold'),
            "seller_name": product_data.get('seller'),
            "image_url": product_data.get('image_url'),
            "source": "browser_collector",  # Valid source value
        }
        
        # Remove None values
        offer_data = {k: v for k, v in offer_data.items() if v is not None}
        
        # Step 3: Ingest
        print(f"\n[2/2] Ingesting to API...")
        cfg = get_config()
        api_url = f"{cfg.pricehunt_api_url}/api/ingestion/offer-snapshot"
        
        headers = {
            "Authorization": f"Bearer {cfg.ingestion_secret}",
            "Content-Type": "application/json",
        }
        
        response = requests.post(api_url, json=offer_data, headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Ingestion successful")
            print(f"   Offer ID: {result.get('offer_id')}")
            print(f"   Confidence: {result.get('confidence_score')} ({result.get('confidence_label')})")
            return True
        else:
            print(f"   ❌ Ingestion failed: HTTP {response.status_code}")
            print(f"   {response.text[:200]}")
            return False
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("="*60)
    print("TESTING REAL URLs END-TO-END")
    print("="*60)
    
    # Load filtered URLs
    with open('/tmp/real_product_urls_filtered.json', 'r') as f:
        urls_data = json.load(f)
    
    urls = [item['url'] for item in urls_data[:3]]  # Test first 3
    
    results = []
    for i, url in enumerate(urls, 1):
        success = await test_real_url(url, i)
        results.append({"url": url, "success": success})
        
        # Delay between tests
        if i < len(urls):
            print(f"\nWaiting 5 seconds...")
            await asyncio.sleep(5)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total: {len(results)}")
    print(f"Success: {sum(1 for r in results if r['success'])}")
    print(f"Failed: {sum(1 for r in results if not r['success'])}")
    
    if all(r['success'] for r in results):
        print(f"\n✅ ALL TESTS PASSED - SCRAPER SYSTEM WORKS!")
        return True
    else:
        print(f"\n⚠️  SOME TESTS FAILED")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
