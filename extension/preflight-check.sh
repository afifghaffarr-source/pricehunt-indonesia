#!/usr/bin/env bash
# Pre-submission sanity checks. Run before uploading to CWS dashboard.
# Exit 0 if all pass, exit 1 on first failure.
set -euo pipefail

EXT_DIR="${1:-extension}"
BASE_URL="${BASE_URL:-https://bijakbeli.web.id}"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
hdr()   { printf "\n\033[1;36m== %s ==\033[0m\n" "$*"; }

fail=0

# --- 1. Manifest is valid JSON ---
hdr "1. Manifest is valid JSON"
if ! jq -e . "$EXT_DIR/manifest.json" >/dev/null; then
  red "FAIL: manifest.json is NOT valid JSON"
  fail=1
else
  green "OK: manifest.json parses"
fi

# --- 2. Required manifest fields ---
hdr "2. Required manifest fields"
for field in name version description permissions host_permissions minimum_chrome_version content_security_policy key; do
  if ! jq -e ".$field" "$EXT_DIR/manifest.json" >/dev/null 2>&1; then
    red "FAIL: manifest.json missing '$field'"
    fail=1
  fi
done
if [ "$fail" -eq 0 ]; then green "OK: required fields present (incl. CSP, min_version, key)"; fi

# --- 3. No remote code / eval ---
hdr "3. No remote code or eval in any extension JS"
if grep -rnE "\\beval\\(|new Function\\(|innerHTML\\s*=|document\\.write(" "$EXT_DIR"/*.js "$EXT_DIR"/**/*.js 2>/dev/null; then
  red "FAIL: found remote-code vector in extension JS"
  fail=1
else
  green "OK: no eval / Function / innerHTML / document.write"
fi

# --- 4. No binary blobs in extension package ---
hdr "4. No unaccounted binary blobs (.wasm, .map, .so)"
if find "$EXT_DIR" -type f \( -name "*.wasm" -o -name "*.map" -o -name "*.so" -o -name "*.node" \) | grep -q .; then
  red "FAIL: binary blob found in extension/ — would be ignored by CWS but bloat"
  fail=1
else
  green "OK: no binary blobs"
fi

# --- 5. Privacy policy URL reachable ---
hdr "5. Privacy policy URL reachable"
# -L follows redirects so canonical www/non-www 308s count as success
priv_status=$(curl -sIL -o /dev/null -w '%{http_code}' --max-time 10 \
  "$BASE_URL/extension/privacy-policy" || echo "000")
if [ "$priv_status" = "200" ]; then
  green "OK: $BASE_URL/extension/privacy-policy returns 200"
else
  red "FAIL: privacy policy returned HTTP $priv_status (check Vercel domain re-alias)"
  fail=1
fi

# --- 6. Storefront reachable ---
hdr "6. Storefront landing reachable"
landing_status=$(curl -sIL -o /dev/null -w '%{http_code}' --max-time 10 \
  "$BASE_URL/extension" || echo "000")
if [ "$landing_status" = "200" ]; then
  green "OK: $BASE_URL/extension returns 200"
else
  red "FAIL: storefront returned HTTP $landing_status"
  fail=1
fi

# --- 7. Privacy policy content size ---
hdr "7. Privacy policy content size"
priv_size=$(curl -sL --max-time 10 "$BASE_URL/extension/privacy-policy" | wc -c)
if [ "$priv_size" -lt 5000 ]; then
  red "FAIL: privacy policy is only $priv_size bytes — likely a stub (CWS requires comprehensive)"
  fail=1
else
  green "OK: privacy policy is $priv_size bytes"
fi

# --- 8. FAQ page reachable ---
hdr "8. FAQ page reachable"
faq_status=$(curl -sIL -o /dev/null -w '%{http_code}' --max-time 10 \
  "$BASE_URL/extension/faq" || echo "000")
if [ "$faq_status" = "200" ]; then
  green "OK: $BASE_URL/extension/faq returns 200"
else
  red "FAIL: FAQ page returned HTTP $faq_status"
  fail=1
fi

# --- 9. FAQ JSON endpoint reachable + valid JSON ---
hdr "9. FAQ JSON endpoint (machine-readable for AI ingestion)"
faq_json_status=$(curl -sIL -o /dev/null -w '%{http_code}' --max-time 10 \
  "$BASE_URL/extension/faq.json" || echo "000")
if [ "$faq_json_status" != "200" ]; then
  red "FAIL: /extension/faq.json returned HTTP $faq_json_status"
  fail=1
else
  if curl -sL --max-time 10 "$BASE_URL/extension/faq.json" \
     | jq -e '.["@context"] == "https://schema.org" and .total_questions == 22' >/dev/null; then
    green "OK: /extension/faq.json returns valid schema.org/FAQPage (22 questions)"
  else
    red "FAIL: /extension/faq.json not in expected schema.org shape"
    fail=1
  fi
fi

echo
if [ "$fail" -eq 0 ]; then
  green "ALL PRE-FLIGHT CHECKS PASSED ✓"
  echo
  echo "Ready to upload extension.zip to Chrome Web Store."
  echo "Run: bash extension/build-zip.sh"
  exit 0
else
  red "PRE-FLIGHT CHECKS FAILED — DO NOT SUBMIT UNTIL FIXED"
  exit 1
fi
