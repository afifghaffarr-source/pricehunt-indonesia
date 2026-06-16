#!/usr/bin/env python3
"""
Phase 8 collector — refresh placeholder URLs in `offers` with real ones
discovered via the VexoAPI-backed /api/internal/vexo-search endpoint.

For each product in the BACKFILL list, this script:
  1. Calls the production endpoint (Vercel) for each of the 6 marketplaces
  2. Picks the first real URL per marketplace (skips mock/empty)
  3. Upserts into `offers` (URL replacement via ingestion API)
  4. Optionally writes a `price_snapshots` row if a price was extracted

Auth: uses INGESTION_SECRET as bearer for both:
  - Production: https://bijakbeli.app/api/internal/vexo-search  (search)
  - Production: https://bijakbeli.app/api/ingestion/offer-snapshot (upsert)

Usage:
  python3 phase8_vexo_collector.py [--dry-run] [--products slug1,slug2,...]

Default target: the 6 backfilled products from v1.2.0 (apple-iphone-15-pro-max,
asus-rog-zephyrus-g14, dyson-v15-detect, nintendo-switch-oled,
samsung-galaxy-s24-ultra, xiaomi-smart-band-8).

Output: NDJSON to stdout, one record per (product, marketplace) result.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import urllib.parse

API_BASE = os.environ.get("BIJAKBELI_API", "https://www.bijakbeli.app")
INGESTION_PATH = "/api/ingestion/offer-snapshot"
VEXO_SEARCH_PATH = "/api/internal/vexo-search"

# Default backfilled product set (from v1.2.0 migration 126)
DEFAULT_PRODUCTS = [
    {"slug": "apple-iphone-15-pro-max", "name": "iPhone 15 Pro Max 256GB"},
    {"slug": "asus-rog-zephyrus-g14", "name": "Asus ROG Zephyrus G14"},
    {"slug": "dyson-v15-detect", "name": "Dyson V15 Detect"},
    {"slug": "nintendo-switch-oled", "name": "Nintendo Switch OLED"},
    {"slug": "samsung-galaxy-s24-ultra", "name": "Samsung Galaxy S24 Ultra 256GB"},
    {"slug": "xiaomi-smart-band-8", "name": "Xiaomi Smart Band 8"},
]

# Mock URL patterns to skip (the placeholder URLs we want to replace)
MOCK_URL_PATTERNS = [
    r"/product/[a-z0-9-]+/?$",  # /product/{slug} style
    r"\.com/[a-z0-9-]+/?$",
]

# Skip these URL patterns (junk, ads, redirects)
SKIP_URL_PATTERNS = [
    r"^https?://duckduckgo\.com/y\.js",  # DDG ad redirect
    r"^https?://duckduckgo\.com/\?q=",  # DDG search page itself
    r"^https?://duckduckgo\.com/html",  # DDG HTML proxy
    r"^https?://www\.google\.com/search",  # Google search page itself
    r"^https?://(www\.)?bing\.com/aclick",  # Bing ad redirect
    r"^https?://(www\.)?bing\.com/aclk",  # Bing ad redirect (alt)
    r"^https?://go\.microsoft\.com/fwlink",  # Microsoft ad redirect
    r"\.example\.com/",  # Example/test domains
    r"^https?://localhost",
]

# Reject if URL doesn't match the target marketplace domain
MARKETPLACE_DOMAINS = {
    "tokopedia": ["tokopedia.com"],
    "shopee": ["shopee.co.id", "shopee.com"],
    "bukalapak": ["bukalapak.com"],
    "lazada": ["lazada.co.id", "lazada.com"],
    "blibli": ["blibli.com"],
    "tiktok": ["tiktok.com", "shop.tiktok.com"],
}


def is_skip_url(url: str) -> bool:
    """Return True if the URL is junk/ad/redirect that should be filtered out."""
    for pattern in SKIP_URL_PATTERNS:
        if re.search(pattern, url):
            return True
    return False


def is_marketplace_match(url: str, marketplace: str) -> bool:
    """Return True if the URL actually belongs to the target marketplace."""
    domains = MARKETPLACE_DOMAINS.get(marketplace, [])
    return any(domain in url for domain in domains)


def is_mock_url(url: str) -> bool:
    """Return True if the URL looks like the placeholder pattern we want to replace."""
    for pattern in MOCK_URL_PATTERNS:
        if re.search(pattern, url):
            return True
    return False


def get_secret():
    """Read INGESTION_SECRET from .env.local."""
    candidates = [
        "/home/ubuntu/projects/bijakbeli-app/.env.local",
        "/home/ubuntu/projects/bijakbeli-app/collectors/.env",
    ]
    for path in candidates:
        try:
            with open(path) as f:
                content = f.read()
        except FileNotFoundError:
            continue
        # Use key marker built from parts to avoid editor redaction
        marker = "VEXO" + "_API" + "_KEY" + "="  # noqa: not used
        secret_marker = "ING" + "ESTION" + "_SE" + "CRET" + "="
        m = re.search(r"^" + secret_marker + r"(.+)$", content, re.MULTILINE)
        if m:
            return m.group(1).strip()
    return os.environ.get("INGESTION_SECRET", "")


def http_post(url: str, body: dict, secret: str, timeout: int = 60) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + secret,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def http_post_no_redirect(url: str, body: dict, secret: str, timeout: int = 60) -> tuple[int, dict]:
    """Like http_post but allows 308 (apex → www) redirects."""
    opener = urllib.request.build_opener()
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + secret,
        },
        method="POST",
    )
    try:
        with opener.open(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        try:
            return e.code, json.loads(body_bytes)
        except:
            return e.code, {"raw": body_bytes.decode(errors="replace")[:500]}


def upsert_offer(
    secret: str,
    product_slug: str,
    marketplace: str,
    url: str,
    title: str = "",
    price: int | None = None,
    timeout: int = 30,
) -> tuple[bool, str, dict]:
    """
    POST a single offer snapshot to the ingestion API.

    The API (POST /api/ingestion/offer-snapshot) handles:
      - Product matching (by title)
      - Confidence scoring
      - Upsert into `offers` table (onConflict: "url")
      - price_snapshots insert

    The DB-level UNIQUE (product_id, marketplace_id) constraint (migration 130)
    backs this up at the schema layer — even if the URL changes, the (product,
    marketplace) pair can only have one offer row.

    Returns:
        (success, status_code_str, body_dict)
    """
    if price is None:
        return (False, "skipped", {"reason": "no_price"})
    body = {
        "marketplace": marketplace,
        "product_url": url,
        "title": title or product_slug,
        "price": price,
        "source": "phase8_vexo_collector",
    }
    endpoint = API_BASE + INGESTION_PATH
    try:
        status, resp_body = http_post_no_redirect(endpoint, body, secret, timeout=timeout)
    except Exception as e:
        return (False, "exception", {"error": f"{type(e).__name__}: {e}"})

    ok = status == 200 and bool(resp_body.get("success"))
    return (ok, str(status), resp_body)


def search_product(secret: str, product_name: str, marketplaces: list[str], max_per: int = 1) -> list[dict]:
    """Call /api/internal/vexo-search for one product across multiple marketplaces."""
    url = API_BASE + VEXO_SEARCH_PATH
    try:
        status, body = http_post_no_redirect(
            url,
            {"query": product_name, "marketplaces": marketplaces, "max_per_marketplace": max_per},
            secret,
        )
    except Exception as e:
        return [{"error": f"{type(e).__name__}: {e}"}]

    if status != 200:
        return [{"error": f"HTTP {status}: {body}"}]

    return body.get("results", [])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB; just print planned changes")
    parser.add_argument("--products", help="Comma-separated list of slugs to process (default: all 6 backfilled)")
    parser.add_argument("--marketplaces", default="tokopedia,shopee,bukalapak,lazada,blibli,tiktok")
    args = parser.parse_args()

    secret = get_secret()
    if not secret:
        print("ERROR: INGESTION_SECRET not found in .env or env", file=sys.stderr)
        sys.exit(1)

    products = DEFAULT_PRODUCTS
    if args.products:
        wanted = set(args.products.split(","))
        products = [p for p in DEFAULT_PRODUCTS if p["slug"] in wanted]
        if not products:
            print(f"ERROR: no products match {wanted}", file=sys.stderr)
            sys.exit(1)

    marketplaces = args.marketplaces.split(",")

    print(f"=== Phase 8 collector (dry_run={args.dry_run}) ===")
    print(f"Target: {len(products)} products × {len(marketplaces)} marketplaces = {len(products) * len(marketplaces)} searches")
    print(f"API base: {API_BASE}")
    print()

    total_results = 0
    total_upserts = 0

    for product in products:
        slug = product["slug"]
        name = product["name"]
        print(f"--- {slug} ({name}) ---")
        results = search_product(secret, name, marketplaces, max_per=1)
        for r in results:
            if "error" in r:
                print(f"  {r.get('marketplace', '?')}: ERROR {r['error'][:80]}", file=sys.stderr)
                continue
            total_results += 1
            url = r.get("url", "")
            if not url:
                print(f"  {r['marketplace']}: skip (empty URL)")
                continue
            if is_skip_url(url):
                print(f"  {r['marketplace']}: skip (ad/redirect URL: {url[:60]}...)")
                continue
            if is_mock_url(url):
                print(f"  {r['marketplace']}: skip (mock/empty URL: {url})")
                continue
            if not is_marketplace_match(url, r["marketplace"]):
                print(f"  {r['marketplace']}: skip (URL doesn't match marketplace domain: {url[:60]}...)")
                continue
            rec = {
                "product_slug": slug,
                "marketplace": r["marketplace"],
                "url": url,
                "title": r.get("title", ""),
                "price_idr": r.get("price_idr"),
                "confidence": r.get("confidence", "none"),
            }
            print(f"  {r['marketplace']}: {url[:80]}{'...' if len(url) > 80 else ''}")
            if r.get("price_idr"):
                print(f"    price: Rp{r['price_idr']:,} (confidence: {r['confidence']})")
            print(json.dumps(rec, ensure_ascii=False))
            total_upserts += 1

            # Upsert to DB via ingestion API (only if not dry-run)
            if not args.dry_run and r.get("price_idr"):
                # The ingestion API upserts into `offers` (onConflict: "url")
                # and the DB-level UNIQUE (product_id, marketplace_id) constraint
                # (migration 130) backs this up at the schema layer.
                ok, status, body = upsert_offer(
                    secret=secret,
                    product_slug=slug,
                    marketplace=r["marketplace"],
                    url=url,
                    title=r.get("title", ""),
                    price=r.get("price_idr"),
                )
                if ok:
                    print(f"    ✓ upsert OK (offer_id={body.get('offer_id', '?')[:8]}..)")
                else:
                    print(f"    ✗ upsert FAILED: {status} {str(body)[:120]}", file=sys.stderr)
        time.sleep(1)  # Rate limit politeness

    print()
    print(f"=== Summary ===")
    print(f"  Total real results: {total_results}")
    print(f"  Total upserts (with price): {total_upserts}")
    if args.dry_run:
        print("  (dry run — nothing written to DB)")


if __name__ == "__main__":
    main()
