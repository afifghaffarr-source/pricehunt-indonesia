# Chrome Web Store Submission Checklist — BijakBeli v3.0.1

## Status (audit complete: 2026-06-28)

- ✅ Code-side gaps P0–P5 closed (`master @ 19471f7`)
- ✅ 681 tests passing (Vitest 665 + E2E 16)
- ✅ Lint, typecheck, build clean
- ✅ All required assets captured by `npm run capture:extension-screenshots`

## Pre-submission blockers

> **One known ops blocker:** `bijakbeli.web.id` is pinned to a 12-day-old Vercel
> deploy (alias). Until re-aliased, prod still serves pre-P2 code (legacy
> `products.url` 502s on `/api/extension/current-price`).
>
> Fix (1 step, dashboard only):
> 1. https://vercel.com/[team]/pricehunt-indonesia/settings/domains
> 2. Click `bijakbeli.web.id` → Remove
> 3. Re-add → Vercel auto-aliases to latest deploy
>
> OR: drop a full-access `VERCEL_TOKEN=…` into `~/.bashrc` and wire
> `vercel alias` into a release script.

---

## Captured assets (`scripts/marketing-assets/captured/`)

| File | Dimensions | CWS role |
|---|---|---|
| `tiles/promo-small-440x280.png` | 440 × 280 | **Required**: small promo tile |
| `tiles/promo-marquee-1280x800.png` | 1280 × 800 | Optional: marquee tile (for featured placement) |
| `screenshots/01-landing.png` | 1280 × 800 | Screenshot #1 (landing) |
| `screenshots/02-installed.png` | 1280 × 800 | Screenshot #2 (success state) |
| `screenshots/03-setup.png` | 1280 × 800 | Screenshot #3 (setup flow) |
| `screenshots/04-privacy-policy.png` | 1280 × 800 | Screenshot #4 (privacy) |
| `screenshots/05-compare.png` | 1280 × 800 | Screenshot #5 (compare) |

> Re-capture if UI changes: `BASE=http://localhost:3000 npm run capture:extension-screenshots`
> (need `npm start` running first).

## Two screenshots you'll add manually

CWS requires **chrome://extensions** perspective screenshots showing the
extension popup/sidepanel in action. These can't be auto-captured via
direct chromium goto (popup iframe is hostile to headless contexts).

**Manual capture (~10 min, in real Chrome):**

1. Open Chrome → `chrome://extensions/` → enable Developer mode
2. **Load unpacked**: select the unzipped `bijakbeli-extension-vX.X.X.tar.gz`
   contents (extract first: `mkdir /tmp/bjb && tar -xzf extension-v3*.tar.gz -C /tmp/bjb`)
3. Pin the BijakBeli icon → click → right-click on it → **Open side panel**
4. Resize Chrome window to 1280×800 exactly:
   - Press F12 → toggle device toolbar → "Responsive" → 1280×800 → 1×
5. Screenshot the empty-state sidepanel (🛒 Selamat Datang) → save as:
   `screenshots-manual/06-sidepanel-welcome.png`
6. Visit a marketplace page (Shopee product) — extension auto-scrapes
7. Re-open sidepanel — now shows stats grid. Screenshot:
   `screenshots-manual/07-sidepanel-stats.png`

## CWS submission form (fill manually in https://chrome.google.com/webstore/devconsole/)

### Store listing

| Field | Value |
|---|---|
| **Name** | BijakBeli — Price Compare Indonesia |
| **Summary** (≤ 132 chars) | Auto-scrape harga dari Shopee/Tokopedia/Lazada/Blibli/Bukalapak/TikTok. Bantu ribuan pembeli Indonesia. |
| **Category** | Shopping |
| **Language** | Indonesian (Bahasa Indonesia) |
| **Description** | See below |
| **Icon** | `extension/icon128.png` (or repackage tarball gets you latest) |

### Detailed description (paste — Indonesian)

