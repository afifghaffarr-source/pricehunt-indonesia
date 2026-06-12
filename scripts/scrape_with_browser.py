#!/usr/bin/env python3
"""
Marketplace scraper using Hermes browser tools (Browserbase with stealth).

This script orchestrates Hermes browser navigation to scrape product data,
then sends it to the ingestion API.

Usage:
    python3 scrape_with_browser.py --url "https://tokopedia.com/..."
    python3 scrape_with_browser.py --url "https://shopee.co.id/..." --ingest
"""

import os
import sys
import re
import argparse
import logging
from typing import Optional, Dict
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    print("ERROR: requests library not installed. Run: pip install requests")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def detect_marketplace(url: str) -> Optional[str]:
    """Detect marketplace from URL."""
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    
    if 'tokopedia.com' in domain:
        return 'tokopedia'
    elif 'shopee.co.id' in domain:
        return 'shopee'
    elif 'bukalapak.com' in domain:
        return 'bukalapak'
    elif 'lazada.co.id' in domain:
        return 'lazada'
    elif 'blibli.com' in domain:
        return 'blibli'
    else:
        return None


def extract_tokopedia_data(snapshot: str, url: str) -> Optional[Dict]:
    """
    Extract product data from Tokopedia page snapshot.
    
    Returns dict with: title, price, image_url
    """
    logger.info("Extracting Tokopedia data from snapshot...")
    
    # Look for product title (h1 heading)
    title_match = re.search(r'heading\s+"([^"]+)"\s+\[level=1', snapshot)
    if not title_match:
        logger.error("Could not find product title in snapshot")
        return None
    
    title = title_match.group(1)
    logger.info(f"Found title: {title[:50]}...")
    
    # Look for price (StaticText with "Rp" prefix)
    price_matches = re.findall(r'StaticText\s+"Rp([\d.,]+)"', snapshot)
    if not price_matches:
        logger.error("Could not find price in snapshot")
        return None
    
    # Take first price (usually the main price)
    price_text = price_matches[0]
    price_clean = re.sub(r'[^\d]', '', price_text)
    
    try:
        price = int(price_clean)
        logger.info(f"Found price: Rp{price:,}")
    except ValueError:
        logger.error(f"Could not parse price: {price_text}")
        return None
    
    # Look for product image
    image_match = re.search(r'image\s+"([^"]+)"', snapshot)
    image_url = image_match.group(1) if image_match else None
    
    if image_url:
        logger.info(f"Found image: {image_url[:60]}...")
    
    return {
        'title': title,
        'price': price,
        'image_url': image_url
    }


def extract_shopee_data(snapshot: str, url: str) -> Optional[Dict]:
    """Extract product data from Shopee page snapshot."""
    logger.info("Extracting Shopee data from snapshot...")
    
    # Similar logic to Tokopedia but adjusted for Shopee's HTML structure
    title_match = re.search(r'heading\s+"([^"]+)"\s+\[level=1', snapshot)
    if not title_match:
        logger.error("Could not find product title")
        return None
    
    title = title_match.group(1)
    
    price_matches = re.findall(r'StaticText\s+"Rp([\d.,]+)"', snapshot)
    if not price_matches:
        logger.error("Could not find price")
        return None
    
    price_text = price_matches[0]
    price = int(re.sub(r'[^\d]', '', price_text))
    
    image_match = re.search(r'image\s+"([^"]+)"', snapshot)
    image_url = image_match.group(1) if image_match else None
    
    return {
        'title': title,
        'price': price,
        'image_url': image_url
    }


def ingest_offer(offer_data: Dict) -> Dict:
    """Send scraped data to ingestion API."""
    ingestion_secret = os.getenv('INGESTION_SECRET')
    if not ingestion_secret:
        raise ValueError("INGESTION_SECRET environment variable not set")
    
    api_url = "https://www.bijakbeli.app/api/ingestion/offer-snapshot"
    headers = {
        'Authorization': f'Bearer {ingestion_secret}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(api_url, json=offer_data, headers=headers, timeout=30)
        
        if response.status_code == 200:
            return {'success': True, 'data': response.json()}
        else:
            return {'success': False, 'error': f"HTTP {response.status_code}: {response.text}"}
    
    except Exception as e:
        return {'success': False, 'error': str(e)}


def main():
    """
    This script is designed to be called FROM Hermes after browser navigation.
    
    Workflow:
    1. User asks Hermes to scrape a URL
    2. Hermes calls browser_navigate(url)
    3. Hermes gets snapshot
    4. Hermes calls this script with --snapshot-file and --url
    5. Script extracts data from snapshot
    6. Script ingests to API
    """
    parser = argparse.ArgumentParser(description='Extract and ingest marketplace product data')
    parser.add_argument('--url', required=True, help='Product URL')
    parser.add_argument('--snapshot-file', help='Path to browser snapshot file')
    parser.add_argument('--snapshot', help='Browser snapshot text (alternative to file)')
    parser.add_argument('--marketplace', help='Marketplace name (auto-detected if not specified)')
    parser.add_argument('--ingest', action='store_true', help='Send to ingestion API')
    
    args = parser.parse_args()
    
    # Read snapshot
    if args.snapshot_file:
        with open(args.snapshot_file, 'r') as f:
            snapshot = f.read()
    elif args.snapshot:
        snapshot = args.snapshot
    else:
        parser.error("Either --snapshot-file or --snapshot is required")
    
    # Detect marketplace
    marketplace = args.marketplace or detect_marketplace(args.url)
    if not marketplace:
        logger.error(f"Could not detect marketplace from URL: {args.url}")
        sys.exit(1)
    
    logger.info(f"Marketplace: {marketplace}")
    logger.info(f"URL: {args.url}")
    
    # Extract data based on marketplace
    if marketplace == 'tokopedia':
        data = extract_tokopedia_data(snapshot, args.url)
    elif marketplace == 'shopee':
        data = extract_shopee_data(snapshot, args.url)
    else:
        logger.error(f"Extractor not implemented for: {marketplace}")
        sys.exit(1)
    
    if not data:
        logger.error("❌ Data extraction failed")
        sys.exit(1)
    
    # Display extracted data
    logger.info("")
    logger.info("=" * 80)
    logger.info("EXTRACTED DATA")
    logger.info("=" * 80)
    logger.info(f"Title:     {data['title']}")
    logger.info(f"Price:     Rp{data['price']:,}")
    logger.info(f"Image URL: {data['image_url'][:80] if data['image_url'] else 'None'}...")
    logger.info("")
    
    # Ingest if requested
    if args.ingest:
        offer_data = {
            'marketplace': marketplace,
            'product_url': args.url,
            'title': data['title'],
            'price': data['price'],
            'image_url': data['image_url']
        }
        
        logger.info("Sending to ingestion API...")
        result = ingest_offer(offer_data)
        
        if result['success']:
            logger.info(f"✅ Ingestion successful: offer_id={result['data'].get('offer_id', 'unknown')}")
            logger.info(f"   Snapshot ID: {result['data'].get('snapshot_id', 'unknown')}")
            logger.info(f"   Confidence: {result['data'].get('confidence_score', 'unknown')}")
        else:
            logger.error(f"❌ Ingestion failed: {result['error']}")
            sys.exit(1)
    else:
        logger.info("Skipping ingestion (use --ingest to send to API)")
    
    logger.info("✅ Complete")
    sys.exit(0)


if __name__ == '__main__':
    main()
