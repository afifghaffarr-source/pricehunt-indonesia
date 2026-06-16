#!/usr/bin/env python3
"""
Generate test offers for BijakBeli.app using the ingestion API.
Creates realistic offers for existing products across multiple marketplaces.
"""

import requests
import random
import time
import os
import sys
from typing import List, Dict

# API Configuration
API_URL = "https://www.bijakbeli.web.id/api/ingestion/offer-snapshot"
INGESTION_SECRET = os.getenv("INGESTION_SECRET")

if not INGESTION_SECRET:
    print("Error: INGESTION_SECRET environment variable not set")
    print("Load from .env.local: source /home/ubuntu/projects/bijakbeli-app/.env.local")
    sys.exit(1)

# Marketplaces
MARKETPLACES = ["tokopedia", "shopee", "bukalapak", "lazada", "blibli"]

# Products (from database)
PRODUCTS = [
    {"name": "Apple AirPods Pro 2nd Gen USB-C", "slug": "airpods-pro-2-usbc", "base_price": 3999000},
    {"name": "Apple iPhone 15 Pro Max 256GB", "slug": "apple-iphone-15-pro-max", "base_price": 19999000},
    {"name": "ASUS ROG Zephyrus G14 GA402", "slug": "asus-rog-zephyrus-g14", "base_price": 25999000},
    {"name": "Dyson V15 Detect Absolute", "slug": "dyson-v15-detect", "base_price": 12999000},
    {"name": "iPhone 15 Pro Max 256GB", "slug": "iphone-15-pro-max-256gb", "base_price": 19999000},
    {"name": "LG Kulkas Side by Side 613L", "slug": "lg-kulkas-side-by-side-613l", "base_price": 18999000},
    {"name": "Logitech MX Master 3S Mouse", "slug": "logitech-mx-master-3s", "base_price": 1499000},
    {"name": "MacBook Pro 16 M3 Max", "slug": "macbook-pro-16-m3-max", "base_price": 54999000},
    {"name": "Nike Air Max 270 Black White", "slug": "nike-air-max-270", "base_price": 2199000},
    {"name": "Nintendo Switch OLED Model", "slug": "nintendo-switch-oled", "base_price": 4799000},
    {"name": "Samsung AC Split 1 PK Inverter", "slug": "samsung-ac-1pk-inverter", "base_price": 4299000},
    {"name": "Samsung Galaxy S24 Ultra 256GB", "slug": "samsung-galaxy-s24-ultra", "base_price": 16999000},
    {"name": "Samsung Galaxy S24 Ultra 512GB", "slug": "samsung-galaxy-s24-ultra-512gb", "base_price": 18499000},
    {"name": "Sony WH-1000XM5 Headphone", "slug": "sony-wh1000xm5", "base_price": 4999000},
    {"name": "Xiaomi 14 Pro 256GB", "slug": "xiaomi-14-pro-256gb", "base_price": 10999000},
    {"name": "Xiaomi Smart Band 8", "slug": "xiaomi-smart-band-8", "base_price": 499000},
]

def generate_realistic_price(base_price: int, marketplace: str) -> int:
    """
    Generate realistic price variation based on marketplace.
    Tokopedia/Shopee tend to be competitive, Bukalapak slightly higher.
    """
    variance = {
        "tokopedia": random.uniform(0.95, 1.05),
        "shopee": random.uniform(0.93, 1.07),
        "bukalapak": random.uniform(1.00, 1.10),
        "lazada": random.uniform(0.97, 1.08),
        "blibli": random.uniform(0.98, 1.09),
    }
    multiplier = variance.get(marketplace, 1.0)
    varied_price = int(base_price * multiplier)
    
    # Round to nearest thousand for realism
    return round(varied_price / 1000) * 1000

def generate_product_url(marketplace: str, slug: str) -> str:
    """Generate realistic marketplace URL for product."""
    urls = {
        "tokopedia": f"https://www.tokopedia.com/official-store/{slug}",
        "shopee": f"https://shopee.co.id/official-shop/{slug}",
        "bukalapak": f"https://www.bukalapak.com/products/{slug}",
        "lazada": f"https://www.lazada.co.id/{slug}",
        "blibli": f"https://www.blibli.com/p/{slug}",
    }
    return urls.get(marketplace, f"https://{marketplace}.com/{slug}")

def generate_image_url(product_name: str) -> str:
    """Generate placeholder image URL."""
    # Use a placeholder image service
    encoded_name = product_name.replace(" ", "+")
    return f"https://via.placeholder.com/400x400.png?text={encoded_name}"

def create_offer(product: Dict, marketplace: str) -> Dict:
    """Create offer payload for ingestion API."""
    price = generate_realistic_price(product["base_price"], marketplace)
    url = generate_product_url(marketplace, product["slug"])
    image_url = generate_image_url(product["name"])
    
    return {
        "marketplace": marketplace,
        "product_url": url,
        "title": f"{product['name']} - Official Store",
        "price": price,
        "image_url": image_url,
    }

def ingest_offer(offer: Dict) -> Dict:
    """Send offer to ingestion API."""
    headers = {
        "Authorization": f"Bearer {INGESTION_SECRET}",
        "Content-Type": "application/json",
    }
    
    try:
        response = requests.post(API_URL, json=offer, headers=headers, timeout=10)
        response.raise_for_status()
        return {"success": True, "data": response.json(), "offer": offer}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e), "offer": offer}

def main():
    """Generate and ingest test offers."""
    print("=" * 80)
    print("BijakBeli.app - Generate Test Offers")
    print("=" * 80)
    print()
    
    # Generate offers: ALL marketplaces per product for maximum coverage
    offers_to_create = []
    for product in PRODUCTS:
        # Use all 5 marketplaces for each product
        selected_marketplaces = MARKETPLACES
        for marketplace in selected_marketplaces:
            offer = create_offer(product, marketplace)
            offers_to_create.append(offer)
    
    print(f"Generating {len(offers_to_create)} offers for {len(PRODUCTS)} products...")
    print()
    
    # Ingest offers
    results = []
    for i, offer in enumerate(offers_to_create, 1):
        print(f"[{i}/{len(offers_to_create)}] Ingesting: {offer['marketplace']} - {offer['title'][:50]}...")
        result = ingest_offer(offer)
        results.append(result)
        
        if result["success"]:
            print(f"    ✅ Success: offer_id={result['data'].get('offer_id', 'unknown')}")
        else:
            print(f"    ❌ Failed: {result['error']}")
        
        # Rate limiting: 0.5s between requests
        time.sleep(0.5)
    
    # Summary
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    successful = sum(1 for r in results if r["success"])
    failed = sum(1 for r in results if not r["success"])
    
    print(f"Total offers attempted: {len(results)}")
    print(f"Successful:             {successful} ({successful/len(results)*100:.1f}%)")
    print(f"Failed:                 {failed} ({failed/len(results)*100:.1f}%)")
    print()
    
    if failed > 0:
        print("Failed offers:")
        for result in results:
            if not result["success"]:
                print(f"  - {result['offer']['marketplace']}: {result['offer']['title'][:50]}")
                print(f"    Error: {result['error']}")
    
    print()
    print("=" * 80)
    print("Next steps:")
    print("1. Run matching algorithm: python3 scripts/match_offers_to_products.py")
    print("2. Apply SQL updates to link offers to products")
    print("3. Verify trust metadata on product pages")
    print("=" * 80)

if __name__ == "__main__":
    main()