```
🛒 BijakBeli Chrome Extension otomatis scrape harga produk dari
marketplace Indonesia setiap kali kamu browsing. Satu klik, data harga
terkirim ke database komunitas untuk membantu ribuan pembeli lain.

MARKETPLACE YANG DIDUKUNG:
  ✓ Shopee       ✓ Tokopedia    ✓ Lazada
  ✓ Blibli       ✓ Bukalapak    ✓ TikTok Shop

FITUR UTAMA:
  • Auto-scrape — buka halaman produk, data terkirim otomatis
  • Sidepanel — lihat statistik kontribusi kamu secara real-time
  • Pantau Harga — notifikasi saat produk yang kamu incar turun harga ⭐ NEW
  • Riwayat Submission — export CSV ke spreadsheet
  • Retry Otomatis — submission yang gagal akan dicoba ulang di background

KEAMANAN & PRIVASI:
  • Tidak ada telemetry / tracking pihak ketiga
  • Tidak ada penjualan data user ke pihak lain
  • Secret key disimpan lokal di browser kamu
  • Source terbuka — bisa diinspeksi

CARA PAKAI:
  1. Install extension
  2. Setup ingestion key via dashboard
  3. Browse marketplace seperti biasa — auto-scrape berjalan

Baca kebijakan privasi lengkap: https://www.bijakbeli.web.id/extension/privacy-policy
```

### Permissions justification (per Chrome 2026 review policy)

> IMPORTANT: Manifest V3 reviewers scrutinize every permission. The
> justification text below is what gets you approved, paste it verbatim.

**`storage`:**

```
Needed to persist user's ingestion secret locally in the browser, plus
user-configured price watchlist (target prices, last-seen prices). All
data stays local — never synced, never transmitted except to
www.bijakbeli.web.id when explicitly submitting.
```

**`host_permissions`: `https://*.shopee.co.id/*`, `https://*.tokopedia.com/*`, `https://*.lazada.co.id/*`, `https://*.blibli.com/*`, `https://*.bukalapak.com/*`, `https://*.tiktok.com/*`:**

```
Limited to marketplace product pages only. Used to read publicly
displayed product title, price, and URL at user-initiated page loads
(no background scraping). Each reading is single-use — the extension
does not crawl beyond the active page.
```

**`notifications` (P0 justification, full version):**

```
Used SOLELY to deliver user-initiated price-drop alerts. Behavior:
  • Opt-in only — user adds an item to the watchlist via side-panel
  • Single purpose — one notification per alert event (max ~5/day)
  • 24-hour cooldown per item to prevent spam
  • No telemetry — notification permission never combined with analytics
  • Fallback to extension badge if permission denied (no functional loss)
The manifest's `notifications` permission is mandatory for chrome.notifications
API. We never combine it with web-accessible resources or remote code.
```

### Privacy practices (yes/no)

- Does NOT collect personal data: ✅
- Does NOT use remote code: ✅
- Does NOT sell user data: ✅
- Single-purpose: ✅ (auto-scrape marketplace prices)
- Uses notifications only for user-facing alerts: ✅
- Privacy policy URL: `https://www.bijakbeli.web.id/extension/privacy-policy`
- Has a terms URL: `https://www.bijakbeli.web.id/legal/terms`
- Account deletion path: contact maintainer via extension dashboard

### Distribution

- **Visibility**: Public
- **Regions**: All (primary market: Indonesia)
- **Pricing**: Free

### Submit

1. Upload `bijakbeli-extension-v3.0.1.zip` (~32 KB, built by `extension/build-zip.sh`)
2. Upload 1 small promo tile + 5 screenshots (drop marquee if not chasing curated features)
3. Fill form fields above
4. **Run pre-flight first**: `bash extension/preflight-check.sh extension`
   - Validates manifest, no eval/Function blobs, privacy URL reachable (200), privacy content is real document
   - Expect: `ALL PRE-FLIGHT CHECKS PASSED ✓`
   - **Will fail** until `bijakbeli.web.id` Vercel alias re-pointed — the script is the canary
5. Click **Submit for review**
6. Expected review time: 1–7 business days (typical 3 days)

### Build script

```bash
bash extension/build-zip.sh
# Output: bijakbeli-extension-v3.0.1.zip (strips __test__/, .git/, *.test.js)
```

Old tar.gz approach superseded — use the zip script above. Cleaner CWS artifact.

## Post-submit checklist

- [ ] Watch `master` branch — CWS review feedback sometimes pulls commits
- [ ] Verify `/api/extension/current-price` works end-to-end once Vercel
      alias is re-pointed (combine this with launch!)
- [ ] First beta tester onboards via `/extension/setup` flow
- [ ] Reply to initial user feedback in dashboard

## Reference

- CWS Images guide: https://developer.chrome.com/docs/webstore/images/
- CWS Listing guide: https://developer.chrome.com/docs/webstore/cws-overview/
- BijakBeli `STORE_LISTING.md`: includes full store-listing copy + reviewer notes
- BijakBeli audit (`AGENTS.md`-adjacent): P0–P5 commits `69a4bfa → 19471f7`
