#!/usr/bin/env python3
"""Test ingestion API with mock data"""
import sys
from ingestion_client import IngestionClient

def test_ingestion():
    print(f"\n{'='*60}")
    print(f"Testing Ingestion API with mock data")
    print(f"{'='*60}\n")
    
    # Mock valid offer data
    mock_offer = {
        "product_name": "Samsung Galaxy S24 Ultra 12/256GB",
        "source_url": "https://www.tokopedia.com/test-ingestion-api",
        "marketplace": "tokopedia",
        "price": 18999000,
        "currency": "IDR",
        "image_url": "https://images.tokopedia.net/img/cache/500-square/VqbcmM/2024/1/10/test.jpg",
        "rating": 4.8,
        "sold_count": 150,
        "stock_status": "available",
    }
    
    print("Mock offer data:")
    for key, value in mock_offer.items():
        print(f"  {key}: {value}")
    
    print(f"\nSending to ingestion API...")
    
    try:
        client = IngestionClient()
        result = client.ingest(
            job_name="test_mock_ingestion",
            offers=[mock_offer]
        )
        
        print(f"\n{'='*60}")
        print(f"✅ INGESTION API WORKS!")
        print(f"{'='*60}\n")
        
        print(f"Result details:")
        print(f"  Success: {result.success}")
        print(f"  Status: {result.status}")
        print(f"  Offers processed: {result.offers_processed}")
        print(f"  Offers failed: {result.offers_failed}")
        print(f"  Duration: {result.duration_ms}ms")
        
        if result.errors:
            print(f"\nErrors:")
            for error in result.errors:
                print(f"  - {error}")
        
        return result.success
        
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"❌ INGESTION API FAILED")
        print(f"{'='*60}\n")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_ingestion()
    sys.exit(0 if success else 1)
