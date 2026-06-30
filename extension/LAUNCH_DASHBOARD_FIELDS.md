# Chrome Web Store Dashboard — Paste-Ready Field Values

When filling the CWS Developer Dashboard for **v3.1.0**, copy values from this
document verbatim. Format: each section matches the dashboard tab order. We've
drafted the values so you can paste straight into the form.

> **Dashboard URL:** https://chrome.google.com/webstore/devconsole
>
> **v3.1.0 release date:** 2026-06-30
> **Test count:** 820 Vitest + 3 E2E skipped = **823 passing** (was 665 + 16 = 681 in v3.0.1)
> **Package:** `bijakbeli-extension-v3.1.0.zip` (34,508 bytes, 14 files)
> **Manifest version:** 3.1.0

---

## Tab: Product details

### Product name
```
BijakBeli.app
```

### Summary (max 132 chars)
```
Bandingkan harga marketplace Indonesia saat browsing. Auto-scrape produk untuk bantu komunitas.
```
*(113 chars exactly — Bahasa Indonesia)*

### Category
```
Shopping
```

### Language
```
Bahasa Indonesia (default)
+ English (added under Translations tab)
```

### Visibility options
- ☐ Set this listing to unlisted (do NOT enable — we want Public)
- ☐ Set a custom badge on this listing (admins only — leave default)

---

## Tab: Privacy practices

These are the **9 official Chrome data categories**. Answer each:

| Category | Answer | Notes |
|---|---|---|
| **Personally identifiable information** | ❌ **No** | No name/email/phone/address |
| **Health information** | ❌ **No** | Out of scope |
| **Financial or payment information** | ❌ **No** | No payment access |
| **Authentication information** | ❌ **No** | INGESTION_SECRET is a shared class token, not user identity |
| **Personal communications** | ❌ **No** | No email/chat access |
| **Location** | ❌ **No** | No GPS, no IP logging client-side |
| **Web history** | ❌ **No** | No URL history accumulation |
| **User activity** | ✅ **Yes** | See justification text below |
| **Website content** | ✅ **Yes** | Marketplace product data only |

### Justification text (paste for User activity)
> The extension's background service worker revisits product URLs from the user's watchlist to check whether prices have changed. Each access is one HTTP request per watchlist item per check cycle (default: every 30 minutes, max 1 notification per item per 24 hours). URL access is strictly limited to URLs the user themselves added to the watchlist — no other browsing data is collected.

### Justification text (paste for Website content)
> The content script reads only the publicly visible price text, product title, and seller rating from product detail pages on six specific Indonesian marketplaces (Shopee, Tokopedia, Bukalapak, Lazada, Blibli, TikTok Shop). It does not read login forms, payment pages, account dashboards, or any DOM element outside the product card. The data is submitted to the BijakBeli community-pricing database (Supabase) and is publicly available on the marketplace — the user is the submitter, not a data subject.

### Justification text (paste for Authentication information = NO)
> We are checking "No" but flagging for clarification: INGESTION_SECRET is a shared authentication token issued to enrolled beta testers, not a per-user credential. We do not collect passwords, OAuth tokens, email addresses, or any other per-user authentication information.

---

## Tab: Permissions

For each permission you must provide a justification. Paste these:

### `activeTab`
```
Injected only when the user clicks the extension's action button to scrape the current page. We do NOT inject scripts on every page load.
```

### `storage`
```
Stores the user's local submission history, retry queue, and watchlist entries in chrome.storage.local. Data never leaves the device unless the user manually configures INGESTION_SECRET for opt-in submission.
```

### `tabs`
```
Detect SPA URL/title changes on Shopee, Tokopedia, and other single-page-app marketplaces that change route without page reload. Required to re-trigger the scrape after client-side navigation.
```

### `scripting`
```
Inject marketplace-scraper.js as a content script on whitelisted marketplace domains, at document_idle. Single-shot, no remote code fetch, no eval.
```

### `alarms`
```
Schedule two periodic tasks in the MV3 service worker: (1) retry failed submissions every 5 minutes (max 3 retries), and (2) check watchlist prices every 30 minutes. We use chrome.alarms because MV3 service workers throttle setInterval.
```

### `notifications`
```
Fire a single desktop notification when a watched product's price drops to the user's target. Hard rate-limit: maximum 1 notification per watched product per 24 hours. Opt-in only — never fired unless the user explicitly added the product to their watchlist.
```

### `host_permissions` (6 marketplace domains)
```
Read-only access to publicly displayed product detail pages on six Indonesian marketplaces. Used to extract product title, price, seller name, and seller rating. No write operations. No login interaction. No access to cart, checkout, or account dashboards.
```

---

## Tab: Store listing

### Detailed description (Bahasa, primary)
```
[Copy from extension/STORE_LISTING.md "## 📋 Detailed Description" section]
```

