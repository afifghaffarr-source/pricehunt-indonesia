#!/usr/bin/env bash
# Build the CWS-submittable Chrome extension zip.
# Only includes files referenced by manifest.json. No docs, no scripts, no screenshots.
# Output: bijakbeli-extension-v<version>.zip (read from manifest.json)
set -euo pipefail

EXT_DIR="${1:-extension}"
VERSION=$(jq -r .version "$EXT_DIR/manifest.json")
OUT="bijakbeli-extension-v${VERSION}.zip"

# Clean staging dir
rm -rf build && mkdir -p build

# Files referenced by manifest.json (and loaded by html files via <script src=>)
cp "$EXT_DIR/manifest.json" build/

# Icons
cp "$EXT_DIR/icon16.png" "$EXT_DIR/icon48.png" "$EXT_DIR/icon128.png" build/

# Manifest-referenced JS
cp "$EXT_DIR/background.js" build/
cp "$EXT_DIR/marketplace-scraper.js" build/
cp -R "$EXT_DIR/lib" build/

# Popup + sidepanel (HTML + JS)
cp "$EXT_DIR/popup.html" "$EXT_DIR/popup.js" build/
cp "$EXT_DIR/sidepanel.html" "$EXT_DIR/sidepanel.js" build/

# Re-zip
(cd build && zip -r -X --quiet "../$OUT" .)

# Verify
echo "=== ${OUT} contents ==="
unzip -l "$OUT"
echo
echo "Total: $(stat -c%s "$OUT") bytes ($(stat -c%s "$OUT" | numfmt --to=iec))"
echo "Output: $(realpath "$OUT")"

# Cleanup
rm -rf build
