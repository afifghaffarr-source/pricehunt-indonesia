#!/usr/bin/env python3
"""
BijakBeli Data Pipeline
Complete pipeline untuk import, validate, dan analyze scraped data

Usage:
    python scripts/data-pipeline.py import <json_file> [--dry-run]
    python scripts/data-pipeline.py analyze <json_file>
    python scripts/data-pipeline.py validate <json_file>
    python scripts/data-pipeline.py report

Example:
    python scripts/data-pipeline.py import data.json
    python scripts/data-pipeline.py analyze data.json
    python scripts/data-pipeline.py report
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List

import requests
from dotenv import load_dotenv
from collections import Counter

# Load env
load_dotenv(Path(__file__).parent.parent / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def analyze_data(file_path: str):
    """Analyze scraped data file"""
    print(f"\n📊 ANALISIS DATA: {file_path}")
    print("=" * 60)
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    print(f"📦 Total produk: {len(data)}")
    
    # Price analysis
    prices = []
    categories = []
    marketplaces = []
    
    for item in data:
        price_str = item.get('offers', {}).get('price', '0')
        try:
            price = float(price_str.replace(',', ''))
            prices.append(price)
        except:
            pass
        
        # Extract category
        for prop in item.get('additionalProperties', {}).get('extraProperties', []):
            if prop.get('name') == 'kategori':
                categories.append(prop.get('value', 'Unknown'))
        
        # Detect marketplace
        url = item.get('url', '').lower()
        if 'tokopedia' in url:
            marketplaces.append('tokopedia')
        elif 'shopee' in url:
            marketplaces.append('shopee')
        elif 'bukalapak' in url:
            marketplaces.append('bukalapak')
        elif 'lazada' in url:
            marketplaces.append('lazada')
        elif 'blibli' in url:
            marketplaces.append('blibli')
        elif 'tiktok' in url:
            marketplaces.append('tiktok')
    
    if prices:
        print(f"\n💰 HARGA:")
        print(f"   Min: Rp {min(prices):,.0f}")
        print(f"   Max: Rp {max(prices):,.0f}")
        print(f"   Avg: Rp {sum(prices)/len(prices):,.0f}")
        print(f"   Median: Rp {sorted(prices)[len(prices)//2]:,.0f}")
    
    if categories:
        print(f"\n📂 KATEGORI:")
        for cat, count in Counter(categories).most_common(10):
            print(f"   - {cat}: {count}")
    
    if marketplaces:
        print(f"\n🏪 MARKETPLACE:")
        for mp, count in Counter(marketplaces).most_common():
            print(f"   - {mp}: {count}")
    
    # Data quality
    print(f"\n✅ KUALITAS DATA:")
    has_images = sum(1 for item in data if item.get('image'))
    has_desc = sum(1 for item in data if item.get('description'))
    has_rating = sum(1 for item in data if item.get('rating'))
    print(f"   - Dengan gambar: {has_images}/{len(data)}")
    print(f"   - Dengan deskripsi: {has_desc}/{len(data)}")
    print(f"   - Dengan rating: {has_rating}/{len(data)}")

def validate_data(file_path: str):
    """Validate data format before import"""
    print(f"\n🔍 VALIDASI DATA: {file_path}")
    print("=" * 60)
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    errors = []
    warnings = []
    
    for i, item in enumerate(data, 1):
        # Required fields
        if not item.get('name'):
            errors.append(f"[{i}] Missing 'name'")
        if not item.get('url'):
            errors.append(f"[{i}] Missing 'url'")
        if not item.get('offers', {}).get('price'):
            errors.append(f"[{i}] Missing 'price'")
        
        # Optional but recommended
        if not item.get('image'):
            warnings.append(f"[{i}] Missing 'image'")
        if not item.get('description'):
            warnings.append(f"[{i}] Missing 'description'")
        
        # Price validation
        try:
            price = float(item.get('offers', {}).get('price', '0'))
            if price <= 0:
                warnings.append(f"[{i}] Invalid price: {price}")
        except:
            errors.append(f"[{i}] Invalid price format")
    
    print(f"📦 Total items: {len(data)}")
    print(f"❌ Errors: {len(errors)}")
    print(f"⚠️  Warnings: {len(warnings)}")
    
    if errors:
        print(f"\n❌ ERRORS:")
        for err in errors[:10]:
            print(f"   - {err}")
        if len(errors) > 10:
            print(f"   ... and {len(errors) - 10} more")
    
    if warnings:
        print(f"\n⚠️  WARNINGS:")
        for warn in warnings[:10]:
            print(f"   - {warn}")
        if len(warnings) > 10:
            print(f"   ... and {len(warnings) - 10} more")
    
    if not errors:
        print(f"\n✅ Data valid - siap di-import!")
    else:
        print(f"\n❌ Data memiliki errors - fix sebelum import")

def generate_report():
    """Generate report dari database"""
    print(f"\n📊 LAPORAN DATABASE BIJAKBELI")
    print("=" * 60)
    
    if not SUPABASE_URL or not SERVICE_KEY:
        print("❌ Missing database credentials")
        return
    
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}"
    }
    
    # Count products
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id",
        headers=headers
    )
    if resp.status_code == 200:
        products = resp.json()
        print(f"📦 Total produk: {len(products)}")
    
    # Count offers
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/offers?select=id",
        headers=headers
    )
    if resp.status_code == 200:
        offers = resp.json()
        print(f"🏪 Total offers: {len(offers)}")
    
    # Count by marketplace
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/offers?select=marketplace_id",
        headers=headers
    )
    if resp.status_code == 200:
        offers = resp.json()
        marketplace_counts = Counter(o['marketplace_id'] for o in offers)
        print(f"\n📊 Offers per marketplace:")
        for mp_id, count in marketplace_counts.most_common():
            print(f"   - {mp_id[:8]}...: {count}")
    
    # Recent imports
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/offers?select=created_at,title&order=created_at.desc&limit=5",
        headers=headers
    )
    if resp.status_code == 200:
        recent = resp.json()
        print(f"\n🕐 Import terbaru:")
        for item in recent:
            print(f"   - {item['title'][:50]}...")

def main():
    parser = argparse.ArgumentParser(description='BijakBeli Data Pipeline')
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Import command
    import_parser = subparsers.add_parser('import', help='Import data to database')
    import_parser.add_argument('file', help='JSON file to import')
    import_parser.add_argument('--dry-run', action='store_true', help='Preview without inserting')
    
    # Analyze command
    analyze_parser = subparsers.add_parser('analyze', help='Analyze data file')
    analyze_parser.add_argument('file', help='JSON file to analyze')
    
    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate data format')
    validate_parser.add_argument('file', help='JSON file to validate')
    
    # Report command
    report_parser = subparsers.add_parser('report', help='Generate database report')
    
    args = parser.parse_args()
    
    if args.command == 'import':
        if not os.path.exists(args.file):
            print(f"❌ File not found: {args.file}")
            sys.exit(1)
        # Import using existing script
        from import_scraped_data import import_data
        import_data(args.file, args.dry_run)
    
    elif args.command == 'analyze':
        if not os.path.exists(args.file):
            print(f"❌ File not found: {args.file}")
            sys.exit(1)
        analyze_data(args.file)
    
    elif args.command == 'validate':
        if not os.path.exists(args.file):
            print(f"❌ File not found: {args.file}")
            sys.exit(1)
        validate_data(args.file)
    
    elif args.command == 'report':
        generate_report()
    
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
