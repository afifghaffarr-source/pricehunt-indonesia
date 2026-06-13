#!/usr/bin/env python3
"""Debug what data is being sent to API"""
import asyncio
import json
from tokopedia_collector import TokopediaCollector

async def debug_scrape():
    url = "https://www.tokopedia.com/supcaseofficial/case-iphone-15-pro-max-youngkit-rock-frosted-foldable-magnetic-ring-black-iphone-15-pro-892c2"
    
    print(f"Scraping: {url}\n")
    
    collector = TokopediaCollector()
    product_data = await collector.scrape_product(url)
    
    if not product_data:
        print("❌ No data")
        return
    
    print("Raw scraped data:")
    print(json.dumps(product_data, indent=2, default=str))
    
    # Transform to API format
    offer_data = {
        "marketplace": "tokopedia",
        "product_url": product_data.get('url', url),
        "title": product_data.get('name', 'Unknown'),
        "price": product_data.get('price', 0),
        "rating": product_data.get('rating'),
        "sold_count": product_data.get('sold'),
        "seller_name": product_data.get('seller'),
        "image_url": product_data.get('image_url'),
        "source": "test_script",
    }
    
    # Remove None values
    offer_data = {k: v for k, v in offer_data.items() if v is not None}
    
    print("\n\nTransformed API data:")
    print(json.dumps(offer_data, indent=2, default=str))
    
    print("\n\nField validation:")
    for key, value in offer_data.items():
        print(f"  {key}: {type(value).__name__} = {repr(value)[:80]}")

if __name__ == "__main__":
    asyncio.run(debug_scrape())
