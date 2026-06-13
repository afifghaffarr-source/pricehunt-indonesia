#!/usr/bin/env python3
"""Quick Wins: Match orphan offers + remove empty products"""
import os, requests, re, sys
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
    sw = {'the','and','for','with','new','original','official','store','promo','murah','diskon','sale','termurah','garansi','resmi','ori','gb','tb','inch','cm','pk'}
    return ' '.join(w for w in t.split() if w not in sw and len(w) > 1)

def sim(a, b):
    na, nb = norm(a), norm(b)
    r = SequenceMatcher(None, na, nb).ratio()
    wa, wb = set(na.split()), set(nb.split())
    if wa and wb:
        overlap = len(wa & wb) / max(len(wa), len(wb))
        r = 0.5 * r + 0.5 * overlap
    return r

def main():
    print("\n⚡ QUICK WINS\n" + "="*50)
    
    # Fetch all
    products = requests.get(f'{S}/rest/v1/products', headers=H, params={'select': 'id,name,slug,lowest_price', 'order': 'name'}).json()
    offers_raw = requests.get(f'{S}/rest/v1/offers', headers=H, params={'select': 'id,product_id,title', 'limit': 500}).json()
    
    # Separate orphan vs matched
    orphans = []
    for o in offers_raw:
        pid = o.get('product_id')
        if not pid or pid in PLACEHOLDER:
            orphans.append(o)
    
    print(f"📦 Products: {len(products)} | Offers: {len(offers_raw)} | Orphans: {len(orphans)}\n")

    # Step 1: Delete products with no offers (check via offers, not prices join)
    offer_counts = {}
    for o in offers_raw:
        pid = o.get('product_id')
        if pid and pid not in PLACEHOLDER:
            offer_counts[pid] = offer_counts.get(pid, 0) + 1

    print("STEP 1: Clean products with no offers & Rp0 price")
    deleted = 0
    for p in products:
        cnt = offer_counts.get(p['id'], 0)
        price = p.get('lowest_price') or 0
        if cnt == 0 and price == 0:
            r = requests.delete(f'{S}/rest/v1/products', headers=H, params={'id': f'eq.{p["id"]}'})
            if r.status_code == 204:
                print(f"  🗑️ {p['name']}")
                deleted += 1
    print(f"  📊 Deleted: {deleted}\n")

    # Refresh products
    products = requests.get(f'{S}/rest/v1/products', headers=H, params={'select': 'id,name,slug', 'order': 'name'}).json()
    print(f"  📦 Products remaining: {len(products)}\n")

    # Step 2: Match orphans
    print("STEP 2: Match orphan offers to products")
    THRESHOLD = 0.40
    matched = 0
    unmatched = []
    
    for o in orphans:
        best = (0, None)
        for p in products:
            s = sim(o['title'], p['name'])
            if s > best[0]:
                best = (s, p)
        
        score, prod = best
        if score >= THRESHOLD and prod:
            r = requests.patch(f'{S}/rest/v1/offers', headers=H, params={'id': f'eq.{o["id"]}'}, json={'product_id': prod['id']})
            if r.status_code == 204:
                print(f"  ✅ {o['title'][:40]} → {prod['name'][:30]} ({score:.0%})")
                matched += 1
        else:
            unmatched.append((o['title'], score, prod['name'] if prod else 'N/A'))

    print(f"\n  📊 Matched: {matched} | Unmatched: {len(unmatched)}")
    if unmatched:
        print(f"\n  Unmatched (best < {THRESHOLD:.0%}):")
        for t, s, p in unmatched[:15]:
            print(f"    {s:.0%} | {t[:35]} → {p[:30]}")

    print(f"\n{'='*50}")
    print(f"📊 RESULT: 🗑️{deleted} deleted | 🔗{matched} matched | ❌{len(unmatched)} unmatched")
    print(f"{'='*50}\n")

if __name__ == '__main__':
    main()
