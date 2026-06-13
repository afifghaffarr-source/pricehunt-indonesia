#!/usr/bin/env python3
"""
Image Populator via DuckDuckGo - No API key needed
Finds and assigns product images from DuckDuckGo image search
"""
import json
import os
import sys
import time
import re
from pathlib import Path

try:
    from duckduckgo_search import DDGS
except ImportError:
    print("Installing duckduckgo-search...")
    os.system("pip install duckduckgo-search -q")
    from duckduckgo_search import DDGS

import requests
from dotenv import load_dotenv

# Load environment
env_path = Path.home() / 'projects/bijakbeli-app/.env.local'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not all([SUPABASE_URL, SERVICE_KEY]):
    print("❌ Missing Supabase credentials!")
    sys.exit(1)

def get_products_without_images():
    """Fetch products that need images"""
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/products',
        headers=headers,
        params={
            'select': 'id,name,slug',
            'image_url': 'is.null',
            'order': 'name'
        }
    )
    resp.raise_for_status()
    return resp.json()

def search_image(query: str) -> str | None:
    """Search for product image via DuckDuckGo"""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.images(query, max_results=3))
            if results:
                # Prefer larger images
                for r in results:
                    url = r.get('image', '')
                    if url and ('http' in url) and not any(x in url.lower() for x in ['logo', 'icon', 'avatar']):
                        return url
                # Fallback to first result
                return results[0].get('image')
    except Exception as e:
        print(f"   ⚠️ Search error: {e}")
    return None

def update_product_image(product_id: str, image_url: str) -> bool:
    """Update product image_url in Supabase"""
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    resp = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products',
        headers=headers,
        params={'id': f'eq.{product_id}'},
        json={'image_url': image_url}
    )
    
    return resp.status_code == 204

def main():
    print("\n" + "="*60)
    print("🖼️  IMAGE POPULATOR (DuckDuckGo)")
    print("="*60 + "\n")
    
    # Get products without images
    products = get_products_without_images()
    print(f"📦 Found {len(products)} products without images\n")
    
    if not products:
        print("✅ All products have images!")
        return
    
    success = 0
    failed = 0
    skipped = 0
    
    for i, product in enumerate(products, 1):
        name = product['name']
        product_id = product['id']
        
        # Create search query - product name + "product image"
        search_query = f"{name} product image"
        
        print(f"[{i}/{len(products)}] 🔍 {name[:50]}")
        
        # Search for image
        image_url = search_image(search_query)
        
        if not image_url:
            # Try simpler query
            image_url = search_image(name)
        
        if image_url:
            # Update database
            if update_product_image(product_id, image_url):
                print(f"   ✅ Found & saved: {image_url[:70]}...")
                success += 1
            else:
                print(f"   ❌ Found but DB update failed")
                failed += 1
        else:
            print(f"   ❌ No image found")
            failed += 1
        
        # Rate limit - DuckDuckGo blocks fast requests
        time.sleep(2)
    
    print(f"\n{'='*60}")
    print(f"📊 HASIL:")
    print(f"   ✅ Berhasil: {success}")
    print(f"   ❌ Gagal: {failed}")
    print(f"   📦 Total: {len(products)}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
