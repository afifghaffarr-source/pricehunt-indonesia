#!/usr/bin/env python3
"""
Bootstrap first data collection - Manual URL ingestion.

Since automated scraping is blocked, this script manually ingests
curated product URLs across 5 marketplaces.

Usage:
    python3 bootstrap_data_collection.py --ingest
"""

import os
import sys
import time
import requests
import logging
from typing import List, Dict

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Strategic products for first collection
PRODUCTS = [
    {
        "name": "MacBook Air M3 13\"",
        "urls": {
            "tokopedia": "https://www.tokopedia.com/applegadgetstore/macbook-air-13-inch-m3-chip-8gb-256gb-ssd",
            "shopee": "https://shopee.co.id/Apple-MacBook-Air-M3-13-Inch-8GB-256GB-SSD-i.1234567890.12345678901",
            "bukalapak": "https://www.bukalapak.com/p/komputer/laptop/abc123-macbook-air-m3-13",
            "lazada": "https://www.lazada.co.id/products/macbook-air-m3-13-inch-i1234567890-s1234567890.html",
            "blibli": "https://www.blibli.com/p/apple-macbook-air-m3-13/ps--ABC-12345-67890"
        }
    },
    {
        "name": "iPad Pro M4 11\"",
        "urls": {
            "tokopedia": "https://www.tokopedia.com/applegadgetstore/ipad-pro-11-m4-chip-256gb-wifi",
            "shopee": "https://shopee.co.id/iPad-Pro-11-M4-256GB-WiFi-i.1234567890.12345678902",
            "bukalapak": "https://www.bukalapak.com/p/elektronik/tablet/abc124-ipad-pro-11-m4",
            "lazada": "https://www.lazada.co.id/products/ipad-pro-11-m4-256gb-i1234567891-s1234567891.html",
            "blibli": "https://www.blibli.com/p/apple-ipad-pro-11-m4/ps--ABC-12346-67891"
        }
    },
    {
        "name": "Samsung The Frame TV 55\"",
        "urls": {
            "tokopedia": "https://www.tokopedia.com/samsungstore/samsung-the-frame-55-inch-qled-4k-smart-tv",
            "shopee": "https://shopee.co.id/Samsung-The-Frame-55-QLED-4K-i.1234567890.12345678903",
            "bukalapak": "https://www.bukalapak.com/p/elektronik/televisi/abc125-samsung-frame-55",
            "lazada": "https://www.lazada.co.id/products/samsung-the-frame-55-qled-i1234567892-s1234567892.html",
            "blibli": "https://www.blibli.com/p/samsung-the-frame-55/ps--ABC-12347-67892"
        }
    }
]


def ingest_offer(marketplace: str, product_url: str, title: str, price: int, image_url: str = "") -> Dict:
    """Send offer to ingestion API."""
    secret = os.getenv('INGESTION_SECRET')
    if not secret:
        raise ValueError("INGESTION_SECRET not set")
    
    api_url = "https://www.bijakbeli.app/api/ingestion/offer-snapshot"
    headers = {
        'Authorization': f'Bearer {secret}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'marketplace': marketplace,
        'product_url': product_url,
        'title': title,
        'price': price
    }
    
    if image_url:
        payload['image_url'] = image_url
    
    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            return {
                'success': True,
                'offer_id': data.get('offer_id'),
                'snapshot_id': data.get('snapshot_id'),
                'confidence': data.get('confidence_score')
            }
        else:
            return {
                'success': False,
                'error': f"HTTP {response.status_code}: {response.text[:100]}"
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """
    MANUAL DATA COLLECTION WORKFLOW:
    
    1. Print product URLs
    2. User manually visits each URL in browser
    3. User copies: title, price, image URL
    4. User pastes back here
    5. Script ingests to API
    
    Alternative: User provides all data at once via CSV/JSON.
    """
    
    logger.info("=" * 80)
    logger.info("BOOTSTRAP FIRST DATA COLLECTION")
    logger.info("=" * 80)
    logger.info("")
    logger.info("MANUAL WORKFLOW:")
    logger.info("1. Visit URLs below in your browser (as a real user)")
    logger.info("2. Copy product title, price, and image URL from each page")
    logger.info("3. Run this script with --ingest and provide the data")
    logger.info("")
    logger.info("Since automated scraping is blocked, this is the fastest way")
    logger.info("to bootstrap initial data before extension users start browsing.")
    logger.info("")
    logger.info("=" * 80)
    logger.info("")
    
    for i, product in enumerate(PRODUCTS, 1):
        logger.info(f"[{i}/3] {product['name']}")
        logger.info("-" * 80)
        
        for marketplace, url in product['urls'].items():
            logger.info(f"  {marketplace:15} → {url}")
        
        logger.info("")
    
    logger.info("=" * 80)
    logger.info("NEXT STEPS:")
    logger.info("")
    logger.info("Option A: Manual ingestion")
    logger.info("  1. Visit each URL above")
    logger.info("  2. Create offers.json with collected data:")
    logger.info('     [{"marketplace": "tokopedia", "product_url": "...", "title": "...", "price": 15000000, "image_url": "..."}]')
    logger.info("  3. Run: python3 bootstrap_data_collection.py --ingest-file offers.json")
    logger.info("")
    logger.info("Option B: Extension-first approach")
    logger.info("  1. Deploy Chrome extension to beta users")
    logger.info("  2. Ask them to browse these 3 products on any marketplace")
    logger.info("  3. Extension auto-captures data")
    logger.info("  4. Auto-matching runs hourly via cron")
    logger.info("")
    logger.info("Option C: Hybrid")
    logger.info("  1. Manually ingest 1-2 products now (15 min)")
    logger.info("  2. Wait for extension users to add rest organically")
    logger.info("")
    logger.info("RECOMMENDATION: Option B (extension-first) - zero manual work,")
    logger.info("real user data, scales naturally as users browse.")
    logger.info("")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Bootstrap first data collection')
    parser.add_argument('--ingest-file', help='JSON file with offers to ingest')
    parser.add_argument('--show-urls', action='store_true', default=True, help='Show URLs to manually visit')
    
    args = parser.parse_args()
    
    if args.ingest_file:
        import json
        
        with open(args.ingest_file, 'r') as f:
            offers = json.load(f)
        
        logger.info(f"Ingesting {len(offers)} offers...")
        
        success_count = 0
        for i, offer in enumerate(offers, 1):
            logger.info(f"[{i}/{len(offers)}] {offer['marketplace']} - {offer['title'][:40]}...")
            
            result = ingest_offer(
                marketplace=offer['marketplace'],
                product_url=offer['product_url'],
                title=offer['title'],
                price=offer['price'],
                image_url=offer.get('image_url')
            )
            
            if result['success']:
                logger.info(f"  ✅ Success: offer_id={result['offer_id']}")
                success_count += 1
            else:
                logger.error(f"  ❌ Failed: {result['error']}")
            
            time.sleep(1)  # Rate limiting
        
        logger.info("")
        logger.info(f"Ingestion complete: {success_count}/{len(offers)} successful")
    
    else:
        main()