### Detailed description (English, secondary)
```
[Copy from extension/STORE_LISTING.md "## 🌐 English Description" → "### Detailed Description (EN, ~3000 chars)"]
```

### Search keywords (max 5)
```
bijak beli, marketplace, harga, indonesia, price tracker
```

### Additional fields
- **Homepage URL**: `https://www.bijakbeli.web.id/extension`
- **Support URL**: `https://www.bijakbeli.web.id/extension/faq`
- **Mature content rating**: Leave at default (`Takjub - Tidak Ada Konten Dewasa` / `Mild — no adult content`)

---

## Tab: Distribution

### Visibility (initial)
```
Public
```

### Regions
```
All regions (selectors: Indonesia as primary, all others ticked)
```

### Pricing
```
Free
```

### Mature content
```
No
```

### Single purpose
```
"Compare prices across Indonesian marketplaces while users shop"
```

> **Rejection risk mitigation:** if Chrome requests clarification, point to
> the 80 KB Privacy Policy + "More details on permissions" section above.

---

## Tab: Translations / Multi-language listing

After the Bahasa listing is created (or in the same submission batch):

1. Click **Add translation** → select **English (US)**
2. Paste the EN short description and EN detailed description from
   `extension/STORE_LISTING.md`
3. Save & verify the preview

Translation fields should be:

### Short description (EN, 113 chars)
```
Compare Indonesian marketplace prices while you shop. Auto-track Shopee, Tokopedia, Bukalapak, Lazada, Blibli, TikTok Shop. Free, open-source, no ads.
```

---

## Tab: Package

### Upload package
```
Drag-drop or browse: bijakbeli-extension-v3.0.1.zip
```
*(Built by `bash extension/build-zip.sh`. Expect ~35 KB.)*

### Justification (re-upload): Not needed for first submission.

---

## Tab: Store listing graphics

### Required upload: Small promo tile
```
Drag-drop: scripts/marketing-assets/captured/polished/promo-small-440x280.png
```
Exact dimensions 440×280. ✓

### Recommended: Marquee promo tile
```
Drag-drop: scripts/marketing-assets/captured/polished/promo-marquee-1280x800.png
```
Exact dimensions 1280×800. ✓ (Optional, increases visibility if selected for featured placement.)

### Required upload: At least 1 screenshot
```
Drag-drop 5 in order:
1. captured/screenshots/01-landing.png          (1280×800)
2. captured/screenshots/02-installed.png        (1280×800)
3. captured/screenshots/03-setup.png            (1280×800)
4. captured/screenshots/05-compare.png          (1280×800)  ← better than 04 below
5. captured/real/sidepanel-real-420x800.png     (420×800)   ← re-capture at 1280x800 if needed
```

> ⚠️ **CWS rejection risk**: ensure screenshot 5 (`05-compare.png`) shows the
> real sidepanel UI in active state, not the "Missing URL" empty error.

**Recommended rename before upload**: re-number screenshots so the BEST
visual comes first. Order matters for first impression:

```
1. captured/screenshots/05-compare.png OR custom-real-extension.png (killed visual)
2. captured/polished/sidepanel-mockup-1280x800.png    (hi-fi mockup)
3. captured/screenshots/02-installed.png              (onboarding workflow)
4. captured/screenshots/03-setup.png                 (configuration)
5. captured/screenshots/01-landing.png               (overview)
```

---

## Tab: Review / Submit

### Justification for "Single purpose" reviewer question
```
BijakBeli has one purpose: help Indonesian shoppers compare marketplace
prices. Features (sidepanel UI, watchlist, notifications) all serve this
purpose. The 8 host_permissions are scoped to 6 marketplace product pages
specific to price comparison. No bundled ad-blocker, no coupon finder,
no cashback feature.
```

### Pre-submit confirmations
- [x] Manifest V3 ✓
- [x] Icons 16/48/128 ✓
- [x] Permissions justified ✓
- [x] Privacy policy URL live ✓ (verified by `preflight-check.sh`)
- [x] No remote code execution ✓
- [x] No obfuscation ✓
- [x] Stable extension ID across updates ✓ (manifest `key` present)
- [x] Pre-flight script passes 7/7 ✓
- [x] Vitest 665/665 + E2E 23/23 ✓

### Click **Submit for review**
- Expected review time: 1-7 business days (typical 3 days for MV3 with
  scoped permissions)

---

## After submit

1. Watch `master` branch — CWS review feedback sometimes pulls commits
2. If rejection email arrives, see `REJECTION_RESPONSE_KIT.md` for
   pre-drafted counter-arguments by category
3. After approval: set `NEXT_PUBLIC_CWS_PUBLISHED=true` + extension ID env
   vars in production Vercel → /extension landing page auto-flips to
   "Live on Chrome Web Store" banner

---

> Last updated: 2026-06-28. If your paste values don't match expected
> fields in the dashboard, the CWS UI changed — re-check this doc against
> the actual dashboard screens.
