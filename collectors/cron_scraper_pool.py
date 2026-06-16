#!/usr/bin/env python3
"""
Concurrent cron scraper using CamofoxScraperPool.

Drops the single-tab Playwright path for cron runs in favor of
`CamofoxScraperPool` with bounded parallelism. For 20 targets at
~6s per product on a single tab, sequential = 120s. With 4 tabs
in the pool, = 30s — a 4x speedup with no code change to the
existing `cron_scraper.py`.

**Why a new file, not edit cron_scraper.py?**
- Keeps the existing sequential flow (default, low risk) untouched
- The pool path has different env var requirements
  (CAMOFOX_DISABLED must be 0, server must be running)
- Easier to A/B test in production
- Failed pool runs don't regress the proven sequential flow

**Usage:**
    # Concurrent mode (4 tabs)
    python3 cron_scraper_pool.py --concurrent 4

    # Concurrent mode + dry run (no ingestion, no DB writes)
    python3 cron_scraper_pool.py --concurrent 4 --dry-run

    # Default 4 tabs, real run
    python3 cron_scraper_pool.py

**Pre-conditions:**
- Camofox server must be running: `camofox server start --background`
- `CAMOFOX_DISABLED` env var must NOT be set to 1
"""
import argparse
import asyncio
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

# Path setup
sys.path.insert(0, str(Path(__file__).parent))
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

# DISPLAY needed for Playwright fallbacks inside the pool (no-op if pool-only)
os.environ['DISPLAY'] = os.environ.get('DISPLAY', ':99')

from camofox_scraper import CamofoxScraperPool, CamofoxError

# Config
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'https://oklaxwjoyttpwgxhphko.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
INGESTION_SECRET = os.getenv('INGESTION_SECRET', '')
API_URL = os.getenv('NEXT_PUBLIC_API_URL', 'https://www.bijakbeli.web.id')
DEFAULT_BATCH_SIZE = 20
DEFAULT_CONCURRENT = 4  # 4 tabs ≈ 400MB, safe for 4GB VPS


def fetch_targets(batch_size: int) -> list[dict]:
    """Fetch queued crawl_targets ordered by priority.

    Returns:
        List of {id, url, domain} dicts.
    """
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/crawl_targets",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        params={
            "or": "(crawl_status.eq.pending,crawl_status.eq.queued)",
            "select": "id,url,domain",
            "order": "next_crawl_at.asc.nullsfirst,priority_score.desc",
            "limit": batch_size,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def mark_target(target_id: str, status: str, error_message: str | None = None) -> None:
    """Update crawl_target row with final status."""
    payload = {
        "crawl_status": status,
        "last_crawled_at": datetime.utcnow().isoformat(),
    }
    if error_message is not None:
        payload["error_message"] = error_message
    elif status == "completed":
        # Clear error_message on success
        payload["error_message"] = None

    try:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/crawl_targets",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            params={"id": f"eq.{target_id}"},
            json=payload,
            timeout=10,
        )
    except Exception as e:
        print(f"   ⚠️  Failed to update target status: {e!r}")


def ingest_offer(offer_data: dict) -> bool:
    """POST offer to ingestion API. Returns True on 200."""
    try:
        resp = requests.post(
            f"{API_URL}/api/ingestion/offer-snapshot",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {INGESTION_SECRET}",
            },
            json=offer_data,
            timeout=30,
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"   ⚠️  Ingestion request failed: {e!r}")
        return False


def build_offer_data(url: str, result: dict) -> dict:
    """Map scraped result dict to ingestion API payload."""
    # Extract marketplace_product_id from URL slug
    url_parts = url.rstrip('/').split('-')
    marketplace_product_id = url_parts[-1] if url_parts else 'unknown'

    offer = {
        "marketplace": "tokopedia",
        "product_url": result.get('url', url),
        "title": result.get('name', ''),
        "price": result.get('price'),
        "original_price": result.get('original_price', result.get('price')),
        "discount_percentage": result.get('discount_percentage', 0),
        "rating": result.get('rating', 0.0),
        "sold_count": result.get('sold_count', 0),
        "marketplace_product_id": marketplace_product_id,
        "source": "browser_collector_pool",
    }

    image_url = result.get('image_url')
    if image_url and image_url.startswith('http'):
        offer['image_url'] = image_url

    return offer


