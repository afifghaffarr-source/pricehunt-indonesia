#!/usr/bin/env bash
# Build Chrome extension distributables from manifest-only file filter.
# Outputs:
#   - bijakbeli-extension-v<version>.zip  (CWS-uploadable; gitignored)
#   - tar.gz at public/downloads/         (user-facing download link; committed)
# Only includes files referenced by manifest.json. No docs, no scripts, no screenshots.
# Version is read from manifest.json so we never drift.
set -euo pipefail

EXT_DIR="${1:-extension}"
EXT_DIR_ABS="$(cd "$(dirname "$EXT_DIR")" && pwd)/$(basename "$EXT_DIR")"
VERSION=$(jq -r .version "$EXT_DIR_ABS/manifest.json")
OUT_ZIP="bijakbeli-extension-v${VERSION}.zip"
OUT_TGZ="$EXT_DIR_ABS/../public/downloads/bijakbeli-extension-v${VERSION}.tar.gz"

# Clean staging dir
rm -rf build && mkdir -p build

# Files referenced by manifest.json (and loaded by html files via <script src=>)
cp "$EXT_DIR_ABS/manifest.json" build/

# Icons
cp "$EXT_DIR_ABS/icon16.png" "$EXT_DIR_ABS/icon48.png" "$EXT_DIR_ABS/icon128.png" build/

# Manifest-referenced JS
cp "$EXT_DIR_ABS/background.js" build/
cp "$EXT_DIR_ABS/marketplace-scraper.js" build/
cp -R "$EXT_DIR_ABS/lib" build/

# Popup + sidepanel (HTML + JS)
cp "$EXT_DIR_ABS/popup.html" "$EXT_DIR_ABS/popup.js" build/
cp "$EXT_DIR_ABS/sidepanel.html" "$EXT_DIR_ABS/sidepanel.js" build/

# Build ZIP (for CWS — gitignored)
(cd build && zip -r -X --quiet "../../$OUT_ZIP" .)

# Build TAR.GZ (for public download — committed to public/downloads/)
mkdir -p "$(dirname "$OUT_TGZ")"
(cd build && tar -czf "$OUT_TGZ" .)

# Verify
echo "=== ${OUT_ZIP} contents ==="
unzip -l "$OUT_ZIP"
echo
echo "Total ZIP: $(stat -c%s "$OUT_ZIP") bytes ($(stat -c%s "$OUT_ZIP" | numfmt --to=iec))"
echo "Output ZIP: $(realpath "$OUT_ZIP")"
echo
echo "=== ${OUT_TGZ} contents ==="
tar -tzvf "$OUT_TGZ"
echo
echo "Total TGZ: $(stat -c%s "$OUT_TGZ") bytes ($(stat -c%s "$OUT_TGZ" | numfmt --to=iec))"
echo "Output TGZ: $(realpath "$OUT_TGZ")"

# Cleanup
rm -rf build
