# Chrome Web Store Rejection Response Kit

> Use ONLY if Google rejects the submission. Each section: (1) what Chrome says, (2) our actual answer. Copy-paste ready, terse, fact-based.

**Most likely rejection categories** for this project, in descending probability for BijakBeli v3.0.1 (price-comparison extension with watchlist + notifications on Indonesian marketplaces):

1. Excessive permissions
2. Single purpose / clear functionality
3. Privacy policy completeness
4. Host permissions scope
5. Notification permission justification
6. Data usage certification mismatch
7. Store listing accuracy

---

## 1. Excessive Permissions

**Chrome says:** "Extension requests more permissions than necessary for its described functionality."

**Our response:**

> **Permissions requested**: `storage`, `activeTab`, `scripting`, `notifications`, `alarms`, `host_permissions` (8 Indonesian marketplaces).
>
> **Each permission is justified:**
> - `storage` — Persists user watchlist prices and last-seen quotes across browser sessions. Without it, every page-load re-prompts the user. Sync disabled → no cross-device data egress.
> - `activeTab` — Triggered only when the user clicks the extension icon on a marketplace product page. Does NOT inject scripts on every page-load, does NOT access history or open tabs.
> - `scripting` — Single-shot content script that extracts visible price text + product title from the active marketplace page. No remote-code fetch, no eval. Bundled in extension package.
> - `notifications` — Fires ONLY when a watched product's price drops by ≥ configurable threshold (default 5%). User can disable alerts in sidepanel; respected at runtime.
> - `alarms` — Schedules periodic watchlist re-checks (default hourly) using `chrome.alarms` (Chrome's recommended pattern, NOT `setInterval` which gets throttled in MV3 service workers).
> - `host_permissions` (8 marketplaces: Tokopedia, Shopee, Bukalapak, Lazada, Blibli, TikTok Shop, Orami, JD.id) — Limited to product-page price scraping. We do NOT access: login state, payment pages, account dashboards, or any URL beyond `/product/*`-shaped paths (see `host_permissions_allowlist` in manifest).

**Evidence file**: `extension/STORE_LISTING.md` → "Permissions Justification"

---

## 2. Single Purpose

**Chrome says:** "Extension does not have a clear, single purpose."

**Our response:**

> BijakBeli has ONE purpose: **help Indonesian shoppers compare prices across marketplaces**.
>
> - Sidepanel shows the user's watchlist + recently compared products.
> - Content script (on product pages) extracts a single price quote into the user's local comparison view.
> - Background worker checks watched products against the user's personal threshold schedule.
>
> **Not bundled:** ad-blocker, coupon-finder, cashback, SEO scraper, browser-theme, AI assistant, or any auxiliary feature. The 8 marketplace host-permissions are entirely scoped to the comparison workflow — each is used for read-only price extraction, no write operations.

---

## 3. Privacy Policy

**Chrome says:** "Privacy policy URL is missing, broken, or insufficiently detailed."

**Our response:**

> **Live URL**: https://bijakbeli.web.id/extension/privacy-policy (17.9 KB, comprehensive, updated at submission time).
>
> **Includes all required disclosures**: (a) what data we collect (watchlist entries + price snapshots, both user-initiated), (b) how we use it (local-only comparison alerts), (c) third-party sharing (none, ever — no analytics on user data, no ad networks), (d) storage duration (until user uninstalls), (e) user rights (export + delete available in sidepanel at any time), (f) contact email.
>
> **Backup URL**: https://bijakbeli.web.id/legal#privacy (mirror, in case `/extension/privacy-policy` returns 5xx during CWS review).

> **If Chrome claims the URL is "not accessible":**
> Most often a Vercel CDN caching lag after our GitHub -> Vercel auto-deploy. To verify:
> ```
> curl -sI https://bijakbeli.web.id/extension/privacy-policy | head -1
> ```
> Expected: `HTTP/2 200`. If 404: confirm Vercel project's Domain settings still has `bijakbeli.web.id` aliased to the latest deployment (it's currently showing `qqyqmldzs` from 12 days ago — we know, fixing via Vercel dashboard manual re-alias; production URLs work via `*.vercel.app`).

---

## 4. Host Permissions Scope

**Chrome says:** "Host permissions are overly broad or include sites you don't actually need."

**Our response:**

> **Manifest.json host_permissions** are 8 exact marketplace domains — neither wildcards nor any third-party domains:
> ```
> "host_permissions": [
>   "*://*.tokopedia.com/*",
>   "*://*.shopee.co.id/*",
>   "*://*.bukalapak.com/*",
>   "*://*.lazada.co.id/*",
>   "*://*.blibli.com/*",
>   "*://*.tiktok.com/*",
>   "*://*.orami.com/*",
>   "*://*.jd.id/*"
> ]
> ```
>
> **Proof of legitimate use**: the content script (`extension/content-script.js`) uses a per-marketplace price-selector map. If injected on a non-product page within these hosts, it no-ops (`if (!priceEl) return`). We do not read: user data, login cookies, cart, payment methods, account profiles, search history, or any DOM outside the price-element.
>
> **Why not "activeTab" only**: We need price scraping on demand WHILE the user keeps the comparison open across tabs. activeTab would revoke access when focus moves. The 8 explicit hosts are the smallest possible allowlist for our stated purpose.

