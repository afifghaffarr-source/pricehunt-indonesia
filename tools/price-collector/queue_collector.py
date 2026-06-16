#!/usr/bin/env python3
"""
Queue-based Collector for BijakBeli.app
Processes crawl_targets from /api/refresh/queue with real scraping
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

# Add parent dir to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from marketplaces import TokopediaCollector, ShopeeCollector
from api_client import IngestionClient

# Load environment
load_dotenv()

API_BASE = os.getenv("NEXT_PUBLIC_APP_URL", "https://www.bijakbeli.web.id")
INGESTION_SECRET = os.getenv("INGESTION_SECRET")

if not INGESTION_SECRET:
    print("❌ INGESTION_SECRET not found in environment")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {INGESTION_SECRET}",
    "Content-Type": "application/json",
}


def fetch_queue(limit=10, status="queued"):
    """Fetch targets from refresh queue"""
    url = f"{API_BASE}/api/refresh/queue"
    params = {"limit": limit, "status": status}
    
    try:
        response = requests.get(url, headers=HEADERS, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            print(f"❌ Queue fetch failed: {data.get('error')}")
            return []
        
        targets = data["data"]["targets"]
        print(f"✅ Fetched {len(targets)} targets from queue")
        return targets
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Queue fetch error: {e}")
        return []


def get_collector(domain: str):
    """Get appropriate collector for domain"""
    if "tokopedia" in domain:
        return TokopediaCollector()
    elif "shopee" in domain:
        return ShopeeCollector()
    else:
        print(f"⚠️  No specific collector for {domain}, using generic parser")
        return None


def crawl_target(target):
    """
    Crawl a target URL using appropriate marketplace collector
    """
    url = target["url"]
    domain = target.get("domain", "")
    
    print(f"🔍 Crawling: {url}")
    print(f"   Domain: {domain}")
    print(f"   Priority: {target['priority_score']}")
    
    collector = get_collector(domain)
    
    if not collector:
        print(f"⚠️  Skipping {domain} (no collector available)")
        return None
    
    try:
        # Launch browser (visible for transparency, avoids some anti-bot)
        collector.launch_browser(headless=False)
        
        # Add delay to appear more human-like
        time.sleep(2)
        
        # Extract product data
        raw_data = collector.extract_product_data(url)
        
        # Normalize data
        normalized = collector.normalize_extracted_data(raw_data)
        
        # Close browser
        collector.close_browser()
        
        # Add metadata
        normalized["source"] = "browser_collector"
        normalized["crawl_target_id"] = target["id"]
        
        return normalized
    
    except Exception as e:
        print(f"❌ Crawl error: {e}")
        if collector and collector.browser:
            collector.close_browser()
        return None


def submit_offer(offer_data):
    """Submit offer to ingestion API"""
    url = f"{API_BASE}/api/ingestion/offer-snapshot"
    
    # Debug: print data being sent
    print(f"\n🐛 DEBUG: Sending to API:")
    print(f"   URL: {url}")
    print(f"   Data keys: {list(offer_data.keys())}")
    print(f"   Sample data: {json.dumps(offer_data, indent=2, default=str)[:500]}...")
    
    try:
        response = requests.post(url, headers=HEADERS, json=offer_data, timeout=30)
        
        # Debug: print response
        print(f"   Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"   Response body: {response.text[:500]}")
        
        response.raise_for_status()
        result = response.json()
        
        if result.get("success"):
            print(f"✅ Ingested: {result.get('offer_id')} (confidence: {result.get('confidence_score')})")
            return True
        else:
            print(f"❌ Ingestion failed: {result.get('error')}")
            return False
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Ingestion error: {e}")
        return False


def main():
    """Main collector loop"""
    print("🚀 Queue-based Collector Started")
    print(f"📍 API: {API_BASE}")
    print(f"🔑 Auth: {'✅ Configured' if INGESTION_SECRET else '❌ Missing'}")
    print("-" * 60)
    
    # Fetch targets from queue
    targets = fetch_queue(limit=10, status="pending")
    
    if not targets:
        print("ℹ️  No targets in queue")
        return
    
    # Process each target
    success_count = 0
    fail_count = 0
    
    for i, target in enumerate(targets, 1):
        print(f"\n[{i}/{len(targets)}] Processing target {target['id'][:8]}...")
        
        try:
            # Crawl the target
            offer_data = crawl_target(target)
            
            if not offer_data:
                print("⚠️  Crawl returned no data")
                fail_count += 1
                continue
            
            # Submit to ingestion API
            if submit_offer(offer_data):
                success_count += 1
            else:
                fail_count += 1
            
            # Rate limiting (be respectful)
            if i < len(targets):
                time.sleep(3)
        
        except Exception as e:
            print(f"❌ Error processing target: {e}")
            fail_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print(f"✅ Success: {success_count}")
    print(f"❌ Failed: {fail_count}")
    print(f"📊 Total: {len(targets)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
