# BijakBeli Chrome Extension — Changelog

## v3.1.0 (2026-06-30) — Variant capture
New: PDP scraper now captures selected variant info (storage, color, size, etc.)
from all 6 marketplaces. This enables per-variant price tracking — the server
can now link incoming offers to specific `product_variants` rows, making the
variant comparison table render on product pages without waiting for the
daily cron auto-linker.

**Changes:**
- `marketplace-scraper.js`: new `extractVariantFromPDP(marketplace)` function
  with per-marketplace CSS selectors (Shopee active pills, Tokopedia
  aria-pressed buttons, Lazada sku-option--active, Blibli selected dropdown)
- `marketplace-scraper.js`: JSON-LD fallback now checks `sku`, `model`, and
  `additionalProperty` for variant metadata
- `marketplace-scraper.js`: dedup hash now includes `variant` field so the
  same product with different variants sends both
- `background.js`: `variant` field added to offer-snapshot POST payload
- `parser_version` bumped from 3.0.1 → 3.1.0

## v3.0.1 (2026-06-28) — CWS launch build
First public release registered with the Chrome Web Store.

**Highlights:**
- Auto-scrape prices from 6 Indonesian marketplaces (Shopee, Tokopedia, Bukalapak, Lazada, Blibli, TikTok Shop)
- Sidepanel UI with running stats, per-marketplace breakdown, and pending-submission queue
- Watchlist with target-price alerts — desktop notification when price drops to your threshold
- Manifest V3, MV3-compliant `content_security_policy`, `minimum_chrome_version: 108`
- Stable extension ID across future updates (`key` field present in manifest)

**Privacy:**
- 17.9 KB privacy policy at `/extension/privacy-policy` covering Chrome 2026 fixed data-category list
- No PII collected; only marketplace product data + user-controlled watchlist

**Quality gates:**
- 665 unit tests + 16 E2E assertions passing
- Lint clean, typecheck clean
- Pre-flight script (`extension/preflight-check.sh`) exits 0 against production

## v3.0.0 (2026-06-15) — internal milestone
Architectural rewrite to MV3 service-worker with background alarms (replaces
v2.x `setInterval`-based fetching which gets throttled in MV3 service workers).

## v2.x (2024–early 2026) — pre-MV3 era
Legacy Manifest V2 build. Replaced by v3.0.x line.

## Semantic version policy
- **Patch** (x.x.Y) — bug fixes that don't change parser behavior; user sees an
  automatic CWS update without needing to re-grant permissions.
- **Minor** (x.Y.0) — new marketplace support, new sidepanel section, new
  notification category. May add new permissions (CWS review triggered).
- **Major** (Y.0.0) — model change, content-script restructure, breaking
  schema of stored data. CWS requires manual user re-consent.

## Reporting issues
If you find a bug or have a security concern:
- Email: privacy@bijakbeli.id
- GitHub: github.com/afifghaffarr-source/pricehunt-indonesia/issues
- See `extension/REJECTION_RESPONSE_KIT.md` if you are a Chrome Web Store reviewer.