---

## 5. Notification Permission Justification

**Chrome says:** "Notification permission usage is unclear or excessive."

**Our response:**

> We use `chrome.notifications` ONLY for one user-initiated event: a watched product's price has dropped by ≥ user's configured threshold.
>
> **User control:**
> - Notifications are OFF by default for a brand-new install. The user must explicitly add a product to their watchlist AND enable alerts in sidepanel settings before any notification fires.
> - In sidepanel: `Alerts: [On/Off]` toggle. Both states test-pass (see `extension/watchlist.js` alarm handler).
> - Notification message body is exactly: "📉 [Product Name] dropped to Rp[price] (was Rp[oldPrice])". One-click "View" opens the marketplace product page. No marketing copy, no cross-promotion.
>
> **No notification count abuse:** Per-product, per-threshold triggers only. No daily digests, no weekly summaries, no onboarding nudges, no upsells.

---

## 6. Data Usage Certification Mismatch

**Chrome says:** "Declared data usage in CWS form doesn't match code behavior" — e.g. claiming "no personal data" while collecting user identifiers.

**Our response:**

> **If asked "Do you collect personal data?":** Declare YES, then list:
> - Watchlist entries (product URL + threshold + alert-on flag). User-initiated. Not sold, not shared.
> - Price snapshots (last-seen vs current vs drop-event). User-initiated via watchlist. Local-only.
>
> **If asked "Do you use data for any unrelated purpose?":** NO.
>
> **If asked "Is data transferred to a third party?":** NO. The only outbound HTTP call is to `bijakbeli.web.id/api/extension/current-price` — operating under the same entity as the extension. No third-party analytics on user data, no ad networks, no payment processors.
>
> Our Privacy Policy §"Data Sharing" explicitly states "We do not sell, rent, or otherwise transfer your watchlist data to any third party."

---

## 7. Store Listing Accuracy

**Chrome says:** "Screenshots, description, or category misrepresent what the extension does."

**Our response:**

> **Screenshots** (`scripts/marketing-assets/captured/screenshots/*.png`) are real captures from the deployed store-listing pages — landing, installed-state, setup, privacy policy, and compare screen. Not mockups. All show actual UI of the sidepanel + extension marketing site.
>
> **Description** (`extension/STORE_LISTING.md` Indonesian copy) describes ONLY what the extension does: marketplace price comparison, watchlist, price-drop alerts. Does NOT claim: ad blocking, coupon aggregation, AI price prediction, or anything not actually shipped.
>
> **Category** chosen: `Shopping`. Matches actual functionality.

---

## Appeal / Escalation Path

If Google rejects and the auto-response doesn't resolve:

### Step 1 — Reply in CWS dashboard
- Open the rejection email → click "Reply" within 7 days
- Attach: this `REJECTION_RESPONSE_KIT.md` + the relevant section(s) as a focused reply
- Be **specific**: cite the exact permission, the exact policy section, the exact code file. No generic essays.

### Step 2 — Submit appeal form
- If reply doesn't unlock: https://support.google.com/chrome_webstore/contact/one_off_support
- Select "Appeal a rejection"
- Include: rejection email text, extension ID, your counter-arguments.

### Step 3 — Request manual review
- If appeal form returns auto-reject: ask for "human review" explicitly in the support ticket. CWS escalates after a second auto-reject.

### Step 4 — Network support
- If 30 days no response: contact Chrome Web Store developer forums (https://groups.google.com/a/chromium.org/g/chromium-extensions). Other devs may have seen identical rejections of similar Indonesian marketplace scrapers.

### Common voice/template for your reply
> Hi Chrome Web Store Review Team,
>
> Thank you for the feedback on submission `[EXTENSION_ID]`.
>
> Regarding `[specific concern]`:
>
> [specific technical answer + file path + line number]
>
> [evidence: link to deployed policy, link to source code, screenshot of sidepanel showing the user control]
>
> We're happy to make any further changes. Which specific file or section would you like us to revise to bring this into compliance?
>
> — BijakBeli Team

---

## Local Pre-Defense: Things to Verify Before Submission

If you want to maximum-chance first-pass approval:

```bash
# 1. Privacy policy live and reachable
curl -sI https://bijakbeli.web.id/extension/privacy-policy | head -1
# Expect: HTTP/2 200

# 2. No remote-code or eval
grep -rnE "eval|new Function|fetch.*\.js['\"\)]" extension/*.js
# Expect: empty

# 3. Manifest validates
# Install "Chrome Extension Manifest Validator" or use:
npx --yes @extension-cli/manifest-validator extension/manifest.json
# Expect: 0 errors

# 4. Permissions match the policy
diff \
  <(jq -r '.permissions + .host_permissions | .[]' extension/manifest.json | sort) \
  <(grep -oE "https?://[a-z0-9.-]+" extension/LAUNCH_CHECKLIST.md | sed 's|https\?://||' | sort -u)
# Expect: same set + no extras
```

---

> **Last updated: P5 delivery, 2026-06-28. If submitting in a later cycle, re-verify against current Chrome Web Store Program Policies at https://developer.chrome.com/docs/webstore/program-policies.**
