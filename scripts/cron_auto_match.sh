#!/bin/bash
# Cron wrapper for automated offer matching
# Runs hourly to match orphaned offers to products

set -e

# Project directory
PROJECT_DIR="/home/ubuntu/projects/bijakbeli-app"
cd "$PROJECT_DIR"

# Load Supabase credentials from .env.local
export SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d'=' -f2)
export SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d'=' -f2)

# Run matching script
python3 "$PROJECT_DIR/scripts/auto_match_offers.py"

# Exit with script's exit code
exit $?
