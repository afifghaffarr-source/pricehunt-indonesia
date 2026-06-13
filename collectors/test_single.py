#!/usr/bin/env python3
"""Test single URL scraping end-to-end"""
import os
import sys
import asyncio
from tokopedia_collector import TokopediaCollector
from ingestion_client import IngestionClient

async def test_single_url():
    url = "https://www.tokopedia.com/samsungofficial/samsung-galaxy-s24-ultra-12-256gb"
    
    print(f"\n{'='*60}")
    print(f"Testing URL: {url}")
    print(f"{'='*60}\n")
    
    # Initialize collector
    collector = TokopediaCollector()
    
    # Scrape
    print("Step 1: Scraping...")
    result = await collector.scrape_product(url)
    
    if not result:
        print("❌ Scraping failed")
        return False
    
    print(f"✅ Scraping successful")
    print(f"\nExtracted data:")
    print(f"  Title: {result.get('title', 'N/A')[:60]}...")
    print(f"  Price: Rp {result.get('price', 'N/A'):,}")
    print(f"  Image: {result.get('image_url', 'N/A')[:60]}...")
    print(f"  Source URL: {result.get('source_url', 'N/A')[:60]}...")
    
    # Ingest
    print(f"\nStep 2: Ingesting to API...")
    api_client = IngestionClient()
    
    try:
        response = api_client.ingest(
            job_name="manual_test",
            offers=[result]
        )
        print(f"✅ API ingestion successful")
        print(f"\nResponse details:")
        print(f"  Success: {response.success}")
        print(f"  Status: {response.status}")
        print(f"  Offers processed: {response.offers_processed}")
        print(f"  Offers failed: {response.offers_failed}")
        print(f"  Duration: {response.duration_ms}ms")
        if response.errors:
            print(f"  Errors: {response.errors}")
        return response.success
    except Exception as e:
        print(f"❌ API ingestion failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_single_url())
    sys.exit(0 if success else 1)
