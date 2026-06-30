#!/bin/bash
# Cron wrapper for automated offer matching
# Runs hourly to match orphaned offers to products

set -e

# Project directory
PROJECT_DIR="/home/ubuntu/projects/bijakbeli-app"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/cron_auto_match.log"
LOCK_FILE="/tmp/bijakbeli_auto_match.lock"
cd "$PROJECT_DIR"

# Load Supabase credentials from .env.local
export SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d'=' -f2)
export SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d'=' -f2)

# Log start
echo "[$(date -Iseconds)] START: auto_match_offers.py" >> "$LOG_FILE"

# Lock check — if a previous run is still going, skip
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "[$(date -Iseconds)] SKIP: previous run PID $LOCK_PID still alive" >> "$LOG_FILE"
        exit 0
    else
        echo "[$(date -Iseconds)] WARN: stale lock file (PID $LOCK_PID gone), removing" >> "$LOCK_FILE"
        rm -f "$LOCK_FILE"
    fi
fi

# Acquire lock
echo $$ > "$LOCK_FILE"
trap "rm -f '$LOCK_FILE'" EXIT

# Run matching script (15-min timeout)
if timeout 900 python3 "$PROJECT_DIR/scripts/auto_match_offers.py" >> "$LOG_FILE" 2>&1; then
    echo "[$(date -Iseconds)] DONE: success" >> "$LOG_FILE"
else
    EXIT_CODE=$?
    echo "[$(date -Iseconds)] DONE: exit code $EXIT_CODE" >> "$LOG_FILE"
fi

# Rotate log if > 10MB
if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)" -gt 10485760 ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
    gzip "$LOG_FILE.old" 2>/dev/null || true
fi

exit 0
