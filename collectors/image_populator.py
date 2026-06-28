#!/usr/bin/env python3
"""
Image Populator: Find and assign product images using VexoAPI Google Image Search
"""
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from supabase import create_client
from dotenv import load_dotenv
import requests
import time

# Load environment
load_dotenv(Path(__file__).parent.parent / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
VEXO_API_KEY = os.getenv('VEXO_API_KEY')
API_BASE_URL = 'https://www.bijakbeli.web.id'

if not all([SUPABASE_URL, SUPABASE_KEY, VEXO_API_KEY]):
    print("❌ Missing credentials!")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def search_product_images(product_name: str, limit: int = 5) -> list:
    """Search for product images via VexoAPI"""
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/vexo/search/image/google",
            params={
                "query": product_name,
                "limit": limit
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') and data.get('data'):
                return data['data']
        
        return []
    
    except Exception as e:
        print(f"   ❌ Image search error: {str(e)[:50]}")
        return []

def main():
    print(f"\n{'='*60}")
    print(f"IMAGE POPULATOR")
    print(f"{'='*60}\n")
    
    # 1. Fetch products without images
    print("Fetching products without images...")
    
    result = supabase.table('products').select('id, name, image_url').execute()
    
    products = result.data
    products_without_images = [
        p for p in products 
        if not p.get('image_url') or p['image_url'].startswith('https://images.unsplash.com')
    ]
    
    print(f"✅ Found {len(products_without_images)}/{len(products)} products needing images\n")
    
    if not products_without_images:
        print("All products have images. Exiting.")
        return
    
    # 2. Search and assign images
    print(f"Searching for images...\n")
    
    updated_count = 0
    failed_count = 0
    
    for i, product in enumerate(products_without_images, 1):
        product_id = product['id']
        product_name = product['name']
        
        print(f"[{i}/{len(products_without_images)}] {product_name[:60]}...")
        
        # Search for images
        images = search_product_images(product_name, limit=3)
        
        if images and len(images) > 0:
            # Use first result
            image_url = images[0].get('url') or images[0].get('link')
            
            if image_url:
                print(f"   ✅ Found image: {image_url[:60]}...")
                
                try:
                    # Update product with image
                    supabase.table('products').update({
                        'image_url': image_url
                    }).eq('id', product_id).execute()
                    
                    updated_count += 1
                except Exception as e:
                    print(f"   ❌ Update failed: {str(e)[:50]}")
                    failed_count += 1
            else:
                print(f"   ⚠️  No valid image URL")
                failed_count += 1
        else:
            print(f"   ⚠️  No images found")
            failed_count += 1
        
        # Rate limit: 1 request per 2 seconds
        if i < len(products_without_images):
            time.sleep(2)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"IMAGE POPULATOR SUMMARY")
    print(f"{'='*60}")
    print(f"Total products: {len(products_without_images)}")
    print(f"Updated: {updated_count}")
    print(f"Failed: {failed_count}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
