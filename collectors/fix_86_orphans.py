#!/usr/bin/env python3
"""Fix 86 orphan offers: match products + delete non-tech"""
import os, requests, re
from pathlib import Path
from dotenv import load_dotenv
from difflib import SequenceMatcher

load_dotenv(Path.home() / 'projects/bijakbeli-app/.env.local')
S = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
K = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
H = {'apikey': K, 'Authorization': f'Bearer {K}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}
PLACEHOLDER = {f'00000000-0000-0000-0000-00000000000{i}' for i in range(1, 10)}

NON_TECH = ['sepatu','sneakers','sandal','shoes','tas','bag','backpack','ransel',
            'case','casing','anti gores','tempered','screen protector','ringke','spigen']

def norm(t):
    t = re.sub(r'[^\w\s]', ' ', t.lower())
    sw = {'the','and','for','with','new','original','official','store','promo','murah',
          'diskon','sale','termurah','garansi','resmi','ori','gb','tb','inch','cm','pk',
          'mulus','fullset','second','bekas','tipe','type','active','noise','cancelling',
          'wireless','bluetooth','usb','c','gen','rd','th'}
    return ' '.join(w for w in t.split() if w not in sw and len(w) > 1)

def sim(a, b):
    na, nb = norm(a), norm(b)
    wa, wb = set(na.split()), set(nb.split())
    overlap = len(wa & wb) / max(len(wa), len(wb)) if wa and wb else 0
    seq = SequenceMatcher(None, na, nb).ratio()
    return 0.3 * seq + 0.7 * overlap

def main():
    products = requests.get(f'{S}/rest/v1/products', headers=H, params={'select': 'id,name,slug', 'order': 'name'}).json()
    offers = requests.get(f'{S}/rest/v1/offers', headers=H, params={'select': 'id,product_id,title,current_price', 'limit': 500}).json()
    orphans = [o for o in offers if not o.get('product_id') or o['product_id'] in PLACEHOLDER]

    print(f"\n{'='*60}")
    print(f"FIX 86 ORPHAN OFFERS")
    print(f"{'='*60}\n")

    # Step 1: Delete non-tech
    print("STEP 1: Delete non-tech offers")
    deleted = 0
    kept = []
    for o in orphans:
        t = o.get('title', '').lower()
        if any(k in t for k in NON_TECH):
            r = requests.delete(f'{S}/rest/v1/offers', headers=H, params={'id': f'eq.{o["id"]}'})
            if r.status_code == 204:
                print(f"  🗑️  {o['title'][:50]}")
                deleted += 1
        else:
            kept.append(o)
    print(f"  📊 Deleted: {deleted} | Kept: {len(kept)}\n")

    # Step 2: Match with very low threshold
    print("STEP 2: Match remaining (threshold 15%)")
    THRESHOLD = 0.15
    matched = 0
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
                matched += 1
        else:
            still_orphan.append(o)
    print(f"  📊 Matched: {matched} | Still orphan: {len(still_orphan)}\n")

    # Step 3: Show remaining
    if still_orphan:
        print("STEP 3: Remaining orphan offers (no match found)")
        for o in still_orphan:
            price = o.get('current_price') or 0
            print(f"  ❌ Rp{price:>10,.0f} | {o['title'][:55]}")
        print(f"\n  📊 Total remaining: {len(still_orphan)}")

    # Final
    offers = requests.get(f'{S}/rest/v1/offers', headers=H, params={'select': 'id,product_id', 'limit': 500}).json()
    matched_final = len([o for o in offers if o.get('product_id') and o['product_id'] not in PLACEHOLDER])
    orphan_final = len(offers) - matched_final

    print(f"\n{'='*60}")
    print(f"📊 FINAL")
    print(f"  📋 Offers: {len(offers)} | 🔗 Matched: {matched_final} | ❌ Orphan: {orphan_final}")
    print(f"  🗑️  Deleted: {deleted} | ✅ New matches: {matched}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