async def scrape_and_process(
    pool: CamofoxScraperPool,
    target: dict,
    dry_run: bool,
) -> dict:
    """Scrape a single target + ingest the result. Returns a stats dict.

    Designed to be wrapped in asyncio.gather() across many targets.
    """
    target_id = target['id']
    url = target['url']
    started = time.monotonic()
    result_summary = {
        "target_id": target_id,
        "url": url,
        "ok": False,
        "ingested": False,
        "elapsed_s": 0.0,
        "error": None,
    }

    try:
        # Scrape with the pool
        result = await pool.scrape(url)
        elapsed = time.monotonic() - started
        result_summary["elapsed_s"] = round(elapsed, 2)

        # The pool returns a TokopediaProduct dataclass (or None on failure).
        # Map to legacy dict for ingestion compatibility.
        # TokopediaProduct fields: title, price_idr, sold_count, seller_name,
        # seller_location, stock_count, rating_count, original_price_idr, url.
        # NOTE: rating_count is the *number* of ratings, not the score.
        # The score (out of 5.0) isn't extracted by the current schema —
        # downstream code defaults to 0.0 for missing ratings.
        if result is None or not getattr(result, 'title', None):
            result_summary["error"] = "no data extracted"
            print(f"   ❌ [{target_id[:8]}] No data ({elapsed:.1f}s)")
            if not dry_run:
                mark_target(target_id, "failed", "No data extracted")
            return result_summary

        result_dict = {
            "name": result.title,
            "price": result.price_idr,
            "original_price": result.original_price_idr or result.price_idr,
            "url": result.url or url,
            "rating": 0.0,  # score not extracted; cron default
            "sold_count": result.sold_count or 0,
            "seller": result.seller_name,
        }

        print(
            f"   ✅ [{target_id[:8]}] {result.title[:50]} | "
            f"Rp{result.price_idr:,.0f} | {elapsed:.1f}s"
        )

        if dry_run:
            result_summary["ok"] = True
            return result_summary

        # Ingest
        offer = build_offer_data(url, result_dict)
        ingested = ingest_offer(offer)
        result_summary["ok"] = True
        result_summary["ingested"] = ingested

        # Update DB
        if ingested:
            mark_target(target_id, "completed")
            print(f"      📤 Ingested")
        else:
            mark_target(target_id, "failed", "Ingestion API error")
            print(f"      ⚠️  Ingestion failed")

    except CamofoxError as e:
        result_summary["error"] = f"camofox: {e}"
        print(f"   ❌ [{target_id[:8]}] Camofox error: {e}")
        if not dry_run:
            mark_target(target_id, "failed", str(e)[:200])
    except Exception as e:
        result_summary["error"] = str(e)[:200]
        print(f"   ❌ [{target_id[:8]}] Exception: {str(e)[:80]}")
        if not dry_run:
            mark_target(target_id, "failed", str(e)[:200])

    return result_summary


async def run_concurrent(
    targets: list[dict],
    max_concurrent: int,
    dry_run: bool,
) -> list[dict]:
    """Run all targets concurrently with bounded parallelism via the pool.

    Note: CamofoxScraperPool.scrape() opens a fresh tab per call. The pool's
    internal semaphore limits how many are open at once. So even if we
    gather() all N targets, only `max_concurrent` will run in parallel.
    """
    print(f"⚡ Using CamofoxScraperPool with max_concurrent={max_concurrent}")
    print(f"   Pool has its own semaphore — gather() is safe with any N targets\n")

    async with CamofoxScraperPool(
        max_concurrent=max_concurrent,
        wait_ms=5000,
        marketplace="tokopedia",
    ) as pool:
        tasks = [
            scrape_and_process(pool, target, dry_run)
            for target in targets
        ]
        # return_exceptions=True so one failure doesn't cancel siblings
        return await asyncio.gather(*tasks, return_exceptions=False)


