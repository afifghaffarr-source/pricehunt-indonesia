#!/usr/bin/env python3
"""
Fix broken product images by re-scraping from marketplace URLs
"""
import os, sys, time, re, requests
from pathlib import Path
from bs4 import BeautifulSoup
from dotenv import load_dotenv

env_path = Path.home() / 'projects/bijakbeli-app/.env.local'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

H_DB = {'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}
H_WEB = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
}

def get_all_products():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products', headers=H_DB, params={'select': 'id,name,slug,image_url', 'order': 'name'})
    return r.json()

def get_offer_urls(product_id):
    r = requests.get(f'{SUPABASE_URL}/rest/v1/offers', headers=H_DB, params={'select': 'url,title,image_url', 'product_id': f'eq.{product_id}', 'limit': 5})
    return r.json()

def is_broken(url):
    if not url: return True
    if 'via.placeholder.com' in url: return True
    if 'placehold.co' in url: return True
    if 'unsplash.com' in url: return True
    return False

def extract_image(url):
    """Extract product image from marketplace URL"""
    try:
        r = requests.get(url, headers=H_WEB, timeout=20, allow_redirects=True)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, 'html.parser')
        candidates = []
        # OG image
        og = soup.find('meta', property='og:image')
        if og and og.get('content'):
            candidates.append(og['content'])
        # Twitter image
        tw = soup.find('meta', attrs={'name': 'twitter:image'})
        if tw and tw.get('content'):
            candidates.append(tw['content'])
        # JSON-LD
        for s in soup.find_all('script', type='application/ld+json'):
            try:
                import json
                d = json.loads(s.string)
                if isinstance(d, dict):
                    img = d.get('image')
                    if isinstance(img, str): candidates.append(img)
                    elif isinstance(img, list) and img: candidates.append(img[0])
            except: pass
        # Tokopedia: look for image data
        for img in soup.find_all('img'):
            src = img.get('src', '') or img.get('data-src', '')
            if 'images.tokopedia' in src or 'tokopedia-static' in src:
                if src.startswith('http'):
                    candidates.append(src)
        for c in candidates:
            if c and c.startswith('http') and not is_broken(c):
                # Convert relative to absolute
                if c.startswith('//'):
                    c = 'https:' + c
                return c
        return None
    except Exception as e:
        return None

def update_image(pid, url):
    r = requests.patch(f'{SUPABASE_URL}/rest/v1/products', headers=H_DB, params={'id': f'eq.{pid}'}, json={'image_url': url})
    return r.status_code == 204

def verify_image(url):
    """Verify URL returns valid image"""
    try:
        r = requests.head(url, headers=H_WEB, timeout=10, allow_redirects=True)
        ct = r.headers.get('content-type', '')
        return r.status_code == 200 and 'image' in ct
    except:
        return False

def main():
    print("\n" + "="*60)
    print("🖼️  FIX BROKEN PRODUCT IMAGES")
    print("="*60 + "\n")

    products = get_all_products()
    print(f"📦 Total: {len(products)} products\n")

    # Phase 1: scrape fresh images from marketplace URLs
    fixed = 0
    no_url = []
    for i, p in enumerate(products, 1):
        name = p['name']
        cur_url = p.get('image_url', '') or ''
        if not is_broken(cur_url):
            # Verify existing
            if verify_image(cur_url):
                continue
        print(f"[{i}/{len(products)}] 🔧 {name[:40]}")
        offers = get_offer_urls(p['id'])
        new_img = None
        for o in offers:
            url = o.get('url')
            if not url: continue
            print(f"   🌐 {url[:55]}...")
            img = extract_image(url)
            if img and not is_broken(img):
                new_img = img
                print(f"   ✅ Got: {img[:65]}")
                break
            time.sleep(0.5)
        if new_img:
            if update_image(p['id'], new_img):
                print(f"   💾 Updated")
                fixed += 1
            else:
                print(f"   ❌ DB update failed")
        else:
            print(f"   ⚠️ No working image found")
            no_url.append(name)
        time.sleep(0.3)

    print(f"\n{'='*60}")
    print(f"📊 Fixed from scraping: {fixed}")
    print(f"⚠️  No URL/no image: {len(no_url)}")
    for n in no_url:
        print(f"   - {n}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
