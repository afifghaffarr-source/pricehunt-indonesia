# Post-Launch Operations Guide

Operational playbook for after BijakBeli v3.0.1 publishes to the Chrome Web Store.

---

## Daily (week 1)

### 1. Check CWS dashboard for new reviews

URL: https://chrome.google.com/webstore/devconsole
- Open the BijakBeli listing → "Reviews" tab
- Look for: numeric rating, written feedback, "Report abuse" flags
- Reply to every 1-3 star review within 24 hours
- Mark 5-star reviews as "Reviewed" (helps CWS ranking)

### 2. Monitor `/api/extension/current-price` health

This is the route that all extension users hit. Has it stayed green post-launch?

```bash
curl -sI https://www.bijakbeli.web.id/api/extension/current-price?url=test
# Expect: 400 (bad URL) or 404 (not in DB), NOT 502/503/504
```

If 5xx: check Vercel logs at https://vercel.com/afif-s-projects5/pricehunt-indonesia/logs

### 3. Skim error reports via CF Workers analytics

> **Note:** Sentry is intentionally NOT integrated (see comment in `extension/REJECTION_RESPONSE_KIT.md`
> § 1). CF Workers built-in analytics + Vercel runtime logs are the source of truth.

- Vercel: Settings → Logs → Errors tab (last 24h)
- Look for: stack-traces mentioning `current-price`, `INGESTION_SECRET`, or `chrome-extension`

### 4. Watch for support emails

- privacy@bijakbeli.id — auto-forwarded to Hermes/Telegram
- Reply within 24h with: acknowledgement + reproduction steps (if bug) or privacy
  policy link (if question)

---

## Weekly

### 1. Review install / uninstall numbers

CWS Developer Console → "Statistics" tab. Trending up = good. Sudden uninstall spike = investigate.

### 2. Update privacy policy if schema changes

If you add new permissions, change data scope, or start collecting a new data
category → update `/extension/privacy-policy` same day. Chrome will pick up the
new policy on next publish; CWS dashboard compares declared policy against
manifest automatically.

### 3. Verify pre-flight script still passes

```bash
BASE_URL=https://bijakbeli.web.id bash extension/preflight-check.sh extension
```

Expect all 7 checks PASSED. If not → fix before the next push.

---

## Quarterly (or pre-update)

### When shipping a minor/patch update

1. Bump version in `extension/manifest.json` (`x.x.Y` for patch, `x.Y.0` for minor)
2. Add row to `extension/CHANGELOG.md`
3. Re-run `capture:extension:real` to refresh screenshots IF UI changes
4. Re-run `capture:marketing` to refresh tiles IF branding changes
5. Run full test suite: `npm test` + `npm run test:e2e:routes`
6. Build zip: `bash extension/build-zip.sh`
7. Submit via CWS dashboard → "Package" tab → upload new zip

> **Version policy:** the manifest `key` field preserves the extension ID
> across updates. Users will NOT need to uninstall + reinstall — they get
> the update automatically.

### When shipping a major update

Major updates that change content-script structure or add new permission types
require:
- Manual user re-consent in side panel
- New CWS review (~3-7 days, sometimes up to 14)
- Privacy policy update + dashboard re-declaration if data categories change

### Rollback procedure

If v3.0.2 has critical bug shipped:
1. CWS Dashboard → BijakBeli listing → "Distribution" tab
2. "Pause distribution" (hides from new installs; existing users keep current version)
3. Publish v3.0.3 with hotfix
4. After v3.0.3 stable: resume distribution

Do NOT unpublish (cannot re-publish to same extension ID; users get auto-removed).

---

## Marketplace coverage

If a marketplace changes their DOM structure (price element class, etc.),
content scripts break silently:

### Detection
- Watch `/api/extension/current-price`: increase in `404` responses per
  marketplace could mean marketplace changed HTML
- Increase in queue-retry counts in side panel → users losing confidence

### Response
1. Browse the marketplace manually in Chrome; verify price still extracts
2. If broken: update `extension/marketplace-scraper.js` selectors
3. Test in dev: `npm run test:e2e:routes` validates `host_permissions` still match
4. Ship as patch

---

## Domain & Vercel monitoring

