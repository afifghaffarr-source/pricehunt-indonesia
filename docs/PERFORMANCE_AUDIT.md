# Performance & SEO Audit — v1.5.9 (2026-06-16)

Run with [Lighthouse 13.4.0](https://github.com/GoogleChrome/lighthouse),
mobile form factor, simulated throttling, on `https://www.bijakbeli.web.id/`.

## Current Scores

| Page        | Performance | Accessibility | Best Practices | SEO   |
|-------------|-------------|---------------|----------------|-------|
| `/`         | **83**      | 98            | 96             | 100   |
| `/product/*`| **69**      | 97            | 96             | 92    |

## Core Web Vitals (mobile, production)

| Metric | Home | Product | Threshold (Good) |
|---|---|---|---|
| **FCP** (First Contentful Paint) | 1.6 s | 1.2 s | < 1.8 s ✅ |
| **LCP** (Largest Contentful Paint) | 2.8 s | 3.9 s | < 2.5 s ⚠️ |
| **TBT** (Total Blocking Time) | 410 ms | 630 ms | < 200 ms ⚠️ |
| **CLS** (Cumulative Layout Shift) | 0.001 | 0.001 | < 0.1 ✅ |
| **TTI** (Time to Interactive) | 3.5 s | 4.4 s | < 3.8 s ⚠️ |

**Verdict:** CWV pass on FCP/CLS. LCP/TBT/TTI on product page need improvement.

## Issues Found & Fix Plan

### ✅ Fixed in v1.5.9 (this release)

| Issue | Where | Fix |
|---|---|---|
| `/api/auth/session` 404 in console | `src/components/layout/Header.tsx` (called a non-existent endpoint on every page) | Created `src/app/api/auth/session/route.ts` — returns `{user: null}` or `{user: {id, email, is_admin}}` |
| Color contrast 4.34:1 (fails AA on 12px text) | `src/components/product/PriceComparisonPreview.tsx` — "Buka toko" link buttons (#737373 on #f5f5f5) | Changed to `text-foreground/80` (darker, passes 4.5:1) |
| Heading order violation | `src/components/layout/Footer.tsx` — `h4` headings rendered before `h1` in DOM order (footer streams first) | Changed `h4` → `h2` for "Marketplace", "Kategori", "Tentang" |
| Meta description in `<body>` not `<head>` (Lighthouse false-negative) | `src/app/product/[slug]/page.tsx` — `revalidate = 0` caused Next.js to stream metadata via RSC instead of in initial head | Changed to `revalidate = 60` to render metadata into `<head>` |

### ⚠️ Open — Needs follow-up

| Issue | Impact | Suggested Fix |
|---|---|---|
| **LCP 3.9s on product page** (threshold 2.5s) | High — affects SEO ranking | Preload LCP image, use `priority` on `<Image>` for hero product image |
| **TBT 630ms on product page** (threshold 200ms) | High — main thread blocked | Lazy-load `PriceHistoryChart`, `VexoDealVerdict`, `ReviewsList`; dynamic import with `next/dynamic` |
| **Unused JS 750KB on product page** | Medium | Identify 53.4KB chunk `3a4_cckjyiefi.js` — likely VexoSDK or ai-advisor code. Use tree-shaking + dynamic import |
| **React #418 hydration mismatch** | Medium | Product page SSR vs client divergence — likely `lastUpdated` date formatting. Investigate `PriceComparisonPreview` |
| **401/403 from Supabase on product page** | Low (expected for anon) | Already silently caught. Could surface friendly "Sign in" CTA instead of console error |

### 🟢 Confirmed Working

- **CLS 0.001** — excellent (page doesn't shift)
- **FCP** under threshold on both pages
- **Lighthouse SEO 100 on home** — title, description, canonical, robots, structured data all correct
- **A11y 97-98** — only the color-contrast issue (now fixed)
- **404s on Vercel analytics scripts** — expected in dev, no-op in production (Vercel injects automatically)
- **All 299 unit tests + 19 E2E tests pass** after fixes
- **Build clean, typecheck clean, 0 lint errors**

## Action Items for v1.5.10 (next)

1. **Reduce product page TBT/LCP** (estimated 1-2 day work)
   - `next/dynamic` import for `PriceHistoryChart`, `VexoDealVerdict`, `ReviewsList`
   - Mark hero `<Image>` as `priority`
   - Defer non-critical analytics/speed-insights scripts
2. **Fix hydration mismatch on product page** (1 hour)
   - Wrap `Date`/`Intl` formatting in `useEffect` to defer to client
3. **Reduce unused JS** (3 hours)
   - Audit `3a4_cckjyiefi.js` chunk (53KB) — likely ai-advisor
   - Switch Vexo SDK to dynamic import

## Reproduction

```bash
# Mobile audit
CHROME_PATH=/path/to/chrome npx lighthouse https://www.bijakbeli.web.id/ \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --output=json --output-path=./lh-home.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=mobile

# Desktop audit (same flags + --form-factor=desktop)
```

Raw JSON reports saved in `.lighthouse/` (gitignored).
