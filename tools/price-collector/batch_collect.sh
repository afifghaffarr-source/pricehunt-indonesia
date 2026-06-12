#!/bin/bash
# Batch URL Collection for BijakBeli.app
# Usage: ./batch_collect.sh urls.txt

set -e

URLS_FILE="${1:-urls.txt}"

if [ ! -f "$URLS_FILE" ]; then
    echo "❌ Error: File $URLS_FILE not found"
    echo "Usage: ./batch_collect.sh urls.txt"
    exit 1
fi

echo "🚀 Starting batch collection..."
echo "📄 Reading URLs from: $URLS_FILE"
echo ""

TOTAL=$(wc -l < "$URLS_FILE")
CURRENT=0
SUCCESS=0
FAILED=0

while IFS= read -r url || [ -n "$url" ]; do
    # Skip empty lines and comments
    [[ -z "$url" || "$url" =~ ^#.*$ ]] && continue
    
    CURRENT=$((CURRENT + 1))
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Processing ($CURRENT/$TOTAL): $url"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Run collector
    if python collector.py url "$url"; then
        SUCCESS=$((SUCCESS + 1))
        echo "✅ Success ($SUCCESS/$CURRENT)"
    else
        FAILED=$((FAILED + 1))
        echo "❌ Failed ($FAILED/$CURRENT)"
        echo "   URL: $url"
    fi
    
    # Rate limiting: wait 5 seconds between products
    if [ "$CURRENT" -lt "$TOTAL" ]; then
        echo ""
        echo "⏳ Waiting 5 seconds (rate limit)..."
        sleep 5
        echo ""
    fi
done < "$URLS_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Batch collection complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results:"
echo "   Total:   $TOTAL"
echo "   Success: $SUCCESS"
echo "   Failed:  $FAILED"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo "⚠️  Some products failed. Check logs above."
    exit 1
fi

echo "✅ All products collected successfully!"
