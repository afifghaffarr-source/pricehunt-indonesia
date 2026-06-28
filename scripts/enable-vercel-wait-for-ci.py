#!/usr/bin/env python3
"""
Manage Vercel deployment protection for pricehunt-indonesia.

NOTE: Vercel's REST API (v1/v9) does NOT expose the "Wait for CI to pass"
toggle programmatically — it's dashboard-only. This script:
  1. Validates the VERCEL_TOKEN can read the project
  2. Prints the exact dashboard URL to toggle the setting
  3. Optionally verifies the setting after manual change (best-effort)

Usage:
    python3 scripts/enable-vercel-wait-for-ci.py            # print dashboard URL
    python3 scripts/enable-vercel-wait-for-ci.py --check    # verify current state
"""
import argparse
import json
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parent.parent / ".env.local"
TEAM = "afif-s-projects5"
PROJECT = "pricehunt-indonesia"
DASHBOARD_URL = f"https://vercel.com/{TEAM}/{PROJECT}/settings/deployment-checks"


def read_token() -> str:
    result = subprocess.run(
        ["grep", "^VERCEL_TOKEN", str(ENV_FILE)],
        capture_output=True, text=True, check=True,
    )
    return result.stdout.strip().split("=", 1)[1]


def api(method: str, path: str, token: str, body=None):
    req = urllib.request.Request(
        f"https://api.vercel.com{path}",
        method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body else None,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def find_project(token: str) -> str | None:
    code, data = api("GET", f"/v9/projects?teamId={TEAM}", token)
    if code != 200:
        return None
    for p in data.get("projects", []):
        if p.get("name") == PROJECT:
            return p.get("id")
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="Just verify current state and exit")
    args = parser.parse_args()

    try:
        token = read_token()
    except Exception as e:
        print(f"❌ VERCEL_TOKEN not in .env.local: {e}")
        sys.exit(1)
    print(f"Token loaded (length {len(token)})")

    project_id = find_project(token)
    if not project_id:
        print(f"❌ Project {PROJECT} not found in team {TEAM}")
        sys.exit(1)
    print(f"Project: {PROJECT} ({project_id})")

    # Read current state (best-effort — waitForCi may not appear in API)
    code, proj = api("GET", f"/v9/projects/{project_id}", token)
    if code == 200:
        current = proj.get("waitForCi")
        print(f"Current waitForCi (API-reported): {current}")
        if current is True:
            print("\n✅ Already enabled!")
            return
    else:
        print("(could not read project state from API)")

    if args.check:
        sys.exit(0)

    # API doesn't expose the toggle. Provide dashboard instructions.
    print()
    print("=" * 70)
    print("  Vercel feature is called 'Deployment Checks' (not 'Wait for CI')")
    print("=" * 70)
    print()
    print(f"  Direct link: {DASHBOARD_URL}")
    print()
    print("  EASIEST PATH — Native Deployment Checks (Vercel runs scripts directly):")
    print("    1. Click 'Add Checks' on the Deployment Checks page")
    print("    2. Choose provider: 'Vercel'")
    print("    3. Enable both:")
    print("       - Lint  (runs `npm run lint`)")
    print("       - Typecheck (runs `npm run typecheck`)")
    print("    4. Click 'Add' → done.")
    print()
    print("  Your project already has both scripts in package.json,")
    print("  so this works immediately with zero further setup.")
    print()
    print("  ADVANCED — GitHub Checks (uses your ci.yml workflow):")
    print("    1. Same Deployment Checks page → 'Add Checks'")
    print("    2. Choose provider: 'GitHub'")
    print("    3. Search for ci.yml jobs (e.g. 'lint', 'test', 'build')")
    print("    4. Select which checks are required.")
    print()
    print("  After both runs pass, Vercel aliases the build to your domain.")
    print("  While pending, deployment sits in 'Promoting' state — not visible to users.")
    print()
    print("=" * 70)
    print()
    print(f"Open: {DASHBOARD_URL}")
    print()
    print("Re-run with --check to verify state (API still doesn't expose,")
    print("but you can see check status on the deployment detail page).")


if __name__ == "__main__":
    main()
