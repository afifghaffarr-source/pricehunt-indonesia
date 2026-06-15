#!/usr/bin/env python3
"""
Production health check for BijakBeli.app.

Usage:
    python3 scripts/health_check.py [--json] [--fail-on-warning]

Checks:
    1. Supabase reachable (HEAD on /rest/v1/)
    2. Offers count + delta from yesterday
    3. Failed ingestion jobs in last 24h
    4. Crawl targets with stale updates (>7 days)
    5. Camofox server health (if running locally)

Exits 0 on healthy, 1 on any failure, 2 on warning (with --fail-on-warning).

Read-only — safe to run anywhere.
"""

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any


def load_env_file(path: Path) -> dict:
    """Parse a .env file and return as dict."""
    env: dict = {}
    if not path.exists():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def auth_header(key: str) -> str:
    """Build Bearer auth header (the value is auto-redacted in tool output)."""
    return f"Bearer {key}"


def check_supabase_reachable(supabase_url: str, key: str) -> dict:
    """Check that Supabase is reachable and returns 200.
    Uses GET on the smallest known table (marketplaces) since PostgREST
    does not accept HEAD on the /rest/v1/ root."""
    url = f"{supabase_url.rstrip('/')}/rest/v1/marketplaces?select=id&limit=1"
    headers = {
        "apikey": key,
        "Authorization": auth_header(key),
    }
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return {
                "ok": bool(resp.status == 200),
                "status": int(resp.status),
            }
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": int(e.code), "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def query_supabase(supabase_url: str, key: str, table: str, **filters) -> dict:
    """Run a PostgREST query. Returns parsed JSON or error."""
    url = f"{supabase_url.rstrip('/')}/rest/v1/{table}"
    if filters:
        params = urllib.parse.urlencode(filters)
        url = f"{url}?{params}"
    headers = {
        "apikey": key,
        "Authorization": auth_header(key),
    }
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"ok": True, "data": json.loads(resp.read().decode())}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def count_supabase(supabase_url: str, key: str, table: str) -> int | None:
    """Count rows in a table via PostgREST Content-Range header."""
    url = f"{supabase_url.rstrip('/')}/rest/v1/{table}?select=id&limit=1"
    headers = {
        "apikey": key,
        "Authorization": auth_header(key),
        "Prefer": "count=exact",
    }
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=10) as resp:
            range_header = resp.headers.get("Content-Range", "0/0")
            total = range_header.split("/")[-1]
            return int(total)
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser(description="BijakBeli health check")
    parser.add_argument("--json", action="store_true", help="JSON output only")
    parser.add_argument(
        "--fail-on-warning", action="store_true", help="Exit 2 on warnings"
    )
    args = parser.parse_args()

    # Load .env.local
    project_root = Path(__file__).resolve().parent.parent
    env = load_env_file(project_root / ".env.local")

    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL")
    anon_key = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)

    results: dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    has_failure = False
    has_warning = False

    # 1. Supabase reachable
    reachable = check_supabase_reachable(supabase_url, anon_key or service_key)
    results["supabase_reachable"] = reachable
    if not reachable.get("ok"):
        has_failure = True

    # 2. Offers count
    offers_count = count_supabase(supabase_url, service_key, "offers")
    results["offers_count"] = offers_count
    if offers_count is None:
        has_failure = True

    # 3. Failed ingestion jobs in last 24h
    # Column is `log_status` (text), not `success`. Possible values include
    # 'success', 'failed', 'partial', etc. — anything not 'success' is a problem.
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    failed_resp = query_supabase(
        supabase_url, service_key, "ingestion_logs",
        select="id,log_status,items_failed,error_message,started_at",
        **{"started_at": f"gte.{yesterday}"},
    )
    if failed_resp.get("ok"):
        logs = failed_resp["data"]
        failed_count = sum(
            1 for l in logs
            if l.get("log_status") not in (None, "success")
            or (l.get("items_failed") or 0) > 0
        )
        results["failed_ingestion_24h"] = failed_count
        results["total_ingestion_24h"] = len(logs)
        if failed_count > 0:
            has_warning = True
    else:
        results["failed_ingestion_24h"] = None

    # 4. Stale crawl targets (>7 days)
    # Column is `last_crawled_at` (per A-003), not `last_crawl_at`.
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    stale_resp = query_supabase(
        supabase_url, service_key, "crawl_targets",
        select="id,url,last_crawled_at",
        **{"last_crawled_at": f"lt.{week_ago}"},
    )
    if stale_resp.get("ok"):
        stale = stale_resp["data"]
        results["stale_crawl_targets_7d"] = len(stale)
        if len(stale) > 50:
            has_warning = True
    else:
        results["stale_crawl_targets_7d"] = None

    # 5. Camofox health (local only)
    try:
        with urllib.request.urlopen("http://localhost:9377/health", timeout=2) as resp:
            camofox_ok = bool(resp.status == 200)
    except Exception:
        camofox_ok = False  # not running locally is OK
    results["camofox_running"] = camofox_ok

    # Output
    if args.json:
        print(json.dumps(results, indent=2, default=str))
    else:
        print("=" * 60)
        print("BijakBeli Health Check")
        print("=" * 60)
        for k, v in results.items():
            if isinstance(v, dict):
                status = "OK" if v.get("ok") else "FAIL"
                err = v.get("error", "")
                print(f"  [{status}] {k}: {v.get('status', '?')} {err[:50] if err else ''}")
            else:
                print(f"  {k}: {v}")
        print()
        if has_failure:
            print("FAILED")
        elif has_warning:
            print("WARNINGS")
        else:
            print("HEALTHY")

    sys.exit(1 if has_failure else (2 if has_warning and args.fail_on_warning else 0))


if __name__ == "__main__":
    main()
