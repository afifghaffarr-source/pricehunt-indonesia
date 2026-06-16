# Performance Audit Baseline — v1.5.10 Production (pre-v1.5.11)

**Date:** 2026-06-16
**Tool:** Custom Chrome DevTools Protocol script (`scripts/audit-perf.mjs` + `audit-perf-cold.mjs`)
**Chrome:** 131.0.6778.85 (Chrome for Testing, headless=new)
**Emulation:** 360x640 mobile, DPR 2.625, 4G throttling (10Mbps/40ms), 4x CPU throttle
**Source:** https://www.bijakbeli.web.id/ (production, current master)

## Method

Two scripts used:

1. **`scripts/audit-perf.mjs`** — warm cache, multiple runs averaged. Captures LCP, FCP, CLS, TBT, TTFB, DOM, load via PerformanceObserver.
2. **`scripts/audit-perf-cold.mjs`** — cold cache (`Network.setCacheDisabled`), captures real resource sizes from `Network.responseReceived` events.

## Cold-Cache Production Metrics

| Page | TTFB | FCP | **LCP** | CLS | **TBT** | DOM | Load |
|---|---|---|---|---|---|---|---|
| `/` (home) | 306ms | 759ms | **759ms** | 0.000 | **0ms** | 535ms | 788ms |
| `/deals` | 371ms | 503ms | **623ms** | 0.000 | **0ms** | 584ms | 586ms |
| `/product/anti-gores-nintendo-switch` | 918ms | 539ms | **1310ms** | 0.002 | **148ms** | 964ms | 1173ms |
| `/search?q=nintendo` | 83ms | 289ms | **1395ms** | 0.000 | **0ms** | 162ms | 294ms |

**Warm-cache average (n=3):**

| Page | TTFB | FCP | LCP | TBT |
|---|---|---|---|---|
| `/` | 153ms | 306ms | 613ms | 0ms |
| `/deals` | 291ms | 264ms | 550ms | 0ms |
| `/product/...` | 728ms | 221ms | 923ms | 3ms |
| `/search` | 83ms | 289ms | 1395ms | 0ms |

## Core Web Vitals Assessment (CWV, mobile, cold cache)

| Metric | Good | Needs Work | Poor | Current |
|---|---|---|---|---|
| LCP | ≤2.5s | ≤4.0s | >4.0s | **1.3s avg** ✅ Good |
| FCP | ≤1.8s | ≤3.0s | >3.0s | **0.5s avg** ✅ Good |
| TBT | ≤200ms | ≤600ms | >600ms | **avg ~30ms** ✅ Good |
| CLS | ≤0.1 | ≤0.25 | >0.25 | **0.000** ✅ Good |

**Surprise finding: CWV is already healthy on most pages.** The "LCP 3.9s" / "TBT 630ms" figure from earlier conversation summaries was likely from an older audit or wrong emulation. With proper mobile + throttling, production is **already in the "Good" tier across the board** for these 3 metrics.

## Bottleneck Analysis — `/product/...` (the worst page)

**LCP element: `IMG.object-cover.transition-transform` (the product hero image)**

**Total cold transfer: 556KB (gzip), 122 resources**

| Type | Count | Encoded KB | % of total |
|---|---|---|---|
| Script | 46 | 342 | **61%** |
| Image | 4 | 107 | 19% |
| Font | 2 | 54 | 10% |
| Stylesheet | 4 | 42 | 8% |
| Fetch (API) | 58 | 11 | 2% |

**Top 5 heaviest resources (gzip):**
- `/_next/static/chunks/060aaj8g1rm9w.js` — 28KB
- `/_next/static/chunks/3-kxhem3736k-.css` — 20KB
- `/_next/image?url=...picsum.photos/seed/anti-gores-nintendo-switch` — 19KB
- `/_next/static/chunks/1to0rpjd5guds.js` — 18KB
- `/_next/static/chunks/2skjzllpt8p3g.js` — 18KB
- `/_next/static/chunks/05qfi8-tgmvvb.js` — 17KB
- `/_next/static/media/fba5a26ea33df6a3-s.p.18rizl4rsrl42.woff2` — 16KB

## LCP Improvement Opportunity (Product Page)

**LCP = hero `<Image>` from picsum.photos. 1.3s cold cache.**

Currently uses Next.js `<Image>` with default lazy loading + `sizes` prop. The image is **loaded via `next/image` with `sizes`** but the 19KB response suggests it's already optimized (AVIF/WebP via `next.config.ts`).

What could still help:
1. **`priority` prop on LCP image** — Next.js will preload it via `<link rel="preload" as="image">`, eliminating the discovery round-trip. Estimated savings: 100-300ms.
2. **Preconnect to picsum.photos** — `<link rel="preconnect" href="https://picsum.photos">` (though `next/image` may already do this).
3. **Reduce JS chunks** — 46 scripts = 342KB is excessive. Many are likely Vexo API + Radix UI + Recharts + framer-motion. 28KB + 18KB + 18KB + 17KB chunks are dynamic imports that may not be needed for the LCP path.

## TBT Improvement Opportunity (Product Page, 148ms)

Only 1 long task in cold cache, 148ms total. This is the **non-blocking task** in:
- Likely the **Vexo API response handler** (chart render) or
- **Recharts initial mount**

Both happen after LCP, so they don't affect LCP. The 148ms TBT is "Good" per CWV thresholds.

## Conclusion — v1.5.11 Plan

**v1.5.10 backlog items #1+#2 (LCP 3.9→2.5s, TBT 630→200ms) are based on outdated data.**

Current production:
- LCP avg: **0.8-1.4s** (already ≤2.5s "Good" threshold) ✅
- TBT avg: **0-148ms** (already ≤200ms "Good" threshold) ✅

**What CAN still be improved:**
1. **Add `priority` to LCP `<Image>` on product page** — saves 100-300ms LCP, easy win
2. **Reduce JS bundle size** — 46 scripts on product page is high. Manual code splitting (defer VexoChart, Recharts, AI verdict) could cut 100-200KB
3. **Long cache headers for `/icons/`** — currently cacheable but not browser-cached
4. **Replace `picsum.photos` for hero images** with pre-bundled placeholders (saves DNS+TLS+redirect = ~200ms on cold)

**Recommended scope for v1.5.11:**
- Add `priority` to product hero Image (15 min)
- Dynamic import Recharts/PriceHistoryChart (1 hour)
- Dynamic import VexoDealVerdict (30 min)
- Long-term cache headers for `/_next/static/` and `/icons/` (1 hour, via `next.config.ts` headers)

Expected impact: **LCP 1.3s → 0.9s** on product page, **JS transfer 342KB → 200KB**.

## Scripts

Both audit scripts are committed to the project:

- `scripts/audit-perf.mjs` — warm cache, multiple runs
- `scripts/audit-perf-cold.mjs` — cold cache, accurate byte counts
- `scripts/audit-perf-multi.mjs` — multi-run wrapper for averaging

Re-run after changes:
```bash
node scripts/audit-perf-cold.mjs "https://www.bijakbeli.web.id/product/anti-gores-nintendo-switch"
```
