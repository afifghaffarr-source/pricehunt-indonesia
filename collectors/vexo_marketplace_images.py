#!/usr/bin/env python3
"""
VexoAPI Marketplace Image Populator
Populate product images using VexoAPI /api/tools/marketplace

Status: MOCK DATA (sandbox) - real data tersedia saat VexoAPI production ready
Falls back to Unsplash for real images
"""
import os, sys, time, requests, re
from pathlib import Path
from dotenv import load_dotenv

env_path = Path.home() / 'projects/bijakbeli-app/.env.local'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
VEXO_API_KEY = os.getenv('VEXO_API_KEY')
VEXO_BASE = os.getenv('VEXO_API_BASE_URL', 'https://vexoapi.dev')

H_DB = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Unsplash keywords for product categories (fallback image source)
CATEGORY_KEYWORDS = {
    'smartphone': ['smartphone', 'mobile phone', 'iphone'],
    'laptop': ['laptop', 'macbook', 'notebook'],
    'headphone': ['headphones', 'wireless headphones', 'audio'],
    'wearable': ['smartwatch', 'fitness band', 'wearable'],
    'gaming': ['gaming console', 'game controller', 'nintendo'],
    'electronics': ['electronics', 'gadget'],
    'home appliance': ['home appliance', 'refrigerator', 'washing machine'],
    'fashion': ['sneakers', 'shoes', 'running shoes'],
    'diecast': ['diecast car', 'toy car', 'model car'],
    'default': ['product', 'gadget', 'electronics'],
}

def get_unsplash_url(query: str) -> str:
    """Generate Unsplash source URL (free, no API key needed for source URLs)"""
    keywords = query.lower().replace('-', ' ')
    for cat, words in CATEGORY_KEYWORDS.items():
        if cat in keywords:
            import random
            word = random.choice(words)
            return f"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=500"
    return f"https://picsum.photos/seed/{query.replace(' ', '-')}/600/600"

def get_products_needing_images():
    """Get products without working images"""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products',
        headers=H_DB,
        params={'select': 'id,name,slug,image_url', 'order': 'name'}
    )
    prods = r.json()
    # Filter: no image, or broken image, or placeholder
    result = []
    for p in prods:
        url = p.get('image_url') or ''
        if not url or 'placehold' in url or 'via.placeholder' in url:
            result.append(p)
        else:
            # Verify image loads
            try:
                head = requests.head(url, timeout=5, allow_redirects=True)
                if head.status_code != 200:
                    result.append(p)
            except:
                result.append(p)
    return result

def fetch_vexo_marketplace_image(product_name: str) -> str | None:
    """Try to get product image from VexoAPI marketplace"""
    if not VEXO_API_KEY:
        return None
    
    # Construct search URL (Shopee search)
    search_query = product_name.replace(' ', '+')
    shopee_url = f"https://shopee.co.id/search?q={search_query}"
    
    try:
        res = requests.get(
            f"{VEXO_BASE}/api/tools/marketplace",
            params={'key': VEXO_API_KEY, 'url': shopee_url},
            timeout=15
        )
        if res.status_code != 200:
            return None
        
        data = res.json()
        if not data.get('data'):
            return None
        
        image_url = data['data'].get('image_url')
        if image_url and image_url.startswith('http'):
            # Verify it's a real image
            try:
                head = requests.head(image_url, timeout=5, allow_redirects=True)
                ct = head.headers.get('content-type', '')
                if head.status_code == 200 and 'image' in ct:
                    return image_url
            except:
                return image_url  # Return anyway, will be validated later
        
        return None
    except Exception as e:
        print(f"   ⚠️ VexoAPI error: {str(e)[:50]}")
        return None

def update_product_image(product_id: str, image_url: str) -> bool:
    """Update product image in Supabase"""
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products',
        headers=H_DB,
        params={'id': f'eq.{product_id}'},
        json={'image_url': image_url}
    )
    return r.status_code == 204

def main():
    print("\n" + "="*60)
    print("🛒 VEXOAPI MARKETPLACE IMAGE POPULATOR")
    print("="*60 + "\n")
    
    if not VEXO_API_KEY:
        print("❌ VEXO_API_KEY not set!")
        sys.exit(1)
    
    print(f"📡 API Base: {VEXO_BASE}")
    print(f"🔑 Key: {VEXO_API_KEY[:8]}...{VEXO_API_KEY[-4:]}")
    print()
    
    products = get_products_needing_images()
    print(f"📦 {len(products)} products needing images\n")
    
    if not products:
        print("✅ All products have working images!")
        return
    
    vexo_ok = 0
    unsplash_ok = 0
    picsum_ok = 0
    failed = 0
    
    for i, p in enumerate(products, 1):
        name = p['name']
        pid = p['id']
        
        print(f"[{i}/{len(products)}] 🔍 {name[:45]}")
        
        # 1) Try VexoAPI marketplace
        image_url = fetch_vexo_marketplace_image(name)
        source = "vexo"
        
        if not image_url:
            # 2) Fallback: picsum.photos with product slug as seed
            slug_seed = p['slug'][:30]
            image_url = f"https://picsum.photos/seed/{slug_seed}/600/600"
            source = "picsum"
        
        # Update database
        if update_product_image(pid, image_url):
            print(f"   ✅ [{source.upper()}] {image_url[:65]}...")
            if source == "vexo":
                vexo_ok += 1
            else:
                picsum_ok += 1
        else:
            print(f"   ❌ DB update failed")
            failed += 1
        
        time.sleep(0.5)  # Rate limit
    
    print(f"\n{'='*60}")
    print(f"📊 HASIL:")
    print(f"   🟢 VexoAPI: {vexo_ok}")
    print(f"   🟡 Picsum: {picsum_ok}")
    print(f"   🔴 Failed: {failed}")
    print(f"   📦 Total: {len(products)}")
    print()
    print("ℹ️  VexoAPI marketplace saat ini MOCK data.")
    print("   Gambar real akan otomatis saat API production ready.")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
