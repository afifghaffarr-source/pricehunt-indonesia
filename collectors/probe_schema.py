#!/usr/bin/env python3
"""Tighter schema probe — uses real column names so PostgREST 400s
are only for true 'table missing' cases."""
import os, sys, requests
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

SUPA = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

def exists(path, real_col="id"):
    r = requests.get(f"{SUPA}{path}", headers=H,
                     params={"select": real_col, "limit": 1}, timeout=10)
    return r.status_code

print(f"🔗 {SUPA}\n")

# Use real columns: 200=exists, 404=missing
print("TABLES (200=exists, 404=missing)")
print("-" * 50)
checks = [
    ("admin_users",        "/rest/v1/admin_users",        "user_id"),
    ("admin_audit_log",    "/rest/v1/admin_audit_log",    "id"),
    ("crawl_targets",      "/rest/v1/crawl_targets",      "id"),
    ("products",           "/rest/v1/products",           "id"),
    ("rate_limits",        "/rest/v1/rate_limits",        "id"),
    ("offers",             "/rest/v1/offers",             "id"),
    ("price_snapshots",    "/rest/v1/price_snapshots",    "id"),
    ("marketplaces",       "/rest/v1/marketplaces",       "id"),
]
for name, path, col in checks:
    s = exists(path, col)
    flag = "EXISTS" if s == 200 else "MISSING" if s == 404 else f"ERR-{s}"
    print(f"  {name:22s} : {flag}")

# Sanity: count rows in each known table
print("\nROW COUNTS (capped at 1000)")
print("-" * 50)
for name, path, col in checks:
    if exists(path, col) == 200:
        r = requests.get(f"{SUPA}{path}", headers=H,
                         params={"select": col, "limit": 1000}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            print(f"  {name:22s} : {len(data):5d} rows" + (" (capped)" if len(data)==1000 else ""))
        else:
            print(f"  {name:22s} : COUNT-FAIL ({r.status_code})")
    else:
        print(f"  {name:22s} : (skipped — table missing)")

# Migration 124: is raw_hash the only thing missing?
print("\nMIGRATION 124 — STILL-MISSING COLUMNS (only raw_hash should be left)")
print("-" * 50)
r = requests.get(f"{SUPA}/rest/v1/price_snapshots", headers=H,
                 params={"select": "raw_hash", "limit": 1}, timeout=10)
print(f"  price_snapshots.raw_hash  : {'EXISTS' if r.status_code==200 else 'MISSING'}")

print("\n✅ Probe done.")
