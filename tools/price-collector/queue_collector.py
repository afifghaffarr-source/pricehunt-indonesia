#!/usr/bin/env python3
"""
Queue-based Collector for BijakBeli.app
Fetches targets from /api/refresh/queue instead of direct DB access
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv()

API_BASE = os.getenv("NEXT_PUBLIC_APP_URL", "https://bijakbeli.app")
INGESTION_SECRET = os.getenv("INGESTION_SECRET")

if not INGESTION_SECRET:
    print("❌ INGESTION_SECRET not found in environment")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {INGESTION_SECRET}",
    "Content-Type": "application/json",
}


def fetch_queue(limit=10, status="pending"):
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


def crawl_target(target):
    """
    Placeholder: Implement actual crawling logic here
    This should use tools/price-collector/base_collector.py
    """
    print(f"🔍 Would crawl: {target['url']}")
    print(f"   Domain: {target.get('domain', 'Unknown')}")
    print(f"   Source: {target.get('source', 'Unknown')}")
    print(f"   Priority: {target['priority_score']}")
    
    # TODO: Implement actual crawling
    # from base_collector import extract_price_data
    # offer_data = extract_price_data(target['url'])
    
    # For now, return mock data
    # Extract marketplace name from domain (e.g., "www.tokopedia.com" -> "tokopedia")
    domain = target.get('domain', '')
    marketplace = domain.replace('www.', '').split('.')[0] if domain else 'unknown'
    
    return {
        "marketplace": marketplace,
        "product_url": target["url"],
        "title": f"Product from {marketplace}",
        "price": 999000,
        "source": "browser_collector",
    }


def submit_offer(offer_data):
    """Submit offer to ingestion API"""
    url = f"{API_BASE}/api/ingestion/offer-snapshot"
    
    try:
        response = requests.post(url, headers=HEADERS, json=offer_data, timeout=30)
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