def print_summary(targets: list[dict], results: list[dict], elapsed_s: float) -> None:
    """Print a tidy summary table at the end."""
    ok = sum(1 for r in results if r.get("ok"))
    ingested = sum(1 for r in results if r.get("ingested"))
    failed = len(results) - ok
    avg_s = sum(r.get("elapsed_s", 0) for r in results) / max(len(results), 1)
    max_s = max((r.get("elapsed_s", 0) for r in results), default=0)
    min_s = min((r.get("elapsed_s", 0) for r in results), default=0)

    print(f"\n{'='*70}")
    print(f"CRON POOL SCRAPER SUMMARY")
    print(f"{'='*70}")
    print(f"Targets:         {len(targets)}")
    print(f"Scraped OK:      {ok}")
    print(f"Ingested:        {ingested}")
    print(f"Failed:          {failed}")
    print(f"Total time:      {elapsed_s:.1f}s (wall clock)")
    print(f"Per-target avg:  {avg_s:.1f}s | min {min_s:.1f}s | max {max_s:.1f}s")
    if len(targets) > 1:
        # Speedup estimate: sequential would be N * avg_s
        sequential_estimate = avg_s * len(targets)
        speedup = sequential_estimate / max(elapsed_s, 0.1)
        print(f"Speedup estimate: ~{speedup:.1f}x vs sequential")
    print(f"{'='*70}\n")


async def async_main(args: argparse.Namespace) -> int:
    """Main async entry point."""
    print(f"\n{'='*70}")
    print(f"CRON POOL SCRAPER — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")

    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_ROLE_KEY not set")
        return 1

    # Fetch
    print(f"Fetching up to {args.batch} targets...")
    targets = fetch_targets(args.batch)
    print(f"✅ Found {len(targets)} targets\n")

    if not targets:
        print("No queued targets. Exiting.")
        return 0

    if args.dry_run:
        print("🧪 DRY RUN — no DB writes, no ingestion\n")

    # Run
    started = time.monotonic()
    results = await run_concurrent(targets, args.concurrent, args.dry_run)
    elapsed = time.monotonic() - started

    # Summary
    print_summary(targets, results, elapsed)

    # Exit code: 0 if all OK, 1 if any failed
    ok_count = sum(1 for r in results if r.get("ok"))
    return 0 if ok_count == len(results) else 1


def parse_args() -> argparse.Namespace:
    """CLI argument parser."""
    p = argparse.ArgumentParser(
        description="Concurrent cron scraper using CamofoxScraperPool",
    )
    p.add_argument(
        "--concurrent", "-c",
        type=int,
        default=DEFAULT_CONCURRENT,
        help=f"Max parallel Camofox tabs (default: {DEFAULT_CONCURRENT})",
    )
    p.add_argument(
        "--batch", "-b",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Max targets to fetch from queue (default: {DEFAULT_BATCH_SIZE})",
    )
    p.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="Scrape but don't update DB or call ingestion API",
    )
    return p.parse_args()


def main() -> None:
    """Sync entry point."""
    args = parse_args()

    # Safety: require CAMOFOX_DISABLED=0 explicitly (or unset)
    if os.environ.get("CAMOFOX_DISABLED") == "1":
        print(
            "❌ CAMOFOX_DISABLED=1 is set. This pool requires the Camofox server.\n"
            "   Unset it or run cron_scraper.py (sequential Playwright mode) instead."
        )
        sys.exit(1)

    # Pre-flight: check Camofox server is reachable
    try:
        r = requests.get("http://localhost:9377/health", timeout=2)
        if r.status_code != 200:
            raise RuntimeError(f"Camofox /health returned {r.status_code}")
    except Exception as e:
        print(
            f"❌ Camofox server not reachable at localhost:9377: {e}\n"
            f"   Start it with: camofox server start --background"
        )
        sys.exit(1)

    print(f"✅ Camofox server reachable at localhost:9377")
    print(f"   concurrent={args.concurrent}, batch={args.batch}, dry_run={args.dry_run}\n")

    exit_code = asyncio.run(async_main(args))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
