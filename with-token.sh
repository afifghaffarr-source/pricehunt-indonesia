#!/bin/bash
# with-token.sh — load Supabase service-role key into env from sb-pat,
# then exec the supplied command. Used by reseed/cron scripts.
#
# Why: keeps tokens out of process listings and out of accidental git
# commits (sb-pat is in ~/.config/bijakbeli/, mode 600).
#
# Usage:
#   ./with-token.sh collectors/.venv/bin/python scripts/reseed_variants.py
#   ./with-token.sh collectors/.venv/bin/python scripts/reseed_variants.py --dry-run
#
# Exports:
#   SUPABASE_SERVICE_ROLE_KEY  — REST API service-role key (primary)
#   SUPABASE_ACCESS_TOKEN      — Supabase CLI / Management API token (alias)
#
# If sb-pat is missing, the script will refuse to run rather than fall
# back to anon keys (which can't upsert product_variants).

set -euo pipefail

PAT_FILE="${BIJAKBELI_SB_PAT:-/home/ubuntu/.config/bijakbeli/sb-pat}"

if [ ! -r "$PAT_FILE" ]; then
  echo "❌ Cannot read $PAT_FILE (set BIJAKBELI_SB_PAT or create the file with mode 600)" >&2
  exit 2
fi

TOKEN=$(cat "$PAT_FILE")
if [ -z "$TOKEN" ]; then
  echo "❌ $PAT_FILE is empty" >&2
  exit 2
fi

export SUPABASE_SERVICE_ROLE_KEY="$TOKEN"
export SUPABASE_ACCESS_TOKEN="$TOKEN"
exec "$@"
