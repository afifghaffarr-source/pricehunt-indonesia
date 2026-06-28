#!/usr/bin/env bash
# Build the uploadable Chrome extension zip. Excludes dev files.
set -euo pipefail

EXT_DIR="${1:-extension}"
OUT="bijakbeli-extension-v$(jq -r .version "$EXT_DIR/manifest.json").zip"

# Clean build dir
rm -rf build && mkdir -p build
cp -R "$EXT_DIR"/. build/

# Strip dev artifacts
rm -rf build/__test__ build/tests build/*.test.js build/.git build/node_modules

# Re-zip (preserve permissions; use -X to drop extended attrs)
(cd build && zip -r -X --quiet "../$OUT" .)

# Show what got packaged
echo "Packaged files:"
unzip -l "$OUT" | tail -20
echo
echo "Total: $(stat -c%s "$OUT" | numfmt --to=iec)"
echo "Output: $(realpath "$OUT")"
