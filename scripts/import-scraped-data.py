#!/usr/bin/env python3
"""
BijakBeli Data Importer
Import scraped e-commerce data ke database BijakBeli

Usage:
    python scripts/import-scraped-data.py <json_file> [--dry-run] [--batch-size 10]

Example:
    python scripts/import-scraped-data.py data.json
    python scripts/import-scraped-data.py data.json --dry-run
    python scripts/import-scraped-data.py data.json --batch-size 5
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv

# Local: Python port of src/lib/ingestion/extract-variant.ts. Used to
# auto-link offers to product_variants at insertion time (see insert_offer).
sys.path.insert(0, str(Path(__file__).parent))
from extract_variant import find_matching_variant_id  # noqa: E402

# Load env
load_dotenv(Path(__file__).parent.parent / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

# Marketplace UUIDs
MARKETPLACE_IDS = {
    'tokopedia': 'b5955e0a-8f32-43e3-bd5c-c5d37b333efa',
    'shopee': 'c60af940-c71e-4a81-ad50-bfab7875a35f',
    'bukalapak': '06c4b196-865b-4fcd-aa02-3f93208b25f2',
    'lazada': 'bda64ca0-ca4d-4064-92db-92143c3207fd',
    'blibli': '59fdf7b4-3cf9-4bdc-bcb8-04e6f6c02343',
    'tiktok': 'c5e7b12d-9ed3-42f5-8400-bdd366bfd421',
}

def create_slug(name: str) -> str:
    """Create URL-friendly slug from product name"""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug[:100]  # Limit length

def extract_category(item: Dict) -> str:
    """Extract category from additionalProperties"""
    for prop in item.get('additionalProperties', {}).get('extraProperties', []):
        if prop.get('name') == 'kategori':
            return prop.get('value', 'Umum')
    return 'Umum'

def extract_stock(item: Dict) -> tuple:
    """Extract stock info from additionalProperties"""
    for prop in item.get('additionalProperties', {}).get('extraProperties', []):
        if prop.get('name') == 'stok total':
            try:
                stock = int(prop.get('value', '0'))
                if stock > 0:
                    return 'in_stock', stock
                else:
                    return 'out_of_stock', 0
            except:
                pass
    return 'unknown', 0

def detect_marketplace(url: str) -> str:
    """Detect marketplace from URL"""
    url_lower = url.lower()
    if 'tokopedia.com' in url_lower:
        return 'tokopedia'
    elif 'shopee' in url_lower:
        return 'shopee'
    elif 'bukalapak' in url_lower:
        return 'bukalapak'
    elif 'lazada' in url_lower:
        return 'lazada'
    elif 'blibli' in url_lower:
        return 'blibli'
    elif 'tiktok' in url_lower:
        return 'tiktok'
    return 'unknown'

def insert_product(item: Dict, dry_run: bool = False) -> Optional[str]:
    """Insert product ke database, return product_id"""
    name = item.get('name', '')
    slug = create_slug(name)
    category = extract_category(item)
    description = item.get('description', '')[:500]  # Limit description
    image_url = item.get('image', '')
    price = float(item.get('offers', {}).get('price', '0'))
    
    product_data = {
        'name': name,
        'slug': slug,
        'category': category,
        'description': description,
        'image_url': image_url,
        'lowest_price': int(price),  # Convert to integer
        'highest_price': int(price),  # Convert to integer
        'deal_score': 50,  # Default score
    }
    
    if dry_run:
        print(f"  [DRY RUN] Would insert product: {name[:50]}...")
        return 'dry-run-id'
    
    # Insert product
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/products",
        json=product_data,
        headers={
            'apikey': SERVICE_KEY,
            'Authorization': f'Bearer {SERVICE_KEY}',
            'Prefer': 'return=representation'
        }
    )
    
    if resp.status_code == 201:
        data = resp.json()
        if data and len(data) > 0:
            return data[0].get('id')
    elif resp.status_code == 409:  # Conflict - duplicate slug
        # Try to get existing product
        resp2 = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?slug=eq.{slug}&select=id",
            headers={
                'apikey': SERVICE_KEY,
                'Authorization': f'Bearer {SERVICE_KEY}'
            }
        )
        if resp2.status_code == 200:
            data = resp2.json()
            if data:
                print(f"  ⚠️  Product already exists: {name[:50]}...")
                return data[0].get('id')
    else:
        print(f"  ❌ Failed to insert product: {resp.status_code} - {resp.text[:100]}")
    
    return None

def insert_offer(item: Dict, product_id: str, dry_run: bool = False) -> bool:
    """Insert offer ke database"""
    url = item.get('url', '')
    marketplace = detect_marketplace(url)
    marketplace_id = MARKETPLACE_IDS.get(marketplace)
    
    if not marketplace_id:
        print(f"  ⚠️  Unknown marketplace: {marketplace}")
        return False
    
    price = float(item.get('offers', {}).get('price', '0'))
    rating = item.get('rating', 0)
    review_count = item.get('reviewCount', 0)
    stock_status, stock_qty = extract_stock(item)
    sku = item.get('additionalProperties', {}).get('sku', '')
    
    # Extract marketplace_product_id from URL
    url_parts = url.rstrip('/').split('-')
    marketplace_product_id = url_parts[-1] if url_parts else 'unknown'
    # Clean up query params
    marketplace_product_id = marketplace_product_id.split('?')[0]
    
    offer_data = {
        'product_id': product_id,
        'marketplace_id': marketplace_id,
        'marketplace_product_id': marketplace_product_id,
        'title': item.get('name', '')[:200],
        'url': url.split('?')[0],  # Remove query params
        'current_price': int(price),  # Convert to integer
        'original_price': None,
        'seller_name': None,
        'seller_rating': rating,
        'seller_review_count': review_count,
        'is_official_store': False,
        'condition': 'unknown',
        'stock_status': stock_status,
        'image_url': item.get('image', ''),
        'source': 'browser_collector',
        'confidence_score': 80,
        'confidence_label': 'sangat dipercaya',
        'validation_status': 'pending',
        'is_active': True,
    }
    
    if dry_run:
        print(f"  [DRY RUN] Would insert offer: {marketplace} - Rp {price:,.0f}")
        return True
    
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/offers",
        json=offer_data,
        headers={
            'apikey': SERVICE_KEY,
            'Authorization': f'Bearer {SERVICE_KEY}',
            'Prefer': 'return=representation'
        }
    )
    
    if resp.status_code == 201:
        # Phase 8: Extract variant from title and link to product_variants.
        # This prevents future orphans with variant_id=NULL — the cleanup
        # cron (orphan-auto-link) would have caught them later, but doing
        # it at insertion time is cheaper and gives accurate stats from
        # day one. See scripts/extract_variant.py for the parser (Python
        # port of src/lib/ingestion/extract-variant.ts).
        offer_id = None
        try:
            inserted = resp.json()
            if inserted and isinstance(inserted, list):
                offer_id = inserted[0].get("id")
        except Exception:
            pass

        if offer_id and offer_data.get("title"):
            try:
                variant_id = find_matching_variant_id(
                    product_id=product_id,
                    title=offer_data["title"],
                    supabase_url=SUPABASE_URL,
                    service_key=SERVICE_KEY,
                )
                if variant_id:
                    requests.patch(
                        f"{SUPABASE_URL}/rest/v1/offers?id=eq.{offer_id}",
                        json={"variant_id": variant_id},
                        headers={
                            "apikey": SERVICE_KEY,
                            "Authorization": f"Bearer {SERVICE_KEY}",
                            "Prefer": "return=minimal",
                        },
                    )
                    print(f"  🔗 Linked variant: {offer_data['title'][:50]}...")
            except Exception as e:
                # Non-fatal: variant linking is best-effort. The offer is
                # already saved; the orphan-auto-link cron will retry.
                print(f"  ⚠️  Variant link failed (non-fatal): {e}")

        return True
    else:
        print(f"  ❌ Failed to insert offer: {resp.status_code} - {resp.text[:100]}")
        return False

def import_data(file_path: str, dry_run: bool = False, batch_size: int = 10):
    """Main import function"""
    print(f"\n🚀 BijakBeli Data Importer")
    print(f"=" * 60)
    
    # Load data
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    print(f"📁 File: {file_path}")
    print(f"📦 Total items: {len(data)}")
    print(f"🔧 Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"📦 Batch size: {batch_size}")
    print()
    
    stats = {
        'products_inserted': 0,
        'products_skipped': 0,
        'offers_inserted': 0,
        'offers_failed': 0,
        'errors': [],
    }
    
    for i, item in enumerate(data, 1):
        print(f"[{i}/{len(data)}] {item.get('name', 'Unknown')[:50]}...")
        
        # Insert product
        product_id = insert_product(item, dry_run)
        
        if product_id:
            if product_id == 'dry-run-id':
                stats['products_inserted'] += 1
            else:
                stats['products_inserted'] += 1
            
            # Insert offer
            if insert_offer(item, product_id, dry_run):
                stats['offers_inserted'] += 1
            else:
                stats['offers_failed'] += 1
        else:
            stats['products_skipped'] += 1
            stats['errors'].append(f"Failed: {item.get('name', 'Unknown')[:50]}")
    
    # Summary
    print(f"\n{'=' * 60}")
    print(f"📊 IMPORT SUMMARY")
    print(f"{'=' * 60}")
    print(f"✅ Products inserted: {stats['products_inserted']}")
    print(f"⏭️  Products skipped: {stats['products_skipped']}")
    print(f"✅ Offers inserted: {stats['offers_inserted']}")
    print(f"❌ Offers failed: {stats['offers_failed']}")
    
    if stats['errors']:
        print(f"\n⚠️  Errors ({len(stats['errors'])}):")
        for err in stats['errors'][:5]:
            print(f"   - {err}")
    
    print(f"\n{'=' * 60}")
    
    return stats

def main():
    parser = argparse.ArgumentParser(description='Import scraped data to BijakBeli')
    parser.add_argument('file', help='JSON file to import')
    parser.add_argument('--dry-run', action='store_true', help='Preview without inserting')
    parser.add_argument('--batch-size', type=int, default=10, help='Batch size for processing')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.file):
        print(f"❌ File not found: {args.file}")
        sys.exit(1)
    
    import_data(args.file, args.dry_run, args.batch_size)

if __name__ == '__main__':
    main()
