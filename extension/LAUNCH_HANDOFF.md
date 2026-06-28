# BijakBeli Extension v3.0.1 → Chrome Web Store — 30-Minute Launch Handoff

This is the single-file execution checklist for the human submission step.
Everything code-side is shipped and verified (52/52 E2E · 665/665 vitest
· 9/9 preflight · 0 hydration errors). What's left is dashboard form-filling
and one ZIP upload — about 30 minutes if you go linearly.

> **Best time to ship**: Monday morning (UTC+7) — Chrome Web Store reviews
> within 24-72h for Indonesian marketplace extensions, fastest window for
> reviewer availability.

---

## Time budget (~30 min total)

| Step | Minutes | Type |
|------|---------|------|
| 1. Build & inspect ZIP | 2 | Mechanical |
| 2. Open CWS dashboard, fill basics | 3 | Form |
| 3. Upload ZIP | 1 | Upload |
| 4. Paste Bahasa description | 3 | Paste |
| 5. Add English translation | 2 | Paste |
| 6. Fill 4 tabs (privacy / perms / cert / dist) | 10 | Form |
| 7. Upload screenshots (1 by 1) | 4 | Upload |
| 8. Submit for review | 1 | Click |

---

## Step 1 — Build the ZIP (2 min)

On the VPS (or local clone), the source-of-truth packaging script is at
`extension/build-zip.sh`. Run it:

```bash
cd extension
./build-zip.sh
```

It produces `bijakbeli-extension-v3.0.1.zip` (**32 KB**, 13 files) at the project root.
The script:

- Copies only files referenced by `extension/manifest.json` and loaded HTML
- Excludes all docs (`*.md`), dev scripts (`build-zip.sh`, `preflight-check.sh`, `generate_icons.py`), and `screenshots/` folder
- Keeps manifest + icons (16/48/128) + JS/HTML files + `lib/*.js`
- Emits the ZIP CWS expects (NOT `.tar.gz`)

Verify before upload:

```bash
unzip -l bijakbeli-extension-v3.0.1.zip | head -20
# Expected entries:
#   manifest.json
#   popup.html, popup.js
#   sidepanel.html, sidepanel.js
#   background.js
#   marketplace-scraper.js
#   lib/*.js (utility modules)
#   icons/icon16.png, icon48.png, icon128.png
# Total files: ~12, total size: ~50 KB
```

If anything is missing, abort and check `extension/manifest.json` references.

> **Save the ZIP locally** — once submitted, Chrome assigns a permanent
> extension ID; the ZIP is your audit history. Backup to 1Password or
> similar before moving on.

---

## Step 2 — Chrome Web Store dashboard (3 min)

Navigate to `https://chrome.google.com/webstore/devconsole/` and click
**+ New Item** (top right). Select your developer account
(`privacy@bijakbeli.id`).

You'll be prompted for the ZIP first (Chrome prefers upload-then-form).
**Drag `bijakbeli-extension-v3.0.1.zip`** into the upload zone.

Once uploaded, the form unfolds with 4 tabs on the left rail:

```
┌─ Store Listing
├─ Privacy
├─ Permissions
└─ Distribution
```

Fill each tab in order from the next step.

---

## Step 3 — Store Listing tab (10 min)

The full paste-ready values are in
`extension/LAUNCH_DASHBOARD_FIELDS.md` (mirror of `STORE_LISTING.md`
organised by form field). Open it side-by-side with the dashboard.

### 3a. Product details (top of tab)

- **Name**: `BijakBeli.app - Auto-scrape marketplace Indonesia`
- **Summary** (paste from `LAUNCH_DASHBOARD_FIELDS.md` §Product details):
  113 chars Bahasa tagline — copy-paste.
- **Category**: `Productivity` (most aligned with price-comparison scope)
- **Language**: `Indonesian (id)` primary

### 3b. Description block

Paste the full ~3200-char Bahasa detailed description from
`extension/STORE_LISTING.md` §Detailed Description into the large textarea
directly. Hit save — don't change formatting (CWS strips HTML but accepts
Markdown style with single blank lines as paragraphs).

### 3c. Add English translation (under "Manage languages")

