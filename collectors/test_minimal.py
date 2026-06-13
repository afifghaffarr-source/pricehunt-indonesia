#!/usr/bin/env python3
"""Test with absolute minimum required fields"""
import sys
import requests
from config import get_config

def test_minimal():
    print(f"\n{'='*60}")
    print(f"Testing MINIMAL offer-snapshot (required fields only)")
    print(f"{'='*60}\n")
    
    cfg = get_config()
    url = f"{cfg.pricehunt_api_url}/api/ingestion/offer-snapshot"
    
    # ABSOLUTE MINIMUM per schema
    minimal_data = {
        "marketplace": "tokopedia",
        "product_url": "https://www.tokopedia.com/test-minimal-" + str(int(time.time())),
        "title": "Test Product Minimal",
        "price": 100000,
    }
    
    print("Minimal data (required only):")
    for key, value in minimal_data.items():
        print(f"  {key}: {value}")
    
    print(f"\nSending to: {url}")
    
    headers = {
        "Authorization": f"Bearer {cfg.ingestion_secret}",
        "Content-Type": "application/json",
    }
    
    try:
        response = requests.post(url, json=minimal_data, headers=headers, timeout=30)
        
        print(f"\nResponse: HTTP {response.status_code}")
        print(f"Body: {response.text}")
        
        if response.status_code == 200:
            print(f"\n✅ SUCCESS - minimal data works!")
            return True
        else:
            print(f"\n❌ FAILED - even minimal data fails")
            return False
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import time
    success = test_minimal()
    sys.exit(0 if success else 1)
