#!/usr/bin/env python3
"""
BijakBeli Cron Watchdog — checks if scheduled crons are running.

Queries Supabase `ingestion_logs` table for the 3 expected cron jobs:
  - cron_alerts: should run daily 00:00 UTC
  - cron_prices: should run daily 06:00 UTC
  - cron_digest: should run weekly Monday 09:00 UTC

For each, compares last entry to expected schedule. Emits a clear
report. Designed to be run from cronjob (Hermes scheduler) — output
is human-readable text suitable for Telegram delivery.

Usage:
  python3 monitor/cron_watchdog.py [--days 7] [--quiet]

Exit codes:
  0 = all crons healthy (or no schedule expected yet)
  1 = at least one cron is stale or failing
  2 = could not connect to Supabase (auth/network failure)
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL",
    "https://oklaxwjoyttpwgxhphko.supabase.co",
)


def load_env():
    """Load SUPABASE_SERVICE_ROLE_KEY from .env.local if not in env."""
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if key:
        return key
    env_file = Path(__file__).parent.parent / ".env.local"
    if not env_file.exists():
        return None
    for line in env_file.read_text().splitlines():
        line = line.strip()
        # Parse KEY=VALUE without triggering redact on the value itself
        eq = line.find("=")
        if eq == -1:
            continue
        name, _, value = line.partition("=")
        if name.strip() == "SUPABASE_SERVICE_ROLE_KEY":
            return value.strip().strip('"').strip("'")
    return None


def query_recent_cron_logs(service_key: str, days: int = 7) -> list[dict]:
    """Fetch last N days of cron_* entries from ingestion_logs."""
    since = (datetime.now(timezone.utc) - timedelta(days=days))
    # PostgREST date filter: use Z-suffix ISO 8601 (URL-safe, no microseconds)
    since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")
    url = (
        f"{SUPABASE_URL}/rest/v1/ingestion_logs"
        f"?select=id,log_status,started_at,completed_at,items_processed,"
        f"items_failed,error_message,metadata"
        f"&started_at=gte.{since_str}"
        f"&order=started_at.desc"
        f"&limit=200"
    )
    req = urllib.request.Request(
        url,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        rows = json.loads(r.read().decode())

    # Filter to cron_* only and bucket by job_name
    cron_rows = []
    for row in rows:
        meta = row.get("metadata") or {}
        job_name = meta.get("job_name")
        if job_name and job_name.startswith("cron_"):
            cron_rows.append({**row, "job_name": job_name})
    return cron_rows


# Expected cron schedule (UTC). cron_digest is weekly Monday so we
# allow 8 days of slack before flagging it stale.
CRON_EXPECTATIONS = {
    "cron_alerts": {"period_hours": 24, "grace_hours": 4, "desc": "daily 00:00 UTC"},
    "cron_prices": {"period_hours": 24, "grace_hours": 4, "desc": "daily 06:00 UTC"},
    "cron_digest": {"period_hours": 168, "grace_hours": 48, "desc": "weekly Mon 09:00 UTC"},
}


def evaluate(rows: list[dict]) -> list[dict]:
    """For each expected cron, find last run and decide if stale/failing."""
    now = datetime.now(timezone.utc)
    by_job: dict[str, list[dict]] = {}
    for r in rows:
        by_job.setdefault(r["job_name"], []).append(r)

    report = []
    for job_name, exp in CRON_EXPECTATIONS.items():
        entries = by_job.get(job_name, [])
        if not entries:
            report.append({
                "job": job_name,
                "status": "🔴 NEVER_RAN",
                "desc": exp["desc"],
                "last": "—",
                "last_status": "—",
                "items": "—",
                "failed": "—",
                "detail": f"No entry in last {exp['period_hours']}h. Cron route may be misconfigured or Vercel Cron not firing.",
            })
            continue

        last = entries[0]
        last_at = datetime.fromisoformat(last["started_at"].replace("Z", "+00:00"))
        age_hours = (now - last_at).total_seconds() / 3600
        threshold = exp["period_hours"] + exp["grace_hours"]
        last_status = last.get("log_status", "unknown")
        items = last.get("items_processed", 0)
        failed = last.get("items_failed", 0)
        err = last.get("error_message") or ""

        # Stale check
        if age_hours > threshold:
            status = "🔴 STALE"
            detail = f"Last ran {age_hours:.1f}h ago, expected within {threshold}h."
        elif last_status == "failed":
            status = "🔴 FAILED"
            detail = f"Last run failed. Error: {err[:120]}"
        elif last_status == "partial":
            status = "🟡 PARTIAL"
            detail = f"Last run partially succeeded ({failed} failures). Error: {err[:80]}"
        elif last_status == "running":
            status = "🟡 RUNNING"
            detail = "Last entry still marked running (may be in-flight or stuck)."
        elif last_status == "success":
            status = "🟢 OK"
            detail = f"Last run healthy ({items} items processed)."
        else:
            status = "🟡 UNKNOWN"
            detail = f"Unrecognized status: {last_status}"

        report.append({
            "job": job_name,
            "status": status,
            "desc": exp["desc"],
            "last": last_at.strftime("%Y-%m-%d %H:%M UTC"),
            "last_status": last_status,
            "items": items,
            "failed": failed,
            "detail": detail,
            "age_hours": round(age_hours, 1),
        })
    return report


def format_report(report: list[dict], days: int) -> str:
    lines = [
        f"🔍 **BijakBeli Cron Watchdog**",
        f"Scan: last {days} days · Now: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
    ]
    red_count = sum(1 for r in report if "🔴" in r["status"])
    yellow_count = sum(1 for r in report if "🟡" in r["status"])
    green_count = sum(1 for r in report if "🟢" in r["status"])
    lines.append(
        f"Summary: 🟢 {green_count} · 🟡 {yellow_count} · 🔴 {red_count}"
    )
    lines.append("")
    for r in report:
        lines.append(f"### {r['status']} `{r['job']}`")
        lines.append(f"  Schedule: {r['desc']}")
        lines.append(f"  Last run: {r['last']} ({r.get('age_hours', '—')}h ago)")
        lines.append(f"  Last status: `{r['last_status']}` — items={r['items']} failed={r['failed']}")
        lines.append(f"  → {r['detail']}")
        lines.append("")
    if red_count == 0 and yellow_count == 0:
        lines.append("✅ All scheduled crons healthy.")
    elif red_count > 0:
        lines.append(f"⚠️  **{red_count} cron(s) need attention.** Check Vercel dashboard and `ingestion_logs`.")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--quiet", action="store_true",
                        help="Suppress OK output (only print when issues found)")
    args = parser.parse_args()

    key = load_env()
    if not key:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY not set and not found in .env.local", file=sys.stderr)
        return 2

    try:
        rows = query_recent_cron_logs(key, days=args.days)
    except urllib.error.HTTPError as e:
        print(f"ERROR: Supabase returned HTTP {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
        return 2
    except Exception as e:
        print(f"ERROR: Failed to query Supabase: {type(e).__name__}: {e}", file=sys.stderr)
        return 2

    report = evaluate(rows)

    red_count = sum(1 for r in report if "🔴" in r["status"])
    yellow_count = sum(1 for r in report if "🟡" in r["status"])

    if args.quiet and red_count == 0 and yellow_count == 0:
        return 0

    print(format_report(report, args.days))
    return 1 if red_count > 0 else 0


if __name__ == "__main__":
    sys.exit(main())