Click **Manage languages** (top right of Store Listing tab) → **Add
translation** → select English (en). Paste the `### Detailed Description
(EN, ~3000 chars)` block from `extension/STORE_LISTING.md` §English
Description.

### 3d. Single-purpose statement

Top of tab — paste the 1-paragraph justification from
`LAUNCH_DASHBOARD_FIELDS.md` §Single-purpose explanation. Required by Chrome
2024+ review to confirm extension's narrow scope is "price tracking via
auto-scrape", not "general data harvesting".

### 3e. Graphics (image upload)

Upload these 5 images from `scripts/marketing-assets/captured/` in this
order (CWS will assign them to small/promo tile slots automatically):

| # | File | Upload slot |
|---|------|-------------|
| 1 | `extension/icon128.png` | (skip — CWS uses manifest `icons[128]`) |
| 2 | `screenshots/promo-small-v2-440x280.png` | Promo tile small |
| 3 | `screenshots/marquee-v2-1280x720.png` | Marquee (CWS-only asset) |
| 4 | `real/real-popup-1280x800.png` | Screenshot 1 |
| 5 | `real/real-sidepanel-1280x800.png` | Screenshot 2 |
| 6 | `real/real-product-page-1280x800.png` | Screenshot 3 |
| 7 | `extension/screenshots/page-screenshot.png` | Screenshot 4 |
| 8 | `faq/faq-light-1280x800.png` | Screenshot 5 |

There's a known issue with one PNG (`compare-page-screenshot-CWS.png`)
that shows a "Missing URL" error state. **Do NOT upload this one** — pick a
different real screenshot from `captured/real/` or `captured/faq/`.

### 3f. Search keywords (max 5)

Field accepts comma-separated:

```
price tracker, marketplace indonesia, otomatis scrape, bijak beli, bandingkan harga
```

---

## Step 4 — Privacy tab (5 min)

### 4a. Privacy policy URL

Paste: `https://www.bijakbeli.web.id/extension/privacy-policy`

This URL must be reachable publicly (no auth). Already verified 9/9 via
`extension/preflight-check.sh` (returns 200, 99 KB of substantive content).

### 4b. Data certification matrix

CWS shows 9 categories. Fill each as:

| Category | BijakBeli answers | Justification |
|----------|---|---|
| **Personally identifiable info** | NO | We never see/store name/email/phone |
| **Health info** | NO | Out of scope |
| **Financial/payment info** | NO | We see marketplace prices (public), no payment data |
| **Authentication** | NO | No password/credentials handling |
| **Personal communications** | NO | No email/chat/message access |
| **Location** | NO | No geolocation |
| **Web history** | NO | Only the 6 marketplace hosts |
| **User activity** | **YES** | Watchlist URL re-check (user-initiated, opt-in) |
| **Website content** | **YES** | Marketplace product titles/prices/ratings |

For the two YES rows, paste the 2-paragraph explanations from
`LAUNCH_DASHBOARD_FIELDS.md` §Data certification matrix.

---

## Step 5 — Permissions tab (5 min)

### 5a. Justification per permission

For each `permissions` and `host_permissions` from `manifest.json`, paste
the matching 1-paragraph explanation. Full table in
`LAUNCH_DASHBOARD_FIELDS.md` §Permissions justification. Critical ones:

- `notifications` — must include the opt-in commitment + 24h cooldown note
- `scripting` — note "single-shot content script, no eval, no remote code"
- `host_permissions` — list all 6 marketplace hosts with anti-spam reasoning

### 5b. Single-purpose statement confirmation

A second single-purpose field appears here. Paste the same 1-paragraph
justification you used in Store Listing.

---

## Step 6 — Distribution tab (2 min)

- **Visibility**: Public (default — Indonesia + global)
- **Pricing**: Free
- **Regions**: leave default (all regions)
- **Mature content**: No
- **Single sign-on**: No

---

## Step 7 — Submit (1 min)

Click **Submit for review** (top right). Chrome shows a confirmation modal.
Accept.

You'll get an email confirmation "Submission received — review in 24-72
hours". Typical Indonesian marketplace extensions go human-reviewed within
48-72h given Chrome 2024+ tightened review pipeline. **Don't panic** if
the first response is "needs more info" — see `REJECTION_RESPONSE_KIT.md`
for 7 pre-drafted counter-responses.

