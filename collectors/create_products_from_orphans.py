#!/usr/bin/env python3
"""Create new products from orphan offers (high-value) + delete generic"""
import os, requests, re, hashlib
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path.home() / 'projects/bijakbeli-app/.env.local')
S = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
K = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
H = {'apikey': K, 'Authorization': f'Bearer {K}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}
PLACEHOLDER = {f'00000000-0000-0000-0000-00000000000{i}' for i in range(1, 10)}

# Categories for new products
CATEGORIES = {
    'Laptop': ['thinkpad', 'dell xps', 'laptop'],
    'Peripherals': ['keyboard', 'mouse', 'k98', 'tk68', 'mofii', 'jete', 'quinton', 'rexus', 'gamen', 'fantech', 'zifriend', 'huwei', 'ma k61'],
    'Audio': ['soundpeats', 'headphone', 'headset', 'earbuds'],
}

def make_slug(title):
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    slug = re.sub(r'[\s]+', '-', slug.strip())
    slug = slug[:80].rstrip('-')
    return slug

def guess_category(title):
    t = title.lower()
    for cat, keywords in CATEGORIES.items():
        if any(k in t for k in keywords):
            return cat
    return 'Other'

def main():
    offers = requests.get(f'{S}/rest/v1/offers', headers=H, params={'select': 'id,product_id,title,current_price', 'limit': 500}).json()
    orphans = [o for o in offers if not o.get('product_id') or o['product_id'] in PLACEHOLDER]

    print(f"\n{'='*60}")
    print(f"CREATE PRODUCTS FROM ORPHAN OFFERS")
    print(f"{'='*60}")
    print(f"📊 Orphan offers: {len(orphans)}\n")

    # Split: high-value (>= Rp500K) vs cheap
    high_value = [o for o in orphans if (o.get('current_price') or 0) >= 500000]
    cheap = [o for o in orphans if (o.get('current_price') or 0) < 500000]

    print(f"💎 High-value (≥Rp500K): {len(high_value)}")
    print(f"💰 Cheap (<Rp500K): {len(cheap)}\n")

    # Delete cheap generic offers
    print("STEP 1: Delete cheap generic offers")
    deleted = 0
    for o in cheap:
        t = o.get('title', '').lower()
        if any(k in t for k in ['product from', 'jete', 'quinton', 'mouse gaming', 'jerman']):
            r = requests.delete(f'{S}/rest/v1/offers', headers=H, params={'id': f'eq.{o["id"]}'})
            if r.status_code == 204:
                print(f"  🗑️  {o['title'][:50]}")
                deleted += 1
    print(f"  📊 Deleted: {deleted}\n")

    # Create products from high-value offers
    print("STEP 2: Create new products from high-value offers")
    created = 0
    for o in high_value:
        title = o['title']
        price = o.get('current_price') or 0
        category = guess_category(title)
        slug = make_slug(title)

        # Check if product already exists (by slug)
        existing = requests.get(f'{S}/rest/v1/products', headers=H, params={'select': 'id', 'slug': f'eq.{slug}', 'limit': 1}).json()
        if existing:
            # Link offer to existing product
            pid = existing[0]['id']
            r = requests.patch(f'{S}/rest/v1/offers', headers=H, params={'id': f'eq.{o["id"]}'}, json={'product_id': pid})
            if r.status_code == 204:
                print(f"  🔗 Linked: {title[:40]} → existing product")
            continue

        # Create new product
        product = {
            'name': title[:200],
            'slug': slug,
            'category': category,
            'lowest_price': price,
            'highest_price': price,
            'image_url': f'https://picsum.photos/seed/{slug[:30]}/600/600',
        }
        r = requests.post(f'{S}/rest/v1/products', headers=H, json=product)
        if r.status_code == 201:
            # Get the new product ID
            new = requests.get(f'{S}/rest/v1/products', headers=H, params={'select': 'id', 'slug': f'eq.{slug}', 'limit': 1}).json()
            if new:
                pid = new[0]['id']
                # Link offer to new product
                requests.patch(f'{S}/rest/v1/offers', headers=H, params={'id': f'eq.{o["id"]}'}, json={'product_id': pid})
                print(f"  ✅ Created: {title[:40]} → {category}")
                created += 1

    # Final
    offers = requests.get(f'{S}/rest/v1/offers', headers=H, params={'select': 'id,product_id', 'limit': 500}).json()
    products = requests.get(f'{S}/rest/v1/products', headers=H, params={'select': 'id', 'limit': 500}).json()
    matched = len([o for o in offers if o.get('product_id') and o['product_id'] not in PLACEHOLDER])
    orphan = len(offers) - matched

    print(f"\n{'='*60}")
    print(f"📊 FINAL")
    print(f"  📦 Products: {len(products)} (+{created} new)")
    print(f"  📋 Offers: {len(offers)} | 🔗 Matched: {matched} | ❌ Orphan: {orphan}")
    print(f"  🗑️  Deleted: {deleted}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
