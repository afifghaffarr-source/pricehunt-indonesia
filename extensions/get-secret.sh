#!/bin/bash
# Get INGESTION_SECRET for BijakBeli Chrome Extension

echo "🔍 Searching for INGESTION_SECRET..."
echo ""

if [ -f .env.local ]; then
    echo "📄 From .env.local:"
    grep INGESTION_SECRET .env.local | head -1
    echo ""
fi

if [ -f .env ]; then
    echo "📄 From .env:"
    grep INGESTION_SECRET .env | head -1
    echo ""
fi

echo "💡 Copy the secret value and paste it into Chrome extension settings"
echo ""
echo "Chrome Extension Settings:"
echo "1. Click extension icon 📦"
echo "2. Paste secret in 'Ingestion Secret' field"
echo "3. Click 'Save Configuration'"
