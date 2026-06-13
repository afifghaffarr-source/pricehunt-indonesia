#!/usr/bin/env python3
"""
BijakBeli Schema Validator
Validates TypeScript types against actual Supabase production schema.

Usage:
    python scripts/validate-schema.py [--fix]
"""

import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load env
load_dotenv(Path(__file__).parent.parent / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

def fetch_table_schema(table_name: str) -> dict:
    """Fetch actual columns from Supabase table"""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table_name}?select=*&limit=1",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}"
        }
    )
    
    if resp.status_code != 200:
        return {"error": f"HTTP {resp.status_code}"}
    
    data = resp.json()
    if not data:
        return {"error": "No data in table"}
    
    # Extract column names and types
    columns = {}
    for col, value in data[0].items():
        col_type = type(value).__name__
        if value is None:
            col_type = "unknown (null)"
        columns[col] = {
            "type": col_type,
            "nullable": value is None
        }
    
    return columns

def compare_with_typescript(table_name: str, ts_columns: list) -> dict:
    """Compare actual DB columns with TypeScript interface"""
    actual = fetch_table_schema(table_name)
    
    if "error" in actual:
        return {"error": actual["error"]}
    
    actual_cols = set(actual.keys())
    ts_cols = set(ts_columns)
    
    missing_in_ts = actual_cols - ts_cols
    extra_in_ts = ts_cols - actual_cols
    
    return {
        "actual_columns": sorted(actual_cols),
        "ts_columns": sorted(ts_cols),
        "missing_in_ts": sorted(missing_in_ts),
        "extra_in_ts": sorted(extra_in_ts),
        "match": len(missing_in_ts) == 0 and len(extra_in_ts) == 0
    }

# Expected TypeScript columns from offers.ts
OFFERS_TS_COLUMNS = [
    "id", "product_id", "marketplace_id", "marketplace_product_id",
    "seller_name", "seller_rating", "seller_review_count", "is_official_store",
    "condition", "variant", "url", "current_price", "original_price",
    "stock_status", "location", "shipping_estimate", "sold_count",
    "voucher_text", "has_voucher", "has_free_shipping", "shipping_info",
    "last_checked_at", "created_at", "updated_at"
]

# Expected TypeScript columns from data.ts (prices table)
PRICES_TS_COLUMNS = [
    "id", "product_id", "marketplace_id", "price", "original_price",
    "in_stock", "url", "seller", "seller_rating", "shipping_cost",
    "last_updated", "created_at"
]

def main():
    print("🔍 BijakBeli Schema Validator\n")
    print("=" * 60)
    
    # Check offers table
    print("\n📦 OFFERS TABLE:")
    offers_result = compare_with_typescript("offers", OFFERS_TS_COLUMNS)
    
    if "error" in offers_result:
        print(f"   ❌ Error: {offers_result['error']}")
    else:
        print(f"   Actual columns: {len(offers_result['actual_columns'])}")
        print(f"   TS columns: {len(offers_result['ts_columns'])}")
        
        if offers_result['missing_in_ts']:
            print(f"\n   ⚠️  Missing in TypeScript ({len(offers_result['missing_in_ts'])}):")
            for col in offers_result['missing_in_ts']:
                print(f"      - {col}")
        
        if offers_result['extra_in_ts']:
            print(f"\n   ⚠️  Extra in TypeScript ({len(offers_result['extra_in_ts'])}):")
            for col in offers_result['extra_in_ts']:
                print(f"      - {col}")
        
        if offers_result['match']:
            print("   ✅ Schema matches!")
    
    # Check prices table
    print("\n📦 PRICES TABLE:")
    prices_result = compare_with_typescript("prices", PRICES_TS_COLUMNS)
    
    if "error" in prices_result:
        print(f"   ❌ Error: {prices_result['error']}")
    else:
        print(f"   Actual columns: {len(prices_result['actual_columns'])}")
        print(f"   TS columns: {len(prices_result['ts_columns'])}")
        
        if prices_result['missing_in_ts']:
            print(f"\n   ⚠️  Missing in TypeScript ({len(prices_result['missing_in_ts'])}):")
            for col in prices_result['missing_in_ts']:
                print(f"      - {col}")
        
        if prices_result['extra_in_ts']:
            print(f"\n   ⚠️  Extra in TypeScript ({len(prices_result['extra_in_ts'])}):")
            for col in prices_result['extra_in_ts']:
                print(f"      - {col}")
        
        if prices_result['match']:
            print("   ✅ Schema matches!")
    
    print("\n" + "=" * 60)
    
    # Summary
    total_issues = len(offers_result.get('missing_in_ts', [])) + \
                   len(offers_result.get('extra_in_ts', [])) + \
                   len(prices_result.get('missing_in_ts', [])) + \
                   len(prices_result.get('extra_in_ts', []))
    
    if total_issues == 0:
        print("\n✅ All schemas match TypeScript types!")
    else:
        print(f"\n⚠️  Found {total_issues} schema drift issues")
        print("\nRun with --fix to auto-generate updated TypeScript types")

if __name__ == "__main__":
    main()
