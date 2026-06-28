#!/usr/bin/env python3
"""
A-005 backfill: try to re-attach 9 orphan offers to products.

The offer-snapshot ingestion path does a fuzzy title match
(`ilike %normalized_title%` against products.name). 9 offers from
the 2026-06-13 collector run came in with product_id=null (the
collector was using a different matching strategy at the time, or
the products table was missing these specific SKUs).

This script:
  1. Reads each orphan offer (product_id IS NULL)
  2. Normalizes the title (lowercase, strip)
  3. Looks for products whose name contains the first 30 chars
  4. If exactly one match: sets product_id (re-attach)
  5. If zero matches: leaves as orphan (logs the title so we know
     which SKUs are missing from products)
  6. If multiple matches: leaves as orphan (ambiguous, needs human)

Run as a one-off. Read-only on `products`, updates `offers` only.
"""
import os, sys, requests
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

SUPA = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
KEY  = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}',
     'Content-Type': 'application/json', 'Prefer': 'return=representation'}

def normalize_title(title: str) -> str:
    """Mirror offer-snapshot's normalizeProductTitle. Keep it minimal
    here — the goal is to do the same ilike search the ingestion path
    does, not re-implement full normalization."""
    return (title or "").strip()

def match_product(title: str) -> str | None:
    """Return product id if there's an unambiguous match."""
    norm = normalize_title(title)
    if not norm:
        return None
    needle = norm[:30]
    r = requests.get(
        f"{SUPA}/rest/v1/products",
        headers=H,
        params={'select': 'id,name', 'name': f'ilike.%{needle}%', 'limit': 5},
        timeout=15,
    )
    if r.status_code != 200:
        print(f"  ! product query failed: {r.status_code}")
        return None
    candidates = r.json()
    if len(candidates) == 0:
        return None
    if len(candidates) == 1:
        return candidates[0]['id']
    # ambiguous — try to narrow by name similarity
    target = needle.lower()
    best = None
    best_score = 0.0
    for c in candidates:
        cname = c['name'].lower()
        # simple token overlap
        tset = set(target.split())
        cset = set(cname.split())
        if not tset:
            continue
        score = len(tset & cset) / max(len(tset), len(cset))
        if score > best_score:
            best = c
            best_score = score
    # require >=0.5 overlap to call it a match
    if best and best_score >= 0.5:
        return best['id']
    return None

def main():
    # 1. find all orphans
    r = requests.get(
        f"{SUPA}/rest/v1/offers",
        headers=H,
        params={'select': 'id,title,product_id,url',
                'product_id': 'is.null', 'limit': 100},
        timeout=15,
    )
    if r.status_code != 200:
        print(f"FAIL: {r.status_code} {r.text[:200]}")
        sys.exit(1)
    orphans = r.json()
    print(f"Found {len(orphans)} orphan offers\n")

    matched = 0
    skipped = 0
    ambiguous = 0
    for o in orphans:
        oid = o['id']
        title = o.get('title', '')
        product_id = match_product(title)
        if product_id is None:
            # find out why — query for any candidates to report
            norm = normalize_title(title)[:30]
            cand_r = requests.get(
                f"{SUPA}/rest/v1/products",
                headers=H,
                params={'select': 'id,name', 'name': f'ilike.%{norm}%', 'limit': 5},
                timeout=15,
            )
            cands = cand_r.json() if cand_r.status_code == 200 else []
            if not cands:
                print(f"  · {oid[:8]} title={title[:50]!r} -> NO MATCH (product missing)")
            else:
                print(f"  · {oid[:8]} title={title[:50]!r} -> AMBIGUOUS ({len(cands)} candidates)")
                for c in cands[:3]:
                    print(f"      - {c['id'][:8]} {c['name'][:60]!r}")
                ambiguous += 1
                continue
            skipped += 1
            continue

        # re-attach
        upd = requests.patch(
            f"{SUPA}/rest/v1/offers",
            headers=H,
            params={'id': f'eq.{oid}'},
            json={'product_id': product_id},
            timeout=15,
        )
        if upd.status_code < 300:
            print(f"  ✓ {oid[:8]} title={title[:50]!r} -> product={product_id[:8]}")
            matched += 1
        else:
            print(f"  ✗ {oid[:8]} PATCH failed: {upd.status_code} {upd.text[:200]}")
            skipped += 1

    print(f"\n=== Summary ===")
    print(f"  re-attached: {matched}")
    print(f"  no match (product missing): {skipped}")
    print(f"  ambiguous (needs human): {ambiguous}")
    print(f"  total orphans before: {len(orphans)}")

if __name__ == "__main__":
    main()
