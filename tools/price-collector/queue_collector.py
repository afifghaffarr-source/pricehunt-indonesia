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

# Fix: "Playwright Sync API inside asyncio loop" error.
# The `requests` library (with HTTP/2) or `rich` console can create a
# running asyncio event loop in some environments. `sync_playwright()`
# refuses to start when one is already running. `nest_asyncio.apply()`
# patches asyncio to allow nested loops, which is the standard fix.
# See https://github.com/microsoft/playwright-python/issues/1786
import nest_asyncio
nest_asyncio.apply()

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
    Crawl a target URL using appropriate marketplace collector.
    Two-tier fallback: Playwright (primary) → Camofox (stealth fallback).
    """
    url = target["url"]
    domain = target.get("domain", "")
    
    print(f"🔍 Crawling: {url}")
    print(f"   Domain: {domain}")
    print(f"   Priority: {target['priority_score']}")
    
    # Tier 1: Playwright-based collector (primary)
    collector = get_collector(domain)
    scrape_path = None
    
    if collector:
        try:
            collector.launch_browser(headless=True)
            time.sleep(2)
            raw_data = collector.extract_product_data(url)
            normalized = collector.normalize_extracted_data(raw_data)
            collector.close_browser()
            
            if normalized and normalized.get("title"):
                normalized["source"] = "browser_collector"
                normalized["crawl_target_id"] = target["id"]
                normalized["scrape_path"] = "playwright"
                print(f"  ✅ Success via playwright")
                return normalized
            else:
                print(f"  ⚠️  Playwright returned empty data, trying camofox fallback...")
        except Exception as e:
            print(f"  ⚠️  Playwright error: {e}")
            if collector and collector.browser:
                collector.close_browser()
    
    # Tier 2: Camofox stealth fallback (bypasses Tokopedia anti-bot)
    if os.getenv("CAMOFOX_DISABLED", "0") != "1":
        try:
            normalized = crawl_with_camofox(url, domain, target)
            if normalized:
                print(f"  ✅ Success via camofox")
                return normalized
            else:
                print(f"  ❌ Camofox returned no data")
        except Exception as e:
            print(f"  ❌ Camofox error: {e}")
    else:
        print(f"  ⏭️  Camofox disabled (CAMOFOX_DISABLED=1)")
    
    return None


def crawl_with_camofox(url, domain, target):
    """Use Camofox REST API to scrape a product page.
    Stealth Firefox bypasses Tokopedia anti-bot that blocks Playwright."""
    import urllib.request
    
    CAMOFOX_HOST = os.getenv("CAMOFOX_HOST", "http://localhost:9377")
    
    # Open tab on a real URL (about:blank is rejected by camofox)
    tab_data = json.dumps({
        "userId": "queue_collector",
        "sessionKey": domain.split(".")[0] if domain else "default",
        "url": url
    }).encode()
    
    req = urllib.request.Request(
        f"{CAMOFOX_HOST}/tabs",
        data=tab_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    resp = json.loads(urllib.request.urlopen(req, timeout=15).read())
    tab_id = resp["tabId"]
    
    # Wait for SPA hydration
    time.sleep(5)
    
    # Extract product data via eval (camofox doesn't support structured schemas)
    title_js = "document.querySelector('h1')?.innerText || document.title || ''"
    price_js = """
    (function() {
        const text = document.body.innerText;
        const m = text.match(/Rp\\s?([\\d.]+)/);
        return m ? m[1].replace(/\\./g, '') : null;
    })()
    """
    
    def camofox_eval(js):
        eval_data = json.dumps({"expression": js, "userId": "queue_collector"}).encode()
        eval_req = urllib.request.Request(
            f"{CAMOFOX_HOST}/tabs/{tab_id}/evaluate",
            data=eval_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        eval_resp = json.loads(urllib.request.urlopen(eval_req, timeout=15).read())
        return eval_resp.get("result")
    
    title = camofox_eval(title_js)
    price_raw = camofox_eval(price_js)
    price = int(price_raw) if price_raw else None
    
    # Close tab
    try:
        close_req = urllib.request.Request(
            f"{CAMOFOX_HOST}/tabs/{tab_id}?userId=queue_collector",
            method="DELETE"
        )
        urllib.request.urlopen(close_req, timeout=5)
    except:
        pass
    
    if not title:
        return None
    
    return {
        "title": title,
        "price": price,
        "url": url,
        "source": "camofox_collector",
        "crawl_target_id": target["id"],
        "scrape_path": "camofox",
        "domain": domain,
    }


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
    targets = fetch_queue(limit=10, status="queued")
    
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
