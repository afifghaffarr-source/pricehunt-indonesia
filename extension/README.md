# BijakBeli Chrome Extension

Browser extension that auto-scrapes Indonesian marketplace product data and
contributes it to the BijakBeli community-pricing database.

**Version:** 3.0.1
**License:** MIT (same as parent repo)
**Manifest version:** 3 (MV3)

## Quick reference

- **Production listing:** https://chromewebstore.google.com/detail/bijakbeli/[CWS_ID] (set after publish)
- **Landing page:** https://www.bijakbeli.web.id/extension
- **Privacy policy:** https://www.bijakbeli.web.id/extension/privacy-policy
- **FAQ:** https://www.bijakbeli.web.id/extension/faq
- **Source:** github.com/afifghaffarr-source/pricehunt-indonesia
- **Contact:** privacy@bijakbeli.id

## Files

```
extension/
├── manifest.json          # MV3 manifest (incl. CSP, min_version, key)
├── background.js          # Service worker (MV3, uses chrome.alarms)
├── popup.html             # Toolbar popup (ingestion key form, status)
├── popup.js
├── sidepanel.html         # Side panel (stats, watchlist, marketplace breakdown)
├── sidepanel.js
├── marketplace-scraper.js # Content script (runs on 6 marketplaces)
├── lib/                   # Web-accessible resources
├── icons/                 # icon16.png, icon48.png, icon128.png
├── STORE_LISTING.md       # CWS submission text (Bahasa + English)
├── LAUNCH_CHECKLIST.md    # Pre-submit + Data Cert Matrix
├── REJECTION_RESPONSE_KIT.md  # 7 rejection categories
├── POST_LAUNCH_OPS.md     # Daily/weekly/quarterly ops
├── UU_PDP_COMPLIANCE.md   # Indonesia data-protection law position
├── CHANGELOG.md
├── preflight-check.sh     # 7-check pre-submit validator
├── build-zip.sh           # Build uploadable zip
├── LAUNCH_THREAD.md       # Pre-launch social thread
├── ICONS_README.md        # Icon spec
└── generate_icons.py      # Icon regenerator
```

## For contributors

### Local dev loop

```bash
# 1. From repo root: ensure no .env.local leakage (extension never reads it)
# 2. Build a test zip OR load unpacked
cd extension
# Either:
bash build-zip.sh
# Or skip the zip and load `extension/` directly in Chrome:
#   chrome://extensions/ → Developer mode → Load unpacked → select this dir

# 3. After changes, run pre-flight
BASE_URL=https://www.bijakbeli.web.id bash preflight-check.sh extension
```

### Testing changes locally

The extension is plain JavaScript — no build step. After any change:

1. `chrome://extensions/` → find BijakBeli → click the reload icon
2. Visit a marketplace product page (e.g., `https://shopee.co.id/.../[any-product]`)
3. Click the extension icon → check popup for status
4. Click "Open side panel" → check stats

### Adding a new marketplace

1. Add the domain to `manifest.json`:
   - `host_permissions` array
   - `content_scripts[0].matches` array
2. Add selectors to `marketplace-scraper.js` in the `SCRAPERS` object
3. Test against the marketplace with a real product URL
4. Update `extension/CHANGELOG.md` with a minor version bump
5. Update `/extension/faq` and `extension/STORE_LISTING.md` to list the new marketplace
6. Re-capture screenshots: `npm run capture:extension:real`
7. Run pre-flight: `bash extension/preflight-check.sh extension`

> **Why not host_permissions with `*://*`?** — Chrome 2026 review will
> reject that for any extension that doesn't have a convincing "needs every
> site" reason. We don't. Stay scoped.

### Updating the privacy policy

If you change data collection scope (new permission, new data category,
new third-party recipient):

1. Update `src/app/extension/privacy-policy/page.tsx` (and EN variant if
   shipping a translation)
2. Update `extension/STORE_LISTING.md` Permissions section
3. Update Chrome Web Store Dashboard "Privacy practices" answers
4. Bump extension version (per CHANGELOG semver policy)
5. Re-submit to CWS

## Permissions (read this if reviewing the manifest)

| Permission | Why we need it |
|---|---|
| `activeTab` | Trigger content script only when user clicks the extension |
| `storage` | Persist watchlist + submission queue in `chrome.storage.local` |
| `tabs` | Detect SPA URL changes (Shopee, Tokopedia navigate without reload) |
| `scripting` | Inject `marketplace-scraper.js` on product pages |
| `alarms` | Schedule watchlist price-checks (MV3 service workers throttle `setInterval`) |
| `notifications` | Desktop notification when watched product hits target price |

`host_permissions` are 6 specific marketplace domains. We do NOT use `<all_urls>`.

## Security commitments

- No `eval`, no `new Function`, no `innerHTML` writes
- No remote code fetch (all JS bundled in package)
- No obfuscation
- Source is on GitHub, public
- See `REJECTION_RESPONSE_KIT.md` for the full list of "we do not" commitments

## Testing

```bash
# from repo root
npm test                            # 665 unit tests
npm run test:e2e:routes             # 16 E2E assertions for /extension/* pages
npm run capture:extension:real      # 3 real UI screenshots
BASE_URL=... bash extension/preflight-check.sh extension
```

## Pre-publish checklist (cheat sheet)

- [ ] Version bumped in `manifest.json`
- [ ] CHANGELOG updated
- [ ] Pre-flight exits 0
- [ ] All vitest + E2E pass
- [ ] Real screenshots re-captured (if UI changed)
- [ ] English description updated (if copy changed)
- [ ] Build zip: `bash extension/build-zip.sh`

Then upload the zip to CWS Developer Dashboard.
