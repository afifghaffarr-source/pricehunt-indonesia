# BijakBeli Chrome Extension — Changelog

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
