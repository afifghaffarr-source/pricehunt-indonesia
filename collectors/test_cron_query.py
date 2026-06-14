#!/usr/bin/env python3
"""Dry-run test for cron_scraper.py query change.

Loads .env.local, makes the EXACT same GET request the cron scraper
would make (with the new OR clause), reports how many targets would be
picked up broken down by status. Does NOT modify anything.
"""
import os
import sys
import requests
from pathlib import Path
from collections import Counter
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
BATCH_SIZE = 20

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE creds in .env.local")
    sys.exit(1)

print(f"🔗 Target: {SUPABASE_URL}")
print(f"📦 BATCH_SIZE = {BATCH_SIZE}\n")

# --- Test 1: NEW query (the one we just changed to) ---
print("=" * 60)
print("TEST 1: NEW query (pending OR queued)")
print("=" * 60)
r1 = requests.get(
    f"{SUPABASE_URL}/rest/v1/crawl_targets",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    },
    params={
        "or": "(crawl_status.eq.pending,crawl_status.eq.queued)",
        "select": "id,url,domain,crawl_status,priority_score,next_crawl_at",
        "order": "next_crawl_at.asc.nullsfirst,priority_score.desc",
        "limit": BATCH_SIZE,
    },
    timeout=30,
)
print(f"Status: {r1.status_code}")
if r1.status_code != 200:
    print(f"❌ FAIL: {r1.text[:300]}")
    sys.exit(1)

data_new = r1.json()
print(f"✅ Returned: {len(data_new)} targets")
status_counts = Counter(t.get('crawl_status') for t in data_new)
print(f"Status breakdown: {dict(status_counts)}")

# --- Test 2: OLD query (queued only) — for comparison ---
print()
print("=" * 60)
print("TEST 2: OLD query (queued only) — for comparison")
print("=" * 60)
r2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/crawl_targets",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    },
    params={
        "crawl_status": "eq.queued",
        "select": "id,url,domain,crawl_status,priority_score,next_crawl_at",
        "order": "next_crawl_at.asc.nullsfirst,priority_score.desc",
        "limit": BATCH_SIZE,
    },
    timeout=30,
)
print(f"Status: {r2.status_code}")
data_old = r2.json()
print(f"✅ Returned: {len(data_old)} targets")
old_status_counts = Counter(t.get('crawl_status') for t in data_old)
print(f"Status breakdown: {dict(old_status_counts)}")

# --- Test 3: Row-level totals (no limit) ---
print()
print("=" * 60)
print("TEST 3: Total pending + queued rows in crawl_targets")
print("=" * 60)
r3 = requests.get(
    f"{SUPABASE_URL}/rest/v1/crawl_targets",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    },
    params={
        "or": "(crawl_status.eq.pending,crawl_status.eq.queued)",
        "select": "crawl_status",
        "limit": 1000,  # cap to avoid huge responses
    },
    timeout=30,
)
if r3.status_code == 200:
    all_data = r3.json()
    total_counts = Counter(t.get('crawl_status') for t in all_data)
    print(f"Total pending+queued in DB (capped at 1000): {dict(total_counts)}")
else:
    print(f"⚠️  Could not fetch totals: {r3.status_code}")

# --- Diff summary ---
print()
print("=" * 60)
print("DIFF SUMMARY")
print("=" * 60)
new_ids = {t['id'] for t in data_new}
old_ids = {t['id'] for t in data_old}
added = new_ids - old_ids
print(f"OLD query returned: {len(data_old)}")
print(f"NEW query returns:  {len(data_new)}")
print(f"Net new targets:   {len(added)} (status=pending rows the OLD query missed)")
if added:
    print("\nFirst few newly-picked-up targets (would be crawled now):")
    added_targets = [t for t in data_new if t['id'] in added][:3]
    for t in added_targets:
        print(f"  - {t.get('crawl_status'):8s} | {t.get('domain', '?')[:30]:30s} | {t.get('url', '?')[:60]}")
else:
    print("  (no pending rows in current batch — change is a no-op until pending rows exist)")

print("\n✅ Dry-run complete. No data was modified.")
