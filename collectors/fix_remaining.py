#!/usr/bin/env python3
"""Fix remaining issues: orphan offers + products without price"""
import os, requests, re
from pathlib import Path
from dotenv import load_dotenv
from difflib import SequenceMatcher

load_dotenv(Path.home() / 'projects/bijakbeli-app/.env.local')
S = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
K = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
H = {'apikey': K, 'Authorization': f'Bearer {K}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}
PLACEHOLDER = {f'00000000-0000-0000-0000-00000000000{i}' for i in range(1, 10)}

def norm(t):
    t = re.sub(r'[^\w\s]', ' ', t.lower())
    sw = {'the','and','for','with','new','original','official','store','promo','murah','diskon','sale','termurah','garansi','resmi','ori','gb','tb','inch','cm','pk','mulus','fullset','second','bekas'}
    return ' '.join(w for w in t.split() if w not in sw and len(w) > 1)

def sim(a, b):
    na, nb = norm(a), norm(b)
    wa, wb = set(na.split()), set(nb.split())
    overlap = len(wa & wb) / max(len(wa), len(wb)) if wa and wb else 0
    seq = SequenceMatcher(None, na, nb).ratio()
    return 0.4 * seq + 0.6 * overlap

def main():
    products = requests.get(f'{S}/rest/v1/products', headers=H, params={'select': 'id,name,slug,lowest_price', 'order': 'name'}).json()
    offers = requests.get(f'{S}/rest/v1/offers', headers=H, params={'select': 'id,product_id,title,current_price', 'limit': 500}).json()
    
    orphans = [o for o in offers if not o.get('product_id') or o['product_id'] in PLACEHOLDER]
    matched = [o for o in offers if o.get('product_id') and o['product_id'] not in PLACEHOLDER]
    
    print(f"\n{'='*60}")
    print(f"FIX ORPHAN OFFERS + PRODUCTS WITHOUT PRICE")
    print(f"{'='*60}")
    print(f"📦 Products: {len(products)} | Offers: {len(offers)} | Matched: {len(matched)} | Orphan: {len(orphans)}\n")

    # Step 1: Delete test/invalid offers (no price, test names)
    print("STEP 1: Delete test/invalid offers")
    test_patterns = ['test', 'dummy', 'sample', 'sandbox', 'mock', 'verification', 'complete data trust']
    deleted = 0
    kept = []
    for o in orphans:
        title = (o.get('title') or '').lower()
        price = o.get('current_price') or 0
        is_test = any(p in title for p in test_patterns)
        if is_test:
            r = requests.delete(f'{S}/rest/v1/offers', headers=H, params={'id': f'eq.{o["id"]}'})
            if r.status_code == 204:
                print(f"  🗑️  Test: {o['title'][:50]}")
                deleted += 1
        elif price == 0:
            r = requests.delete(f'{S}/rest/v1/offers', headers=H, params={'id': f'eq.{o["id"]}'})
            if r.status_code == 204:
                print(f"  🗑️  No price: {o['title'][:50]}")
                deleted += 1
        else:
            kept.append(o)
    print(f"  📊 Deleted: {deleted} | Remaining: {len(kept)}\n")

    # Step 2: Match remaining orphans
    print("STEP 2: Match remaining orphans (threshold 25%)")
    THRESHOLD = 0.25
    m = 0
    still_orphan = []
    for o in kept:
        best = (0, None)
        for p in products:
            s = sim(o['title'], p['name'])
            if s > best[0]:
                best = (s, p)
        score, prod = best
        if score >= THRESHOLD and prod:
            r = requests.patch(f'{S}/rest/v1/offers', headers=H, params={'id': f'eq.{o["id"]}'}, json={'product_id': prod['id']})
            if r.status_code == 204:
                print(f"  ✅ {o['title'][:35]} → {prod['name'][:30]} ({score:.0%})")
                m += 1
        else:
            still_orphan.append(o)
    print(f"  📊 Matched: {m} | Still orphan: {len(still_orphan)}\n")

    # Step 3: Fix products without lowest_price
    print("STEP 3: Fix products without lowest_price")
    products = requests.get(f'{S}/rest/v1/products', headers=H, params={'select': 'id,name,lowest_price', 'order': 'name'}).json()
    all_offers = requests.get(f'{S}/rest/v1/offers', headers=H, params={'select': 'product_id,current_price', 'limit': 500}).json()
    
    price_map = {}
    for o in all_offers:
        pid = o.get('product_id')
        price = o.get('current_price') or 0
        if pid and pid not in PLACEHOLDER and price > 0:
            price_map.setdefault(pid, []).append(price)
    
    fixed = 0
    for p in products:
        prices = price_map.get(p['id'], [])
        cur_price = p.get('lowest_price') or 0
        if prices and cur_price == 0:
            lowest = min(prices)
            r = requests.patch(f'{S}/rest/v1/products', headers=H, params={'id': f'eq.{p["id"]}'}, json={'lowest_price': lowest})
            if r.status_code == 204:
                print(f"  💰 {p['name'][:40]} → Rp{lowest:,.0f}")
                fixed += 1
    print(f"  📊 Fixed: {fixed}\n")

    # Final summary
    products = requests.get(f'{S}/rest/v1/products', headers=H, params={'select': 'id,name,lowest_price,image_url'}).json()
    offers = requests.get(f'{S}/rest/v1/offers', headers=H, params={'select': 'id,product_id', 'limit': 500}).json()
    matched_final = [o for o in offers if o.get('product_id') and o['product_id'] not in PLACEHOLDER]
    orphan_final = len(offers) - len(matched_final)
    with_img = len([p for p in products if p.get('image_url')])
    with_price = len([p for p in products if (p.get('lowest_price') or 0) > 0])

    print(f"{'='*60}")
    print(f"📊 FINAL")
    print(f"  📦 Products: {len(products)}")
    print(f"  🖼️  With image: {with_img}/{len(products)}")
    print(f"  💰 With price: {with_price}/{len(products)}")
    print(f"  📋 Offers: {len(offers)} | 🔗 Matched: {len(matched_final)} | ❌ Orphan: {orphan_final}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