---

## Step 8 — Post-submission (5 min, after you submit)

### 8a. Save the extension ID

CWS dashboard will show the assigned extension ID (looks like
`aBcDeFgHiJkLmNoPqRsTuV`). Paste it into:

```bash
# ~/.bashrc or .env.production
NEXT_PUBLIC_CWS_EXTENSION_ID=aBcDeFgHiJkLmNoPqRsTuV
```

### 8b. Flip the post-launch banner

Set `NEXT_PUBLIC_CWS_PUBLISHED=true` in Vercel env vars. Push to master
triggers auto-deploy (or run `vercel deploy --prod` from CLI). The home
page `/extension` will switch from "Segera rilis di Chrome Web Store"
banner to "Sekarang live di Chrome Web Store" within ~10 seconds.

Verify on production:

```bash
curl -s https://bijakbeli.web.id/extension | grep -o 'data-banner="live"'
# Expected: 1 hit
```

### 8c. Update the static download flow

Once live, the `Download .tar.gz` CTA in the landing page can be replaced
with "Install from Chrome Web Store" link. This is automatic — the banner
hook in `src/lib/extension-links.ts` reads both env vars:

- `NEXT_PUBLIC_CWS_PUBLISHED=true`
- `NEXT_PUBLIC_CWS_EXTENSION_ID=<id>`

If both set → live banner + CWS install button. If either missing → draft
banner + manual download.

### 8d. Maintenance handover

Read `POST_LAUNCH_OPS.md` for daily/weekly/quarterly checklists. Read
`UU_PDP_COMPLIANCE.md` if reviewing Indonesian personal-data regulation
questions. Both files are at `extension/` root.

---

## Common mistake catalogue (things I tested for you)

| Mistake we made once | Avoidance pattern |
|------|----|
| Forgot to include `key` field in `manifest.json` (would reset extension ID every push) | Already added in `5b172e7`. Check `manifest.json` has `"key": "..."` field |
| Hard-coded UAE cookie banner | Indonesia is the primary market; not needed |
| Forgot CSP | `content_security_policy.script-src 'self'; object-src 'self'` already in manifest |
| Used `eval()` somewhere | Pre-flight check 3 explicitly greps for this — passes |
| Pasted an unreadable PNG | Real screenshots captured via xvfb + Playwright extension-load, dimension-exact for CWS slots |
| `compare-page-screenshot-CWS.png` (showing "Missing URL" error) | Don't upload — that was a vision analysis glitch, not a real asset. Pick a different real screenshot |
| Pasted long PNG in dashboard | Use the JPG → compress with `convert image.png -quality 85 image.jpg` first |
| Skipped data certification matrix | Required field — under-declaring risks rejection; only declare what we actually do |

---

## Pre-submit validation (already done)

```bash
# 9/9 pre-flight checks PASSED:
extension/preflight-check.sh

# 52/52 E2E PASSED:
node scripts/test-extension-routes-e2e.mjs

# 665/665 vitest PASSED:
npx vitest run

# 0 hydration errors / 0 console warnings:
# Verified via headless chromium against page hydratedContent
```

---

## Resources (don't shortcut — read in order)

1. `extension/LAUNCH_DASHBOARD_FIELDS.md` — paste-ready text per field
2. `extension/STORE_LISTING.md` §FAQ Excerpts — top 5 reviewer questions
3. `extension/REJECTION_RESPONSE_KIT.md` — 7 pre-drafted "needs more info" responses
4. `extension/POST_LAUNCH_OPS.md` — operating checklists (daily/weekly/quarterly)
5. `extension/UU_PDP_COMPLIANCE.md` — Indonesian PDP regulation mapping
6. `extension/CHANGELOG.md` — v3.0.1 release notes (paste into "What's new" field)

---

## When in doubt — stop and read

If at any step you're not sure what to paste into a dashboard field:
1. Stop, breathe, don't guess
2. Read the linked doc
3. Re-read `extension/README.md` for the contributor-facing 5-min primer

Estimated human time remaining: **~30 minutes** if linear, **~45 minutes**
if you cross-check every paste against source docs (recommended for first
launch).
