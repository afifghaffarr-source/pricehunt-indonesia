#!/usr/bin/env python3
"""
Image Fetcher - Get product images from marketplace URLs (OG tags)
"""
import json
import os
import sys
import time
import re
from pathlib import Path
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

env_path = Path.home() / 'projects/bijakbeli-app/.env.local'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

HEADERS_DB = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json'
}

HEADERS_WEB = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
}

def get_products_needing_images():
    """Get products without images"""
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/products',
        headers=HEADERS_DB,
        params={
            'select': 'id,name,slug',
            'image_url': 'is.null',
            'order': 'name'
        }
    )
    return resp.json()

def get_offer_urls(product_id: str) -> list:
    """Get marketplace URLs for a product"""
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/offers',
        headers=HEADERS_DB,
        params={
            'select': 'url,title,image_url',
            'product_id': f'eq.{product_id}',
            'limit': 5
        }
    )
    return resp.json()

def extract_og_image(url: str) -> str | None:
    """Extract og:image from a marketplace page"""
    try:
        resp = requests.get(url, headers=HEADERS_WEB, timeout=15, allow_redirects=True)
        if resp.status_code != 200:
            return None
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Try og:image
        og_img = soup.find('meta', property='og:image')
        if og_img and og_img.get('content'):
            img_url = og_img['content']
            if img_url.startswith('http'):
                return img_url
        
        # Try twitter:image
        tw_img = soup.find('meta', attrs={'name': 'twitter:image'})
        if tw_img and tw_img.get('content'):
            img_url = tw_img['content']
            if img_url.startswith('http'):
                return img_url
        
        # Try JSON-LD
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    img = data.get('image')
                    if isinstance(img, str) and img.startswith('http'):
                        return img
                    elif isinstance(img, list) and img:
                        return img[0]
            except:
                pass
        
        return None
        
    except Exception as e:
        return None

def update_product_image(product_id: str, image_url: str) -> bool:
    """Update product image in database"""
    resp = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products',
        headers=HEADERS_DB,
        params={'id': f'eq.{product_id}'},
        json={'image_url': image_url}
    )
    return resp.status_code == 204

def main():
    print("\n" + "="*60)
    print("🖼️  IMAGE FETCHER (Marketplace OG Tags)")
    print("="*60 + "\n")
    
    products = get_products_needing_images()
    print(f"📦 {len(products)} products without images\n")
    
    success = 0
    failed = 0
    
    for i, product in enumerate(products, 1):
        name = product['name']
        pid = product['id']
        
        print(f"[{i}/{len(products)}] 🔍 {name[:50]}")
        
        # Get offers with URLs
        offers = get_offer_urls(pid)
        
        if not offers:
            print(f"   ❌ No offers found - cannot scrape image")
            failed += 1
            continue
        
        # Try each offer URL
        image_found = None
        for offer in offers:
            url = offer.get('url')
            if not url:
                continue
            
            # Skip if offer already has image
            if offer.get('image_url'):
                image_found = offer['image_url']
                print(f"   📸 Found image from offer data")
                break
            
            print(f"   🌐 Scraping: {url[:60]}...")
            img = extract_og_image(url)
            
            if img:
                image_found = img
                print(f"   ✅ OG image: {img[:70]}")
                break
            
            time.sleep(1)  # Rate limit
        
        if image_found:
            if update_product_image(pid, image_found):
                print(f"   💾 Saved to database")
                success += 1
            else:
                print(f"   ❌ DB update failed")
                failed += 1
        else:
            print(f"   ❌ No image found from {len(offers)} offers")
            failed += 1
        
        time.sleep(0.5)
    
    print(f"\n{'='*60}")
    print(f"📊 HASIL: ✅ {success} | ❌ {failed} | 📦 {len(products)}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
