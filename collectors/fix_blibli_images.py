#!/usr/bin/env python3
"""
Fix images: replace wrong Blibli homepage images with real product images
"""
import os, sys, time, requests
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
    'Cache-Control': 'no-cache',
}

def is_blibli_homepage_asset(url):
    """Detect if URL is the Blibli site homepage asset, not a product image"""
    if not url: return True
    bad_patterns = [
        'homepage_fb_rebrand', 'logo_blibli', 'icon_blibli',
        'siva/asset/09_2023/homepage',
        'siva/asset/04_2024', 'siva/asset/05_2024',
    ]
    return any(p in url for p in bad_patterns)

def is_bad_image(url):
    if not url: return True
    if 'via.placeholder.com' in url: return True
    if 'placehold.co' in url: return True
    if is_blibli_homepage_asset(url): return True
    return False

def is_working_image(url):
    if is_bad_image(url): return False
    try:
        r = requests.head(url, headers=H_WEB, timeout=10, allow_redirects=True)
        ct = r.headers.get('content-type', '')
        return r.status_code == 200 and 'image' in ct
    except:
        return False

def get_all_products():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products', headers=H_DB, params={'select': 'id,name,slug,image_url', 'order': 'name'})
    return r.json()

def get_offer_urls(product_id):
    r = requests.get(f'{SUPABASE_URL}/rest/v1/offers', headers=H_DB, params={'select': 'url,title', 'product_id': f'eq.{product_id}', 'limit': 10})
    return r.json()

def extract_image(url):
    try:
        r = requests.get(url, headers=H_WEB, timeout=20, allow_redirects=True)
        if r.status_code != 200: return None
        soup = BeautifulSoup(r.text, 'html.parser')
        cands = []
        # og:image - filter out bad ones
        og = soup.find('meta', property='og:image')
        if og and og.get('content'):
            cands.append(og['content'])
        tw = soup.find('meta', attrs={'name': 'twitter:image'})
        if tw and tw.get('content'):
            cands.append(tw['content'])
        # JSON-LD
        for s in soup.find_all('script', type='application/ld+json'):
            try:
                import json
                d = json.loads(s.string)
                if isinstance(d, dict):
                    img = d.get('image')
                    if isinstance(img, str): cands.append(img)
                    elif isinstance(img, list) and img: cands.append(img[0])
            except: pass
        # Product images
        for img in soup.find_all('img'):
            src = img.get('src', '') or img.get('data-src', '') or img.get('data-original', '')
            if any(d in src for d in ['images.tokopedia', 'tokopedia-static', 'cf.shopee', 'susercontent']):
                if src.startswith('//'): src = 'https:' + src
                if src.startswith('http'): cands.append(src)
        for c in cands:
            if c and c.startswith('http') and not is_bad_image(c):
                return c
        return None
    except:
        return None

def update_image(pid, url):
    r = requests.patch(f'{SUPABASE_URL}/rest/v1/products', headers=H_DB, params={'id': f'eq.{pid}'}, json={'image_url': url})
    return r.status_code == 204

def delete_image(pid):
    r = requests.patch(f'{SUPABASE_URL}/rest/v1/products', headers=H_DB, params={'id': f'eq.{pid}'}, json={'image_url': None})
    return r.status_code == 204

def main():
    print("\n" + "="*60)
    print("🖼️  FIX WRONG IMAGES (Blibli homepage → real)")
    print("="*60 + "\n")
    prods = get_all_products()
    print(f"📦 Total: {len(prods)}\n")

    # Find products with bad images
    bad_prods = [p for p in prods if is_bad_image(p.get('image_url') or '')]
    print(f"🔍 Products with bad images: {len(bad_prods)}\n")

    fixed = 0
    deleted = 0
    for i, p in enumerate(bad_prods, 1):
        name = p['name']
        print(f"[{i}/{len(bad_prods)}] 🔧 {name[:40]}")
        offers = get_offer_urls(p['id'])
        new_img = None
        for o in offers:
            url = o.get('url')
            if not url: continue
            print(f"   🌐 {url[:50]}...", end=' ')
            img = extract_image(url)
            if img and not is_bad_image(img):
                new_img = img
                print(f"✅ {img[:50]}")
                break
            else:
                print("❌")
            time.sleep(0.5)
        if new_img:
            if update_image(p['id'], new_img):
                print(f"   💾 Updated")
                fixed += 1
            else:
                print(f"   ❌ DB update failed")
        else:
            # Clear image so frontend uses Package placeholder
            if delete_image(p['id']):
                print(f"   🗑️  Cleared image → will show placeholder icon")
                deleted += 1
            else:
                print(f"   ❌ Could not clear")
        time.sleep(0.3)

    print(f"\n{'='*60}")
    print(f"📊 Fixed: {fixed} | Cleared: {deleted} | Total: {len(bad_prods)}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
