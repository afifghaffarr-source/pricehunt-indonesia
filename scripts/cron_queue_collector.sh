#!/bin/bash
#
# Cron wrapper for tools/price-collector/queue_collector.py
#
# Runs the browser-based queue collector to scrape products from
# Tokopedia/Shopee/etc. The collector:
# 1. Fetches queued targets from /api/refresh/queue
# 2. Launches Playwright + Chromium
# 3. Scrapes each URL
# 4. Submits results to /api/ingestion/offer-snapshot
#
# Schedule: every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00)
#
# Why VPS, not Vercel cron:
# - Playwright + Chromium ≈ 300MB; Vercel Hobby has 50MB function size limit
# - This needs a long-running process; Vercel serverless max is 60s (Hobby) / 300s (Pro)
# - Real browser scraping takes 1-2 min per run, not fit for serverless
#
# Why this wrapper, not the python directly:
# - Lock file prevents overlapping runs (if previous run is still going)
# - Timeout (15min) prevents hung Playwright from blocking future runs
# - Structured logging to logs/cron_queue_collector.log
# - Captures exit code for cron monitoring

set -e

# Config
PROJECT_DIR="/home/ubuntu/projects/bijakbeli-app"
VENV_PY="$PROJECT_DIR/tools/price-collector/venv/bin/python"
COLLECTOR="$PROJECT_DIR/tools/price-collector/queue_collector.py"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/cron_queue_collector.log"
LOCK_FILE="/tmp/bijakbeli_queue_collector.lock"
TIMEOUT_SEC=900  # 15 min — should be enough for 10 targets

# Ensure log dir exists
mkdir -p "$LOG_DIR"

# Lock check — if a previous run is still going, skip
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "[$(date -Iseconds)] SKIP: previous run PID $LOCK_PID still alive" >> "$LOG_FILE"
        exit 0
    else
        echo "[$(date -Iseconds)] WARN: stale lock file (PID $LOCK_PID gone), removing" >> "$LOG_FILE"
        rm -f "$LOCK_FILE"
    fi
fi

# Acquire lock
echo $$ > "$LOCK_FILE"
trap "rm -f '$LOCK_FILE'" EXIT

# Run with timeout
echo "[$(date -Iseconds)] START: queue_collector.py (PID $$, timeout ${TIMEOUT_SEC}s)" >> "$LOG_FILE"

cd "$PROJECT_DIR"
# 60s timeout for slow Indonesian marketplace sites (Tokopedia/Shopee
# search pages can take 30-45s on a fresh headless browser cold start).
export BROWSER_TIMEOUT=60000

# Ensure Camoufox stealth server is running (fallback for Tokopedia anti-bot)
export PATH="/home/ubuntu/.hermes/node/bin:$PATH"
if ! camofox health >/dev/null 2>&1; then
    echo "[$(date -Iseconds)] Starting Camoufox server for stealth fallback..." >> "$LOG_FILE"
    camofox server start --background >/dev/null 2>&1 || true
    sleep 3
fi
if timeout "$TIMEOUT_SEC" "$VENV_PY" "$COLLECTOR" >> "$LOG_FILE" 2>&1; then
    EXIT_CODE=0
    echo "[$(date -Iseconds)] DONE: success" >> "$LOG_FILE"
else
    EXIT_CODE=$?
    echo "[$(date -Iseconds)] DONE: exit code $EXIT_CODE" >> "$LOG_FILE"
    if [ "$EXIT_CODE" -eq 124 ]; then
        echo "[$(date -Iseconds)] FAIL: timed out after ${TIMEOUT_SEC}s" >> "$LOG_FILE"
    fi
fi

# Keep log file from growing forever (rotate at 10MB)
if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)" -gt 10485760 ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
    gzip "$LOG_FILE.old" 2>/dev/null || true
fi

exit $EXIT_CODE
