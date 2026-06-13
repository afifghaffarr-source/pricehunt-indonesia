#!/usr/bin/env python3
"""Test offer-snapshot ingestion endpoint with correct format"""
import sys
import requests
from config import get_config

def test_offer_snapshot():
    print(f"\n{'='*60}")
    print(f"Testing /api/ingestion/offer-snapshot")
    print(f"{'='*60}\n")
    
    cfg = get_config()
    url = f"{cfg.pricehunt_api_url}/api/ingestion/offer-snapshot"
    
    # Correct format matching OfferSnapshotSchema
    offer_data = {
        "marketplace": "tokopedia",
        "product_url": "https://www.tokopedia.com/test-ingestion-api",
        "title": "Samsung Galaxy S24 Ultra 12/256GB",
        "price": 18999000,
        "image_url": "https://images.tokopedia.net/img/cache/500-square/VqbcmM/2024/1/10/test.jpg",
        "rating": 4.8,
        "sold_count": 150,
        "stock_status": "in_stock",
        "seller_name": "Samsung Official Store",
        "is_official_store": True,
        "source": "test_script",
    }
    
    print("Offer data:")
    for key, value in offer_data.items():
        print(f"  {key}: {value}")
    
    print(f"\nSending to: {url}")
    
    headers = {
        "Authorization": f"Bearer {cfg.ingestion_secret}",
        "Content-Type": "application/json",
    }
    
    try:
        response = requests.post(url, json=offer_data, headers=headers, timeout=30)
        
        print(f"\nResponse: HTTP {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n{'='*60}")
            print(f"✅ INGESTION SUCCESSFUL!")
            print(f"{'='*60}\n")
            
            print(f"  Offer ID: {result.get('offer_id')}")
            print(f"  Snapshot ID: {result.get('snapshot_id')}")
            print(f"  Confidence: {result.get('confidence_score')} ({result.get('confidence_label')})")
            print(f"  Validation: {result.get('validation_status')}")
            
            if result.get('warnings'):
                print(f"\n  Warnings:")
                for warning in result['warnings']:
                    print(f"    - {warning}")
            
            return True
        else:
            print(f"\n{'='*60}")
            print(f"❌ INGESTION FAILED")
            print(f"{'='*60}\n")
            print(f"Response: {response.text[:500]}")
            return False
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_offer_snapshot()
    sys.exit(0 if success else 1)
