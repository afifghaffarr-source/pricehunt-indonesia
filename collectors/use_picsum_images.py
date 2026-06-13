#!/usr/bin/env python3
"""
Replace ALL product images with picsum.photos URLs (always working)
Each product gets a unique seed based on its slug for consistent images
"""
import os, requests
from pathlib import Path
from dotenv import load_dotenv

env_path = Path.home() / 'projects/bijakbeli-app/.env.local'
load_dotenv(env_path)
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
H = {'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

# Get all products
r = requests.get(f'{SUPABASE_URL}/rest/v1/products', headers=H, params={'select': 'id,name,slug', 'order': 'name'})
prods = r.json()
print(f"Updating {len(prods)} products with picsum.photos URLs\n")

STOP_WORDS = {'the','and','for','with','gen','rgb','inch','new','pro','max','mini','m2','m3','m1','core','ultra','air','case'}

def get_seed(name, slug):
    # Use slug for consistency (always same image for same product)
    words = slug.replace('-', ' ').split()
    keywords = [w for w in words if w.lower() not in STOP_WORDS and len(w) > 2]
    if not keywords:
        keywords = [slug[:20]]
    # picsum.photos seed: max ~30 chars
    seed = '-'.join(keywords[:4])[:30]
    return seed

updated = 0
for p in prods:
    seed = get_seed(p['name'], p['slug'])
    img_url = f"https://picsum.photos/seed/{seed}/600/600"
    r = requests.patch(f'{SUPABASE_URL}/rest/v1/products', headers=H, params={'id': f'eq.{p["id"]}'}, json={'image_url': img_url})
    if r.status_code == 204:
        print(f"  ✅ {p['name'][:40]} → {seed}")
        updated += 1
    else:
        print(f"  ❌ {p['name']}: {r.status_code}")

print(f"\n📊 Updated: {updated}/{len(prods)}")