- `bijakbeli.web.id` DNS is on Vercel. If the canonical Alias gets stuck on old deploy
  (has happened twice already): `vercel alias ls` shows current state. Manual fix:
  Vercel Dashboard → Settings → Domains → remove + re-add.
- The pre-flight script is the canary: if it fails on Step 5 or 6, prod is stale.

---

## Customer support guide

Common tickets (from extension reviews) and templated replies:

### "Extension doesn't work on my Shopee"
> Thanks for the report. Can you share: (1) your Chrome version, (2) the product URL that failed to scrape, (3) the message shown in the side panel?
>
> Common cause: Shopee + Tokopedia are SPAs — after the first product load, navigation happens without page reload. Our content script watches for this. If it still fails, please share the console output (right-click extension icon → Inspect popup → Console tab).

### "Is this safe?"
> Yes — full source code at github.com/afifghaffarr-source/pricehunt-indonesia. We never collect personal data, never sell data, no ads. Privacy policy: bijakbeli.web.id/extension/privacy-policy. Drop us an email if you want any specific code path explained.

### "Will you support [Wish/Amazon/etc]?"
> Currently focused on Indonesian marketplaces (Shopee, Tokopedia, Lazada, Blibli, Bukalapak, TikTok Shop). Each new host requires CWS review, so we add carefully. Open a feature request at github.com/.../issues if you'd like to see a specific marketplace.

### "How do I uninstall?"
> Chrome → three-dot menu → Extensions → find BijakBeli → Remove. All data wiped on uninstall (we don't retain anything server-side).

---

## KPIs to track

| Metric | Source | Target (week 1) | Target (month 1) |
|---|---|---|---|
| New installs | CWS Console | 50+ | 500+ |
| Active users (W0 from install) | CWS Console | 60% | 65% |
| Avg rating | CWS Console | 4.0+ | 4.3+ |
| API 5xx error rate | Vercel logs | <1% | <0.5% |
| Support emails | privacy@ inbox | <10/week | <5/week |
| Watchlist opt-in rate (sidepanel) | client-side | 20% | 25% |

---

## What to NOT do post-launch

❌ Don't add new permissions without re-reviewing privacy policy + Chrome data cert
❌ Don't ship an update without bumping version + updating CHANGELOG
❌ Don't bind the extension to a new domain without updating `homepage_url`
❌ Don't accept free-form user input into the content script (XSS risk)
❌ Don't remove `extension/manifest.json#key` — extension ID becomes unstable
❌ Don't directly query marketplace DOM without try/catch (anti-bot can throw)
❌ Don't rely on `setInterval` in a service worker — use `chrome.alarms`
❌ Don't ignore a sudden spike of negative reviews — investigate the same day

---

## Escalation: when things go wrong

### Extension rejected for the second time

If you've already replied once and been rejected again:
1. Read rejection email line-by-line
2. Match against `REJECTION_RESPONSE_KIT.md` categories — was it a known one?
3. If yes: ship the suggested fix + respond with verification
4. If no: this is a NEW policy interpretation by Google. Post on
   https://groups.google.com/a/chromium.org/g/chromium-extensions to ask
   other devs if they've seen similar
5. As last resort: open a CWS developer support ticket
   https://support.google.com/chrome_webstore/contact/one_off_support

### Critical security issue reported

If someone emails about a security flaw:
1. Acknowledge within 2 hours (even if just to confirm receipt)
2. Triag: confirm the vulnerability claim by reproducing locally
3. If confirmed: ship hotfix v3.0.X+1 immediately, don't wait for normal cadence
4. Add a SECURITY.md harness if this comes up again

### Marketplace blocks us (404s unblocked to extension user agents)

Some marketplaces aggressively block headless / extension-based scraping.
Detection: see error logs of `marketplace-scraper.js`.
If blocked:
- Rotate User-Agent via `chrome.webRequest.onBeforeSendHeaders` (... oh wait,
  MV3 doesn't allow that without declarativeNetRequest. Plan B: use the
  `chrome.userScripts` API in MV3.1+ or accept the limitation.)
- For Indonesian marketplace TOS: most are permissive to user-side price
  comparison but hostile to crawlers. The extension running inside a user's
  real browser is on shakier legal ground than cookie-free servers.
- Consider: only scrape what the user explicitly opens. We already do this.

---

> Last updated: 2026-06-28. Re-review after v3.1.0 lands.
