#!/usr/bin/env python3
"""Verify the OR filter actually catches 'pending' rows.

Inserts one test row with crawl_status='pending', runs the NEW query,
confirms it shows up, then cleans up. Uses service role to bypass RLS.
"""
import os, sys, requests
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

H = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
     "Content-Type": "application/json", "Prefer": "return=representation"}

# 1. Insert a test 'pending' row
test_url = "https://www.tokopedia.com/search?q=__test_cron_query__"
print("Inserting test row with crawl_status='pending'...")
r = requests.post(f"{SUPABASE_URL}/rest/v1/crawl_targets", headers=H, json={
    "url": test_url, "domain": "tokopedia.com", "crawl_status": "pending",
    "priority_score": 0,
}, timeout=30)
print(f"Insert status: {r.status_code}")
if r.status_code >= 300:
    print(f"❌ {r.text[:300]}")
    sys.exit(1)
row = r.json()[0]
test_id = row['id']
print(f"  → id={test_id}")

# 2. Run the NEW query (with OR)
print("\nRunning NEW query (OR pending,queued)...")
r = requests.get(f"{SUPABASE_URL}/rest/v1/crawl_targets", headers={
    "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"
}, params={
    "or": "(crawl_status.eq.pending,crawl_status.eq.queued)",
    "select": "id,url,crawl_status", "limit": 50,
}, timeout=30)
data = r.json()
found = [t for t in data if t['id'] == test_id]
print(f"  → {len(data)} total returned, our test row present: {len(found)==1}")

# 3. Run the OLD query (queued only) to confirm it MISSES pending
print("\nRunning OLD query (queued only)...")
r = requests.get(f"{SUPABASE_URL}/rest/v1/crawl_targets", headers={
    "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"
}, params={
    "crawl_status": "eq.queued",
    "select": "id,url,crawl_status", "limit": 50,
}, timeout=30)
data = r.json()
found = [t for t in data if t['id'] == test_id]
print(f"  → {len(data)} total returned, our test row present: {len(found)==1}")
print(f"  (should be False — old query misses pending rows)")

# 4. Cleanup
print(f"\nCleaning up test row {test_id}...")
r = requests.delete(f"{SUPABASE_URL}/rest/v1/crawl_targets", headers={
    "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"
}, params={"id": f"eq.{test_id}"}, timeout=30)
print(f"  → delete status: {r.status_code}")

print("\n✅ OR filter works as expected.")
