#!/usr/bin/env python3
"""Debug ingestion client request details"""
import sys
from config import get_config, get_ingestion_url

def debug_config():
    print(f"\n{'='*60}")
    print(f"Ingestion Client Configuration")
    print(f"{'='*60}\n")
    
    try:
        cfg = get_config()
        
        print(f"Config loaded successfully:")
        print(f"  API URL: {cfg.pricehunt_api_url}")
        print(f"  Ingestion URL: {get_ingestion_url()}")
        print(f"  Collector name: {cfg.collector_name}")
        print(f"  Ingestion secret: {cfg.ingestion_secret[:10]}...{cfg.ingestion_secret[-10:]}")
        print(f"  Retry count: {cfg.retry_count}")
        
        # Test the URL is reachable
        print(f"\nTesting URL reachability...")
        import requests
        
        # First test base URL
        try:
            response = requests.get(cfg.pricehunt_api_url, timeout=5)
            print(f"  Base URL ({cfg.pricehunt_api_url}): HTTP {response.status_code}")
        except Exception as e:
            print(f"  Base URL ({cfg.pricehunt_api_url}): ❌ {e}")
        
        # Test ingestion endpoint (should be 401 without auth)
        try:
            response = requests.post(get_ingestion_url(), json={}, timeout=5)
            print(f"  Ingestion URL ({get_ingestion_url()}): HTTP {response.status_code}")
            if response.status_code == 401:
                print(f"    ✅ Endpoint exists (401 = auth required)")
            elif response.status_code == 404:
                print(f"    ❌ Endpoint not found (404)")
                print(f"    Response preview: {response.text[:200]}")
        except Exception as e:
            print(f"  Ingestion URL ({get_ingestion_url()}): ❌ {e}")
        
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_config()
