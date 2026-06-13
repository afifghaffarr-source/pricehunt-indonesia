#!/bin/bash
# Price update batch script for BijakBeli - Tokopedia & Shopee only
# Run from: ~/projects/bijakbeli-app/tools/price-collector

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate venv
source venv/bin/activate

# URLs to update (Tokopedia & Shopee only - collector limitation)
URLS=(
  "https://www.tokopedia.com/gadgetmurah/iphone-15-pro-max-256gb"
  "https://www.tokopedia.com/sony/wh-1000xm5"
  "https://shopee.co.id/sony-official/wh-1000xm5"
  "https://www.tokopedia.com/samsung/galaxy-s24-ultra-512gb"
  "https://shopee.co.id/samsung-official/galaxy-s24-ultra-512gb"
)

UPDATED=0
ERRORS=0

echo "=========================================="
echo "BijakBeli Price Update - $(date)"
echo "=========================================="
echo "Supported: Tokopedia & Shopee only"
echo ""

for url in "${URLS[@]}"; do
  echo "----------------------------------------"
  echo "Processing: $url"
  echo "----------------------------------------"
  
  if timeout 60 python collector.py url "$url" --auto-confirm 2>&1 | tee -a /tmp/collector-output.log; then
    UPDATED=$((UPDATED + 1))
    echo "✅ Success"
  else
    ERRORS=$((ERRORS + 1))
    echo "❌ Failed"
  fi
  
  echo ""
  
  # Rate limiting: wait 5 seconds between requests
  sleep 5
done

echo "=========================================="
echo "Update Summary"
echo "=========================================="
echo "Products updated: $UPDATED"
echo "Errors: $ERRORS"
echo "Total processed: $((UPDATED + ERRORS))"
echo "=========================================="

# Save results
echo "$UPDATED,$ERRORS,$(date +%Y-%m-%d_%H:%M:%S)" > /tmp/bijakbeli-update-result.txt

exit 0
