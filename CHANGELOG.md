# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - v1.5.12.1 (2026-06-16) — CI Lint Regression

- **`@typescript-eslint/no-explicit-any` in `src/components/ui/input.tsx`** (3 errors blocking CI #249)
  - The `mergeProps<A, B>` helper used `any` for the output accumulator and `(b as any)[k]` for the dynamic-key read
  - Replaced with proper generics: `<A extends object, B extends object>`, `Object.keys(b) as (keyof B)[]`, `Object.assign(out, { [k]: v })`
  - Same 0-byte bundle impact, same runtime behavior, type-safe
  - **CI had been failing for 5 commits** since v1.5.10 bundle optimization (`f47d3c1`) introduced these `any` types. All other workflows (E2E, Lighthouse, Vercel deploy) kept working — only the `npm run lint` step blocked.

### Added - v1.5.12 (2026-06-16) — Lighthouse CI Integration

- **Lighthouse CI runner** (`scripts/lighthouse-ci.mjs`)
  - Mobile preset against local `next start` server (412×823, 4G, 4× CPU)
  - Asserts category scores + Core Web Vitals; exits non-zero on breach
  - Writes per-URL HTML reports + `summary.json` to `./lighthouse-reports/`
  - Uses existing `lighthouse` + `chrome-launcher` devDeps (no `@lhci/cli` added)
- **GitHub Actions workflow** (`.github/workflows/lighthouse.yml`)
  - Runs on PRs and pushes to master
  - Builds, starts `next start`, audits 5 public URLs (`/`, `/deals`, `/search`, `/leaderboard`, `/legal/privacy`)
  - Posts summary table as PR comment, uploads HTML reports as artifact
  - `concurrency` group cancels in-progress runs on new push
- **Config** (`lighthouserc.json`)
  - Single source of truth for thresholds. Tuned for LOCAL `next start` (no CDN/brotli/image-opt).
  - perf ≥0.50, a11y/bp/seo ≥0.90; LCP ≤6s, CLS ≤0.25, TBT ≤1.5s (error); FCP ≤1.8s, SI ≤3s (warn)
  - See `docs/LIGHTHOUSE_CI_v1512.md` for full rationale and local-vs-prod gap analysis
- **npm scripts:** `lhci`, `lhci:report` (also writes JSON), `lhci:advisory` (never fails)
- **Baseline findings** (local `next start`, 2026-06-16):
  - All 5 URLs pass current thresholds
  - **Bug found:** `/leaderboard` CLS 0.194 (fails CWV "Good" ≥0.1) — empty→populated layout shift
  - **Production is ~10-20 points higher** (Vercel edge cache + brotli + image opt adds ~1-2s of headroom)
  - Live `/` and `/deals` are in CWV "Good" tier: perf 0.90/0.94, LCP 2.58/2.63s, CLS 0.001/0.000

### Added - v1.5.11 (2026-06-16) — LCP Optimization

- **Performance audit baseline** (`docs/PERF_BASELINE_v1510.md`)
  - Custom Chrome DevTools Protocol script (`scripts/audit-perf.mjs` + `audit-perf-cold.mjs`) for mobile Lighthouse-style metrics
  - Captures FCP, LCP, CLS, TBT, TTFB, DOM, load, plus per-resource byte breakdown
  - Mobile emulation: 360x640, DPR 2.625, 4G (10Mbps/40ms), 4x CPU throttle
  - **Surprise finding:** LCP avg 0.8-1.4s and TBT 0-148ms across all pages — **already in CWV "Good" tier** (thresholds LCP ≤2.5s, TBT ≤200ms). The "LCP 3.9s" / "TBT 630ms" figure in earlier summaries was outdated.

- **LCP fix on product pages** (`src/components/common/VexoImageFallback.tsx`)
  - The product hero image is the LCP element. Previously it waited for the VexoAPI waterfall (marketplace → images → picsum fallback) inside `useEffect` before the `<Image>` mounted. With VexoAPI always 503ing, this cost 100-300ms of dead time on every product page load.
  - Now compute the deterministic `picsum.photos` URL **synchronously** from the product name in the initial render so the `<Image>` mounts immediately with a real src.
  - The `useEffect` still upgrades to a real marketplace image when VexoAPI succeeds — but the LCP path no longer depends on it.
  - **Measured impact (cold cache, mobile):**
    - Product page LCP: 1310ms → 981ms (**-329ms, -25%**)
    - Search page LCP: 1395ms → 1183ms (**-212ms, -15%**)
    - Home page LCP: 759ms → 683ms (**-76ms, -10%**)

### Added - v1.5.10 (2026-06-16) — Migration Audit + Reviews System

- **Migration audit report** (`docs/MIGRATION_AUDIT_v1510.md`)
  - Found 9 tables missing in production due to duplicate version numbers
    in the migration directory (002, 003, 100, 111, 112, 114, 116, 120)
  - Supabase CLI does not enforce unique version numbers; manual SQL
    Editor apply path masked the gap until runtime `PGRST205` errors
  - Re-ran 4 missing migrations: 002_api_registry, 003_product_reviews,
    100_job_logs_system, 121_admin_users
  - 5 new tables: `admin_users`, `api_source_categories`,
    `api_source_credentials`, `api_source_health_checks`,
    `api_source_usage_logs`, `api_sources`, `job_logs`,
    `product_reviews`, `review_helpfulness`
- **New migration `131_product_reviews_user_profiles_fk.sql`**
  - Original `003_product_reviews.sql` only created FK to `auth.users`
  - Reviews API joined `user_profiles!inner(...)` which failed with
    `PGRST200` (no relationship found in schema cache)
  - Added explicit FK `product_reviews.user_id → user_profiles.id`
    (and same for `review_helpfulness`)

### Fixed - v1.5.10 (2026-06-16)

- **`PGRST205` on `/api/products/[id]/reviews`** — table `product_reviews`
  didn't exist in production. Re-applied migration 003 + added FK.
  `ReviewsList` now renders the empty state instead of an error banner.
- **`PGRST200` on reviews join** — added `user_profiles` FK so the
  PostgREST join works. Verified end-to-end with a real product ID.
- **`100_job_logs_system.sql` RLS policy** — was using the deprecated
  `user_profiles.is_admin` (JSONB boolean). Replaced with `EXISTS
  (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)`.
- **Recharts `width(-1)/height(-1)` warning** (`PriceHistoryChart`)
  - Replaced `ResponsiveContainer` with `useResizeObserver` + `useState`
  - Chart only renders when parent has positive dimensions
  - Added `min-w-0` to prevent flexbox shrink-to-zero
- **Removed dead `available: false` short-circuit** in
  `src/app/api/products/[id]/reviews/route.ts` and
  `src/components/product/ReviewsList.tsx` — was a temporary graceful
  fallback for the missing table. The real error path is now exercised.
- **53KB unused-JS chunk removed** (`src/components/ui/input.tsx`)
  - `@base-ui/react/input` is a 1-line wrapper around `Field.Control`
    that pulled in 53KB of form/validation code transitively
  - Rewrote `Input` to use `useRender` (same pattern as `Badge.tsx`),
    wrapping a native `<input>` with our className
  - 53KB chunk (`43fbv80stluft.js` in prior build) is gone; per-route
    first-load JS dropped ~30-50 KB raw (all gzip ratios)
  - Public API unchanged, so 17 consumer files don't need to change
  - 296/296 tests pass; all routes still 200; verified `<input>` HTML output
- **React #418 hydration mismatch fixed** (`PushNotificationButton.tsx`)
  - `useState(() => typeof window !== "undefined" && "serviceWorker" in navigator ...)`
    returned `false` on server (no `window`) and `true` on client (`window`
    exists), causing React #418 "server rendered HTML didn't match the
    client" error on every product page (the button is in the alerts section)
  - Standard fix: `useState(false)` initial + `useEffect` to detect support
  - SSR + first client render now both render `null` (early return);
    useEffect sets `supported = true` after mount, button appears
  - Verified: dev mode + production build both clean; 0 errors in browser
    console; 0 hydration warnings in Next.js dev overlay

### Added - v1.5.9 (2026-06-16) — Performance Audit + Quick Wins

- **`/api/auth/session` endpoint** (`src/app/api/auth/session/route.ts`)
  - Returns `{ user: null }` or `{ user: { id, email, is_admin } }`
  - Replaces the 404 that the Header component was logging on every
    page load. Client components can now check sign-in state without
    a 404 console error.
- **Performance audit report** (`docs/PERFORMANCE_AUDIT.md`)
  - Lighthouse 13 mobile scores: home 83/98/96/100, product 69/97/96/92
  - Documents CWV, current state, fixes applied this release, and
    action items for v1.5.10
  - Reproduction commands included

### Fixed - v1.5.9 (2026-06-16)

- **Color contrast on product page** — "Buka toko" link buttons in
  `PriceComparisonPreview` used `#737373` on `#f5f5f5` (4.34:1, fails
  WCAG AA for 12px text). Changed to `text-foreground/80` (passes 4.5:1).
- **Heading order violation on homepage** — footer had `<h4>` labels
  (Marketplace, Kategori, Tentang) that streamed into the DOM *before*
  the `<h1>` in the main content, breaking heading-order rule. Changed
  to `<h2>` so the order is logical.
- **Meta description streamed into `<body>`** — Next.js with
  `revalidate = 0` was streaming `generateMetadata` output via the RSC
  payload (in body) instead of into the initial `<head>`, making
  Lighthouse (and some crawlers) miss the description. Changed to
  `revalidate = 60` so the description is in `<head>` for both crawlers
  and audits.

### Notes

- 296 unit + 19 E2E pass, typecheck clean, lint 0 errors
- v1.5.10 backlog: reduce product page TBT/LCP (target 200ms / 2.5s),
  fix React #418 hydration mismatch, audit 53KB unused-JS chunk

### Added - v1.5.8 (2026-06-16) — Dynamic Open Graph Image Generator

- **4 dynamic Open Graph image generators** (`next/og` `ImageResponse`):
  - `src/app/opengraph-image.tsx` — homepage branded preview
  - `src/app/deals/opengraph-image.tsx` — deals page dark-gradient preview
  - `src/app/product/[slug]/opengraph-image.tsx` — per-product preview
    showing name, IDR price, marketplace count, Deal Score badge
  - `src/app/api/og/search/route.tsx` — **dynamic** search preview that
    reads the user's `?q=` query (opengraph-image file convention does
    not receive `searchParams`, hence the route handler)
- **Search page now has dynamic OG** — converted `src/app/search/page.tsx`
  from static `metadata` to `generateMetadata`. The `?q=` query now
  appears verbatim in the OG image title and HTML head.
- **Shared design tokens** — `src/lib/og-tokens.ts` (colors, radii,
  Indonesian IDR formatter) and `src/lib/og-fonts.ts` (cached Inter font
  loader from jsDelivr CDN, 400/700/800 weights).
- **Critical bug fix** — "Diskon 89%" label on product OG was
  misleading; the value is `dealScore` (0–100 rating), not a discount %.
  Now reads "Deal Score 89".

### Notes

- All OG images are 1200×630 PNG, ≤150KB, WCAG AA contrast
- Static optimization would lose dynamic params — `/search` uses a
  route handler, `/product/[slug]` uses `force-dynamic`
- Emoji glyphs (🛒, 🔥, ✓) intentionally removed because Satori's
  dynamic emoji font download fails in this build environment
- 296 unit + 19 E2E tests still pass; build clean; lint 0 errors

### Added - v1.5.7 (2026-06-16) — Google Search Console + Schema.org Structured Data

- **Google Search Console verification support** — env-driven
  - `src/app/layout.tsx`: `verification.google` driven by
    `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
  - User sets the env var in Vercel, redeploy, then clicks Verify in
    GSC. Zero code change needed after env is set.
- **JSON-LD structured data** (`src/lib/seo.tsx`, server-rendered):
  - `Organization` schema on homepage (brand info, logo, founding date,
    areaServed, knowsAbout)
  - `WebSite` schema on homepage with `SearchAction` pointing at
    `/search?q={search_term_string}` — enables Google's sitelinks
    searchbox
  - `Product` schema on product detail pages with `AggregateOffer` and
    per-marketplace `Offer` entries (sorted cheapest first). Includes
    price, currency (IDR), availability, URL, seller, shipping, and
    `priceValidUntil` 30 days out
  - `BreadcrumbList` on product pages (Beranda > Category > Product)
- **Env var placeholders** in `.env.local.example`,
  `.env.production.local.example`, and `tools/price-collector/QUEUE_COLLECTOR.md`
- **New doc**: `docs/GOOGLE_SEARCH_CONSOLE.md` — step-by-step guide
  for adding the property, verifying, submitting sitemap, requesting
  indexing, and monitoring performance

### Changed - v1.5.6 (2026-06-16) — Canonical Domain: bijakbeli.web.id + SEO Hardening

- **Domain consolidation: `www.bijakbeli.web.id` is now the canonical host**
  for both SEO (single canonical URL across `<link rel="canonical">`,
  `og:url`, sitemap, robots) and routing (308 permanent redirects from
  every other host).
- **`next.config.ts` host-based redirects** — 308 permanent:
  - `bijakbeli.web.id` (apex)            → `https://www.bijakbeli.web.id`
  - any `pricehunt-indonesia-*.vercel.app` deployment URL → `https://www.bijakbeli.web.id`
  - `bijakbeli-app.vercel.app` (the old `DEFAULT_APP_URL`) → `https://www.bijakbeli.web.id`
  Vercel preview deployments for this project also match (any
  `pricehunt-indonesia-…-owner.vercel.app` hash variant).
- **Explicit `<link rel="canonical">`** in the root layout via
  `alternates.canonical: '/'`. Next.js automatically resolves the canonical
  to `${metadataBase}${path}` for every child page, so all routes
  (homepage, /search, /product/*, etc.) now point at `www.bijakbeli.web.id`
  regardless of which host the request hit.
- **Deleted `public/robots.txt`** (static, stale `Sitemap:` line pointing
  at dead `www.bijakbeli.app`). The dynamic `src/app/robots.ts` is now
  the single source of truth, generated from `getAppUrl()`. Added the
  `host:` field for cross-host consolidation and explicit AI-crawler
  rules (GPTBot, PerplexityBot) so they keep public-catalog access open
  but stay out of `/api`, `/admin`, `/dashboard`, `/settings`.
- **Sitemap bug fix**: `is_active` filter was silently failing because
  the column doesn't exist on `products` (Postgres error 42703 was
  caught and the route returned only the 4 static pages, hiding all
  product pages from crawlers). Removed the filter; sitemap now lists
  all 64 products.
- **`getAppUrl()` updated**: `DEFAULT_APP_URL` is now
  `https://www.bijakbeli.web.id` (was the Vercel deployment URL).
  Updated every hardcoded fallback URL across the codebase:
  - `src/proxy.ts` (CORS allow-list default)
  - `src/app/product/[slug]/page.tsx` (social share URL)
  - `src/test/api-vexo-marketplace.test.ts` (test fixture)
  - All collector scripts (`collectors/*.py`)
  - All notification scripts (`check-alerts.js`, `deliver-price-alerts.mjs`,
    `price-alert-report.js`, `test-trigger-simulation.js`)
  - Chrome extension (`extensions/chrome/popup.{js,html}`,
    `background.js`, `manifest.json` host_permissions) and
    `extension/popup.js`, `extension/manifest.json`
  - All docs (README, BETA_QUICK_START, CHECKLIST, DOMAIN_SETUP,
    DEPLOYMENT_GUIDE, SECURITY_AUDIT_PLAN, TEST_REPORT, all docs/* and
    tools/* READMEs)
  - All `.env*.example` templates
- **Bonus fix — stale Supabase fallback URL**: `collectors/cron_scraper.py`
  and `collectors/cron_scraper_pool.py` had a hardcoded fallback to a
  different Supabase project (`siwmmzzhfzfndfmbbyvj.supabase.co`) that
  would have been used if `NEXT_PUBLIC_SUPABASE_URL` was unset, sending
  scraped data to the wrong database. Updated to the canonical
  `oklaxwjoyttpwgxhphko.supabase.co`.
- **Lint/Typecheck/Build**: clean. 299/299 unit tests, 19/19 E2E.
- **Vercel env action required**: update `NEXT_PUBLIC_APP_URL` in the
  Vercel project dashboard to `https://www.bijakbeli.web.id` so the
  build picks up the canonical URL at compile time (NEXT_PUBLIC_*
  is inlined into the client bundle). The `next.config.ts` redirects
  work regardless of this env, but `og:url`, sitemap, and robots
  won't update until the env is changed and the project is redeployed.

### Changed - v1.5.5 (2026-06-16) — Smarter Product Matching + Constraint Alignment

- **`offer-snapshot` route now uses `matcher.ts`** for product matching
  (TODO line 148 — closed). The old `ilike %name%` approach was replaced
  with `findBestProductMatch()` which considers:
  - **Negative keywords** (replica, used, KW, etc.) — immediate reject
  - **Title similarity** (Jaccard + containment)
  - **Variant compatibility** (storage, color, model)
  - **Price sanity** vs existing offers avg
  - **Cross-check** vs existing offer titles
  The route fetches all products (64 today, small set), runs the matcher,
  and uses the best match. When product catalog grows past ~500, add a
  category pre-filter to bound candidates.
- **`offer-snapshot` upsert `onConflict` changed** from `"url"` to
  `"product_id,marketplace_id"` to align with the v1.5.3 UNIQUE constraint.
  1 canonical offer per (product, marketplace) — 2 different URLs for the
  same pair now overwrite (was: silently create dupes, then get rejected
  by the constraint at insert time).
- **`push-notifications` cleans up expired subscriptions** (TODO line 90
  — closed). When web-push returns 404 (gone) or 410 (expired), the
  user profile's `preferences.push_subscription` JSONB field is set to
  `null` and `push_enabled` flipped to `false`, so we don't keep retrying
  a dead subscription on every notification. The user can re-subscribe
  from `/settings/notifications`. Other preferences (theme, language,
  price alerts) are preserved.

- **7 new tests**:
  - `api-offer-snapshot.test.ts` (3 tests): matcher called with offer+candidates,
    no-match path, upsert onConflict value
  - `push-notifications.test.ts` (4 tests): cleanup on 404, cleanup on 410,
    no cleanup on transient errors (500/network), other preferences preserved

- **Tests: 299/299** (was 292, +7)
- **E2E: 19/19** pass on production build
- **Lint/Typecheck/Build**: clean

### Fixed - v1.5.4 (2026-06-16) — WCAG AA Color-Contrast Violations (CI)

- **CI E2E was failing since v1.5.0** (commit `4a0ea73` Phase 4D) on a
  single WCAG 2.1 AA color-contrast violation (`serious` impact) on the
  product detail page. Triggered by `bg-primary/5` (light blue ≈ #f4f7fe)
  on the "lowest price" row combined with 12px text in low-contrast colors.
  6 elements affected across 4 sources:

- **`MarketplaceBadge.tsx`**: removed `color: <brand-color>` from the
  outline-badge inline style. Tokopedia green (#42B549) is the brand
  color but only 2.64:1 on white — fails 4.5:1 required for normal text.
  Brand identity preserved via `border-color`; text uses the default
  `text-foreground` (always dark).
- **`EnhancedPriceTable.tsx`** (3 changes on the "lowest price" row):
  - `text-green-600` → `text-green-700` on the "Gratis" shipping span
  - `text-green-600` → `text-green-700` on the in-stock `CheckCircle2` icon
  - `text-red-600` → `text-red-700` on the out-of-stock `XCircle` icon
  - `text-muted-foreground` → `text-foreground/80` on the "Tersedia"/"Habis"
    label (4.42:1 was just below the 4.5:1 threshold)
- **`ConfidenceBadge.tsx`**: `text-amber-600` → `text-amber-700` for the
  `perlu_verifikasi` outline variant (2.98:1 → 4.5:1+ on light bg)

- **Verified locally** (5/5 a11y tests pass, 0 violations, 19/19 full E2E pass)
  before re-pushing. CI run #37 re-verifies.

- **Test infra**: added `{ timeout: 20_000 }` to the 3 Supabase-link
  integration tests in `phase8-vexo-collector.test.ts` (they were
  defaulting to 5s and timing out on slower first-call connection setup).

- **Tests: 292/292** (no change in count, just timeout tuning)

### Added - v1.5.3 (2026-06-16) — DB Unique Constraint + Collector Upsert

- **DB-level UNIQUE (product_id, marketplace_id) on `offers`** (migration 130)
  - Pre-state: 208 offers, 16 duplicate `(product_id, marketplace_id)` combos
    with 35 extra rows accumulating from repeated ingestion runs
  - Migration dedups (keeps most-recently-updated row per pair), then adds
    the new unique constraint
  - Cascade side-effect: 134 `price_snapshots` deleted (~7.4% of 1,812 total)
    — all from the same scrape session as the kept offer, so no data loss
    in practice
  - **9 orphan offers** (null `product_id`) untouched — the constraint uses
    Postgres default `NULLS DISTINCT`, so they coexist naturally
  - Post-state: 173 offers, 164 unique `(product_id, marketplace_id)` pairs,
    1,678 price_snapshots, 2 unique constraints on `offers`:
    - `offers_url_key` (existing, UNIQUE url)
    - `offers_product_marketplace_unique` (new, UNIQUE product_id + marketplace_id)

- **Phase 8 collector now does real upserts** (`collectors/phase8_vexo_collector.py`)
  - New `upsert_offer(secret, product_slug, marketplace, url, title, price)`
    function POSTs to `/api/ingestion/offer-snapshot` (existing endpoint,
    auth-gated via `INGESTION_SECRET`)
  - The endpoint handles product matching, confidence scoring, and offer
    upsert; the new DB constraint is a schema-layer safety net
  - `main()` loop wires the upsert (was: no-op with a TODO comment)
  - **Bug fix**: removed duplicate `is_mock_url()` definition (the second
    copy was shadowed by Python's "last definition wins" rule, leaving
    dead code)

- **10 new tests** in `src/test/phase8-vexo-collector.test.ts`:
  - Collector file parses + `upsert_offer` importable as a callable
  - `upsert_offer` returns `(False, "skipped", {reason: "no_price"})` when price is None
  - `upsert_offer` returns `(False, "exception", ...)` when API is unreachable
  - URL filter helpers (`is_mock_url`, `is_marketplace_match`, `is_skip_url`)
    cover placeholder detection, domain validation, and ad-redirect filtering
  - **Integration tests** (skipped without `SUPABASE_ACCESS_TOKEN`): verify
    the constraint exists, `offers` count is 173, and no duplicate pairs remain

- **Tests: 292/292** (was 282, +10)

### Fixed - v1.5.2 (2026-06-16) — VexoAPI Marketplace Mock Guard

- **Refuse to serve VexoAPI mock data to users**
  - VexoAPI's `/api/tools/marketplace` currently returns `_meta.is_mock: true`
    for every call (the endpoint is not yet wired to a real marketplace
    data source)
  - The previous route relayed that to the frontend unfiltered — which
    would have shown fake prices and fake image URLs to users as soon
    as VexoAPI's marketplace went live
  - Route now returns **HTTP 503 + `{mockDisabled: true, data: null}`**
    when upstream reports `is_mock: true`, instead of 200 + fake data
  - `VexoImageFallback` requires `mktRes.ok` (was: just `success`), so a
    503 response correctly falls through to the next fallback (VexoAPI
    images → picsum.photos)
  - Reads `VEXO_API_KEY` at request time (was module-load), enabling
    testability
- **7 new unit tests** in `src/test/api-vexo-marketplace.test.ts`:
  - 503 + `mockDisabled` when upstream is_mock
  - Mock data leak guard (FAKE PRODUCT / fake.example never escape)
  - 200 + real data when upstream is_mock: false
  - Defensive: missing `_meta` treated as real
  - 500 no-key, 400 missing-param, 502 upstream-no-data
- **Tests: 282/282** (was 275, +7)

### Fixed - v1.5.1 (2026-06-16) — Placeholder Offer URL Rewrite

- **Adapter-level rewrite of internal placeholder URLs** in public API responses
  - 36 offers in `offers.url` are `<domain>/product/<slug>` (placeholder from
    `backfill_orphan_offers.py`) — internal pattern, not real marketplace links
  - Public API was leaking the internal slug mapping and the links 404'd when
    users clicked them
  - `toPriceView()` in `src/lib/ingestion/adapter.ts` now detects the
    placeholder pattern and rewrites it to a real marketplace search URL
    (e.g. `/search?q=<slug>`) per marketplace convention
  - **DB column unchanged** — ingestion API, crawl target generation, and
    admin tooling all still read the raw placeholder value

- **Affected public endpoints** (all use the adapter, all benefit):
  - `/api/deals` — deal listings
  - `/api/products/[id]` — product detail
  - `/api/search` — search results
- **Real marketplace URLs preserved** (e.g. `https://www.tokopedia.com/...`)
- **18 new unit tests** in `src/test/adapter-placeholder-url.test.ts` covering
  all 6 marketplace search URL formats, null/missing marketplace fallback
  (Google search), real URL preservation, and null URL handling
- **Tests: 275/275** (was 257, +18)

### Added - v1.5.0 (2026-06-15) — P8: VexoAPI Search+AI Price Discovery

- **NEW: `/api/internal/vexo-search` endpoint** (server-side proxy)
  - Auth: INGESTION_SECRET (matches existing /api/ingestion pattern)
  - Pipeline: VexoAPI Google/DuckDuckGo search (`site:<marketplace>` filter)
    → AI price extraction (gpt-oss-120b, fallback to duckai)
  - Supports 6 marketplaces: tokopedia, shopee, bukalapak, lazada, blibli, tiktok
  - VEXO_API_KEY never leaves the Vercel runtime
- **NEW: `collectors/phase8_vexo_collector.py`** (Python)
  - For each product: calls the production endpoint for 6 marketplaces
  - Filters out ad redirects (duckduckgo.com/y.js, bing.com/aclick, etc.)
  - Validates URL domain matches marketplace (rejects cross-marketplace results)
  - Dry-run by default, prints planned URL swaps
- **VexoAPI engine quirks discovered**:
  - `/api/search/duckduckgo?query=<text>` is the most reliable (use as primary)
  - `/api/search/google?q=<text>` works but Mojeek upstream frequently 403s
  - `/api/search/bing` 404 (upstream broken)
  - `/api/tools/marketplace` returns MOCK data (documented limitation)
- **Verified**: 1-6 real URLs returned per batch (rate-limited, variable quality)
  - iPhone 15 Pro Max: real Lazada product page + Blibili search page + Shopee product page
  - Remaining products: mostly Bing/DuckDuckGo ad redirects (filtered out)
- **Caveat**: VexoAPI upstream rate limits aggressively; batch runs need
  delays between requests. URL discovery is best-effort, not exhaustive.

### Added - v1.4.0 (2026-06-15) — P8: Mobile Polish + A11y

- **Tap targets ≥44px (WCAG 2.5.5 / Apple HIG)**:
  - `TabsTrigger`: min-h-[44px] min-w-[44px] on touch (sm:min-h-0 desktop)
  - Header theme toggle: 32×32 → 40×40 (h-10 w-10, rounded-full)
  - Header bottom nav: min-h-[44px] per item, text-[11px] → text-xs
  - `AuthButton` user menu: 36×36 → 40×40, menu items min-h-[44px]
- **Focus rings (WCAG 2.4.7)**: added focus-visible:ring-2 to all nav links, theme toggle, AuthButton trigger + menu items
- **ARIA improvements**:
  - aria-label on desktop nav (Menu utama) + mobile nav (Menu mobile)
  - aria-current=page on active links (desktop + mobile)
  - aria-label on theme toggle (was sr-only, now visible to AT)
  - `AuthButton`: aria-label=Menu akun, aria-expanded, aria-haspopup, role=menu/menuitem
  - All icon-only buttons: aria-hidden=true on icon, label on button
- **touch-action: manipulation** in globals.css (prevents iOS double-tap zoom on all interactive elements)
- **Verified**: typecheck clean, build succeeded, deployed via auto-deploy hook

### Added - v1.3.0 (2026-06-15) — P7-Post: Drop `price_history`, Single-Source Chart Data

- **Migration 129 APPLIED** — Drop legacy `price_history` table
  - 0 rows lost: `price_snapshots` is a strict superset (1,812 rows covering 48 products, ~33 days)
  - 4 indexes, 1 RLS policy, and FK constraints all dropped via CASCADE
- **`fetchPriceHistoryByProductId` refactored** (src/lib/supabase/data.ts)
  - Removed the 2-query union (price_history + price_snapshots)
  - Now reads from `price_snapshots` only, deduped by latest captured snapshot per (date, marketplace)
  - Performance: 1 query instead of 2 (was ~160ms, now ~80ms)
- **NEW: `fetchHistoricalStatsByProductIds`** (src/lib/supabase/data.ts)
  - Batched median30/median90/lowestHistoricalPrice stats for multiple products in a single query
  - Replaces the per-product `price_history` PostgREST embed used by `/api/deals`
  - Default 64-product batch: ~80ms
- **5 read callsites refactored** to use `price_snapshots`:
  - `src/app/api/products/[id]/route.ts` — via helper (PriceHistoryPoint[] shape preserved)
  - `src/app/api/deals/route.ts` — dropped embed, switched to batched stats
  - `src/app/api/predict/route.ts` — read `current_price`/`captured_at` from snapshots
  - `src/app/api/ai-advisor/route.ts` — same, plus updated `generateFallbackVerdict` signature
  - `src/app/api/export/price-history/route.ts` — read snapshots, normalize to legacy row shape for CSV
- **1 write callsite refactored**:
  - `src/app/api/cron/prices/route.ts` — UPSERT to `price_history` (per product+marketplace+day) replaced with INSERT to `price_snapshots` (per offer, granular)
- **Tests updated** (src/test/data.test.ts + src/test/api-deals.test.ts)
  - 3 `price_history` mock-based tests rewritten for single-source `price_snapshots`
  - 257/257 vitest pass
- **Production verified** — all 6 backfilled products still show 6 prices + 33-34 chart points each on `bijakbeli.app` post-migration

### Added - v1.2.0 (2026-06-15) — P7 Follow-up: Schema Consolidation

- **Migration 125 APPLIED** — `product_prices_view` UNION view (237 rows → 280 with new backfills)
- **Migration 126** — Backfill `prices` → `offers` (43 rows migrated)
  - 6 products (Apple iPhone, ROG, Dyson, Switch, Samsung S24 2x) now have data in `offers`
  - All 64 products now have ≥1 offer (was 49)
- **Migration 127** — Backfill `price_history` → `price_snapshots` (5,550 rows migrated)
  - 7 products get chart data (was 7/64, now 48/64 = 75% coverage)
  - 5 backfilled products have 174-186 chart data points each
- **Migration 128** — Drop legacy `prices` table
  - View simplified to offers-only (208 rows)
  - Schema now has 1 source of truth: `offers`
- **Vercel cron fix** — `vercel.json` cron schedules changed from hourly/6-hourly to daily (Hobby plan limit)
  - Old: `0 * * * *` for alerts, `0 */6 * * *` for prices → blocked all new deploys
  - New: `0 0 * * *` for alerts, `0 6 * * *` for prices, `0 9 * * 1` for digest
- **Production verified** — all 6 backfilled products show prices + chart on `bijakbeli.app`
- **CI/CD fix** — Supabase PAT (`sbp_*`) saved to `/home/ubuntu/.config/bijakbeli/sb-pat` for future migrations

### Added - P7 Schema Alignment v1.1 (2026-06-15)
- **Price history (chart) migration**: `fetchPriceHistoryByProductId` helper
  - Merges legacy `price_history` (1,449 rows, 7 products) + new `price_snapshots` (300 rows, 44 products) into unified `PriceHistoryPoint[]` shape
  - Covers 51/64 products (up from 7/64) for chart visualization
  - Legacy data wins ties (denser, more trustworthy)
  - 2 queries in parallel (Promise.all), sub-200ms
  - PostgREST FK chain: `price_snapshots -> offers -> marketplace_id`
- **`extractMarketplaceName` helper**: handles Supabase FK embed polymorphism (single object | array | null)
- **`getProductBySlugFromDB`**: replaced `price_history` PostgREST embed with new helper
- **3 new tests** for history merging (total: 258 vitest, was 255)
- **Coverage check (Next-3)**: 6/64 products still depend on `prices` table
  - Apple iPhone 15 Pro Max, ROG Zephyrus, Dyson V15, Nintendo Switch OLED, Samsung S24 Ultra, [1 more]
  - Cannot drop `prices` until those 6 are backfilled via scraper
  - Documented as follow-up: run scraper for 6 products → migrate → drop

## [Unreleased - 2026-06-15 earlier]

### Added - P7 Schema Alignment (2026-06-15)
- **`supabase/migrations/125_union_offers_prices_view.sql`** — read-only view that UNIONs `offers` + `prices`
  - 237 total rows: 165 from new `offers`, 72 from legacy `prices`
  - Field mapping: `price` → `current_price`, `seller` → `seller_name`, `in_stock` (bool) → `stock_status` (enum), etc.
  - Denormalized `marketplace_name` for read convenience
  - `origin` column (`'offers'` or `'legacy'`) for downstream prioritization
  - `is_official_store` heuristic for legacy rows (text match: "official"/"resmi"/"authorized"/"flagship")
  - **Critical fix**: products with data ONLY in `offers` (e.g. iPhone 15 Pro Max with 0 legacy prices) now show prices on public pages
- **`src/lib/supabase/data.ts`** refactored:
  - New helper `fetchPricesByProductIds(productIds)` — single query, grouped by product_id
  - `getProductsFromDB`, `getProductBySlugFromDB`, `searchProductsFromDB` now use the view
  - Replaced PostgREST FK embed `prices(...)` with explicit query (cleaner, works with view)
  - `transformPrices()` updated to read new field names: `current_price`, `seller_name`, `stock_status`, `marketplace_name`, etc.
  - `inStock` now derived from `stock_status !== "out_of_stock"` (enum comparison vs boolean)
- **6 new tests** (`src/test/data.test.ts`):
  - `fetchPricesByProductIds` queries the right view with the right columns
  - Groups results by product_id
  - Handles empty input + error cases
  - `transformPrices` maps new schema → `MarketplacePrice` shape correctly
  - `inStock=false` for `out_of_stock` rows
- **Test count: 255 (was 249) — all green locally**
- **Build: passes** (no Next.js compilation issues)

### Deferred (not in this commit)
- Apply migration 125 to Supabase (deferred to user — copy-paste to SQL Editor)
- Drop `prices` table (after all products have `offers` data via scraper backfill)
- Migrate `price_history` (chart data, separate concern, lower priority)

## [Unreleased - 2026-06-15 earlier]

### Added - P6 Production Monitoring (2026-06-15)
- **`.github/workflows/monitor.yml`** — daily production health check
  - Schedule: 09:00 UTC daily + manual `workflow_dispatch` (lookback configurable)
  - `check-e2e` job: queries GitHub API for last N E2E runs, fails if any non-success
  - `check-url` job: curls `$PRODUCTION_URL`, fails on non-200 or error markers
  - `alert` job: creates/updates GitHub Issue with `monitoring-alert` label on failure
  - **No new secrets required** — uses existing `GITHUB_TOKEN` + `PRODUCTION_URL`
  - Cost: ~30s/day, ~$0.05/month
- **`scripts/health_check.py`** — ad-hoc local health check
  - Checks: Supabase reachable, offers count, failed ingestion 24h, stale crawl targets 7d, Camofox
  - Modes: human-readable, `--json`, `--fail-on-warning`
  - Exit codes: 0 (healthy), 1 (failure), 2 (warning)
  - Discovered & fixed 2 real bugs during testing: `ingestion_logs.success` → `log_status`, `crawl_targets.last_crawl_at` → `last_crawled_at`
- **`docs/MONITORING_2026-06-15.md`** — full setup + alert flow + testing guide
- **Design principle**: alert-on-failure only (no continuous noise), no VPS cron (saves tokens per user preference)

### Note
- No code changes to production — pure additive infra/docs.
- GitHub Action will auto-activate on push to master.

## [Unreleased - 2026-06-15 earlier]

### Added - P2 + P3 SQL Bundles (2026-06-15)
- **`supabase/migrations/P2_STOCK_STATUS_BACKFILL.sql`** — backfill 159 unknown stock_status to in_stock (active+priced heuristic)
  - All 165 offers are `is_active=true + current_price>0`; 159 have `stock_status='unknown'`
  - All `last_checked_at` are NULL (no staleness signal in DB)
  - Heuristic: active offer with positive price = functionally listed = available
  - Wrapped in transaction with verify step + ROLLBACK comments if needed
  - Effect: deal-score 5 → 10, `hasStock` confidence gap closed
  - Code already documents (adapter.ts:75) "treat unknown as in-stock" — DB now aligns with adapter
- **`supabase/migrations/P3_APPLY_PERFORMANCE_INDEXES.sql`** — apply A-005 indexes
  - 5 indexes: idx_offers_active_price, idx_crawl_targets_status_priority, idx_products_deal_score, idx_ingestion_logs_job_name, idx_price_snapshots_offer_time
  - **Section A**: SQL Editor version (non-CONCURRENTLY, brief lock <100ms at 165 rows)
  - **Section B**: Production CLI version (CONCURRENTLY, no locks, run each separately)
  - Includes verification query, EXPLAIN ANALYZE test queries, and ROLLBACK
  - Caveat: A-005 file uses CONCURRENTLY which fails in SQL Editor transactions; this P3 wrapper handles both
- **No code changes** — pure SQL operations. User runs via Supabase SQL Editor per established workflow.

### Note
- Both migrations are deferred to user execution (SQL Editor paste).
- Both are idempotent and safe to re-run (`IF NOT EXISTS` / `_offers_before` snapshot).

## [Unreleased - 2026-06-15 earlier]

### Added - Camofox Integration Phase 2 (2026-06-15)
- **`collectors/camofox_scraper.py` extended** with multi-marketplace support:
  - `ShopeeProduct`, `BukalapakProduct`, `BlibliProduct`, `TikTokProduct` dataclasses
  - `SHOPEE_PRODUCT_SCHEMA`, `BUKALAPAK_PRODUCT_SCHEMA`, `BLIBLI_PRODUCT_SCHEMA`, `TIKTOK_PRODUCT_SCHEMA` JSON schemas
  - `MARKETPLACE_REGISTRY` dispatch table for marketplace-aware scraping
  - `CamofoxScraperPool` for bounded concurrent scraping (default 4 tabs)
  - `_parse_sold_count` helper for Indonesian "terjual" format variations
- **`collectors/tokopedia_collector.py` refactored** with two-tier scrape:
  - Tier 1: Playwright (existing, unchanged) — primary path
  - Tier 2: Camofox stealth fallback (NEW) — kicks in on Playwright failure
  - `CAMOFOX_DISABLED=1` env var to force-disable fallback
  - `last_scrape_path` observability attribute
  - `_scrape_with_playwright()` and `_scrape_with_camofox()` split for clarity
- **`collectors/cron_scraper.py`** — added path tracking in logs ("via playwright" / "via camofox")
- **`docs/CAMOFOX_INTEGRATION_2026-06-15.md`** — full integration report: architecture, files, performance, risks
- **Test count: 294 (249 vitest + 45 Python unit)** — 20 new Python tests for marketplace dataclasses + pool + parser helpers

### Verified - Camofox Integration
- Live test: Playwright fails (no X server / blocked) → Camofox auto-pickup → real product data extracted
- Example: `TokopediaCollector.scrape_product(url)` with Playwright path throwing `TargetClosedError("no X server")` → Camofox path returns full data, `last_scrape_path="camofox"`

### Note
- Other marketplace schemas (Shopee, Bukalapak, Blibli, TikTok) are scaffolding with best-guess CSS selectors. Re-validate each before production use.

### Added - Blibli Parser Validation (2026-06-15)
- **`BlibliProduct.from_extraction()` rewritten** with verified selectors from real DOM inspection:
  - Title: `.product-info__product-name` (Blibli has 0 `<h1>` elements on product pages)
  - Price: `.product-info__price-wishlist__price` (returns concatenated "Rp12.999.000Rp16.499.00021%...")
- **New parser helpers**:
  - `_parse_blibli_price_pair()` — splits concatenated prices, skips installment amounts
  - `_parse_rating_value()` — handles "X,Y (N)" format with no `\b` word boundary
  - `_parse_blibli_rating_count()` — handles plain and suffixed (rb/jt) counts
  - `_clean_rupiah_str()` — strips thousand separators
- **`BLIBLI_PRODUCT_SCHEMA`** updated with verified selectors
- **`BlibliProduct` fields added**: `rating_value: float | None` (in addition to `rating_count`)
- **Live validation on 4 different Blibli products** — all 7 fields extracted correctly:
  - iPhone 15: Rp12,999,000 / 4.9 (3428) / 9600 sold / "Blibli - Apple Authorized Reseller Flagship Store"
  - Samsung Galaxy S24 FE: Rp10,998,000 / 4.8 (12000) / "Channel B Flagship Store"
  - Samsung Galaxy S24+: Rp11,738,318 / 5.0 (1) / "jikalaku Flagship Store"
  - Samsung S24 5G: Rp10,897,000 / 4.6 (185000) / "Digital Cellular Official"
- **`CamofoxScraperPool._scrape_with_schema()`** — replaced placeholder TODO with real marketplace-aware dispatch (navigate → wait → extract with marketplace schema → parse with marketplace dataclass)
- **24 new unit tests** — `TestCleanRupiahStr`, `TestParseBlibliPricePair`, `TestParseRatingValue`, `TestParseBlibliRatingCount`, `TestBlibliLiveIntegration`
- **Test count: 362 (249 vitest + 69 Python unit + 19 E2E local + 19 E2E CI + 6 live validation)**
- **`docs/MULTI_MARKETPLACE_VALIDATION_2026-06-15.md`** — full report: 4/4 Blibli products pass, schemas for Shopee/Bukalapak/TikTok need residential proxies
- **`collectors/test_marketplaces_live.py`** and **`collectors/test_blibli_multiple.py`** — live validation scripts

### Caveats - Other Marketplaces
- **Shopee**: blocked by CAPTCHA ("Verifikasi untuk melanjutkan"). Search URL triggers verification wall.
- **Bukalapak**: page-unreachable ("Halaman ini gak bisa diakses"). Camofox fingerprint rejected.
- **TikTok Shop**: search returns 0 results. Aggressive bot detection.
- **Recommendation**: use residential proxies (Bright Data, IPRoyal) for these 3 marketplaces. Cost ~$10/month for 5-10GB.

### Added - Camofox Scraper PoC (2026-06-15)
- **`collectors/camofox_scraper.py`** (370 LOC) — async Python wrapper for the Camofox REST API. `CamofoxScraper` async context manager; `TokopediaProduct` dataclass with normalized fields (title, price, stock, seller, etc.); `TOKOPEDIA_PRODUCT_SCHEMA` for Camofox's `extract-structured` endpoint. Zero external dependencies (uses urllib from stdlib).
- **`collectors/test_camofox_scraper.py`** — 25 unit tests for parsers (`_parse_rupiah`, `_parse_int`, `_extract_regex`, `_last_word_before`, `_strip_official`). Pure functions, no camofox server required. Edge cases: `Rp14.980.000` vs `Rp 14.980.000` vs `Rp. 1.500.000`; garbage input; Indonesian location patterns; CamelCase split for concatenated seller names.
- **`docs/CAMOFOX_POC_2026-06-15.md`** — full PoC report: baseline vs Playwright vs Camofox, REST API surface, live validation, performance notes, known limitations, next steps.
- **`docs/camofox-tokopedia-product-poc-2026-06-15.png`** (378KB) — screenshot of real Tokopedia product page (Apple iPhone 15 Pro, DIGICELL seller) extracted via Camofox. Verified by vision model as legitimate Tokopedia listing.
- **`docs/camofox-tokopedia-test-2026-06-15.png`** (411KB) — homepage screenshot from earlier validation.

### Verified - Camofox PoC
- Live test: `curl` to Tokopedia returns HTTP 410 (captcha); Camofox returns 200 with real product data
- All 7 product fields extracted: title, price, stock, sold, rating, seller name, seller location
- Example output: `Title: Apple iPhone 15 Pro 128GB 256GB 512GB Resmi - Titanium Hitam, 128GB SC RESMI`, `Price: Rp14,980,000`, `Stock: 8`, `Seller: DIGICELL`, `Location: Bandung`
- End-to-end per product: ~6s (4s hydration + ~1s navigate + ~1s extract)

### Added - PHASE 4D: WCAG 2.1 AA Audit (2026-06-15)
- **`@axe-core/playwright@4.11.3`** + **`axe-core@4.12.1`** dev deps — automated a11y sweep
- **`tests/e2e/a11y.spec.ts`** (5 tests) — WCAG 2.1 AA scan across 4 critical pages: home, search, product detail, login. Per-page tests fail on critical/serious violations; a summary report groups all violations by rule for triage.
- **`docs/WCAG_AUDIT_2026-06-15.md`** — full audit report: ruleset, baseline violations, fixes, file-by-file change log, re-run instructions.
- E2E test count: **19/19 pass** (5 a11y + 14 existing critical flows).

### Fixed - PHASE 4D: WCAG 2.1 AA Audit (2026-06-15)
- **CRITICAL: `button-name`** (search page) — `<SelectTrigger>` for category + sort filters had no accessible name (Radix UI renders as `role="combobox"` with name only injected by `SelectValue` child, but axe scans the trigger before the value is injected). Added `aria-label="Filter kategori"` and `aria-label="Urutkan hasil"`.
- **SERIOUS: `color-contrast`** (3 pages, 11 nodes) — multiple `text-white` on Tailwind 500/600 backgrounds failed 4.5:1 contrast. Bumped all badge/button backgrounds to 700+ shades (emerald-700, green-700, amber-700, red-700, blue-700). Affected files:
  - `src/lib/utils.ts` — central `getDealScoreInfo()` colors
  - `src/app/page.tsx` — hero badge + opacity text (`text-primary-foreground/80` → `text-primary-foreground`)
  - `src/app/deals/page.tsx` — deal score badge
  - `src/app/global-error.tsx` — error retry button
  - `src/components/product/BuyOrWaitDecision.tsx` — recommendation colors (4 categories)
  - `src/components/product/ConfidenceBadge.tsx` — confidence badges (2 levels)
  - `src/components/product/PriceComparisonPreview.tsx` — cheapest badge + CTA button
  - `src/components/product/SocialShare.tsx` — WhatsApp share button
  - `src/test/utils.test.ts` — test expectations updated to match new color values

### Fixed
- `collectors/cron_scraper.py`: also fetch `crawl_status='pending'` targets (was missing them — only `queued` was crawled). Verified via end-to-end test (test_cron_query.py, test_or_filter.py).
- `supabase/migrations/122_performance_indexes_safe.sql`: fix table name `rate_limits` → `api_rate_limits`. The actual table is `api_rate_limits` (created in migration 106); the original 122 referenced the wrong name and would fail on clean apply with "relation does not exist".
- `package.json` + `package-lock.json` (A-001 / A-004): explicitly pin `zod@^3.25.76` (was a phantom transitive dep used by 2 ingestion routes — supply-chain risk if hulu dropped it). Removed `bun.lock` to keep one lockfile; CI uses `npm ci`.
- A-008 (`as any` debt): all 11 production `as any` casts in supabase writes now have explicit TODO comments explaining the root cause — `supabase-js` strict typing rejects `.upsert()`/`.insert()` when the `Database` type is built from a `interface` vs `type` alias. Cannot be fully cleaned up without `supabase gen types typescript` (needs `SUPABASE_ACCESS_TOKEN`, Phase 5 blocker).
- **A-008 RESOLVED 2026-06-15** via generated types. The user supplied a Supabase access token (`sbp_dd5c15...5508`), and `npx supabase gen types typescript --project-id oklaxwjoyttpwgxhphko --schema public` produced a 1156-line `Database` type covering all 18 tables, 1 view, 2 functions, and 1 enum. All 11 production `as any` casts in supabase write paths were replaced with proper `Database["public"]["Tables"]["<table>"]["Insert"|"Update"]` types. The `as any` count in production code is now **0** (test mocks: 6, acceptable).
- **Bonus bug fixes** surfaced by generated types:
  - `src/lib/job-logger.ts` was targeting a non-existent `job_logs` table and calling non-existent `get_job_statistics` / `cleanup_old_job_logs` RPCs. Confirmed via REST: 404 `PGRST205` with hint "Perhaps you meant the table 'public.ingestion_logs'". The module was rewritten as a no-op stub (functions succeed silently) so the only caller (`/api/cron/digest`, which imported non-existent `logJob` — broken at build time) compiles. The whole module needs a future rewrite against `ingestion_logs.metadata.job_name`.
  - `src/app/api/ingestion/route.ts` and `src/app/api/ingestion/offer-snapshot/route.ts` were writing to `ingestion_logs` with WRONG field names: `status` should be `log_status`, `error_summary` should be `error_message`, `finished_at` should be `completed_at`, `processed_count`/`success_count`/`failed_count` should be `items_processed`/`items_created`/`items_failed`, and `job_name`/`duration_ms` should live in `metadata`. These writes were **silently failing** in production (no `error` log path because the `await` was outside a try/catch in some places). Fixed in this batch.
  - `src/app/api/ingestion/route.ts` price-snapshot insert was using `price: number` (Zod schema) but the DB column is `current_price`. Mapped at insert time.
  - `src/app/api/scrape/route.ts` was the only remaining `as any` (products update) — replaced with a narrowly typed `as unknown as { update: ... }` assertion that documents the chain shape.
- **PHASE 4C** (2026-06-15): `src/app/product/[slug]/error.tsx` was catching `notFound()` and rendering the "Produk Tidak Dapat Dimuat" error UI with HTTP 200. Added route-local `src/app/product/[slug]/not-found.tsx` and re-throw logic in `error.tsx` for `NEXT_HTTP_ERROR_FALLBACK` digests. Side effect: caught by new E2E test `product-detail.spec.ts > 404 for unknown product slug`.

### Added - PHASE 4C: E2E Test Setup (2026-06-15)
- **Playwright 1.60.0** + `@playwright/test` dev dep
- **14 E2E tests** across 4 critical user flows:
  - `tests/e2e/home.spec.ts` (3) — landing page hero, search bar, product card links, HTTP 200
  - `tests/e2e/search.spec.ts` (3) — direct URL with query, form submit navigation, empty-search guard
  - `tests/e2e/product-detail.spec.ts` (3) — product info render, 404 not-found UI, accessible nav
  - `tests/e2e/auth.spec.ts` (5) — login form fields, forgot-password link, register link, HTML5 validation, invalid-creds error
- **`playwright.config.ts`** — auto-builds + starts `next start` for local runs, uses external URL when `PLAYWRIGHT_BASE_URL` is set
- **`.github/workflows/e2e.yml`** — separate CI workflow, caches Playwright Chromium, uploads HTML report + traces on failure (7 days) and success (3 days), runs on push to master/main + PRs
- **`tests/e2e/README.md`** — operator docs (why `next start` not `next dev`, why `workers=1`, how to add a test)
- **`src/app/product/[slug]/not-found.tsx`** — route-local 404 UI surfaced by E2E (real bug fix)
- npm scripts: `test:e2e`, `test:e2e:headed`, `test:e2e:install`
- `.gitignore`: added `test-results/`, `playwright-report/`, `playwright/.cache/`

### Added
- `collectors/probe_schema.py`: diagnostic script — table/column existence + row counts via Supabase REST API. Useful for verifying migration state before applying.
- `collectors/test_cron_query.py`: dry-run test of the cron scraper query (no mutation), shows pending vs queued breakdown.
- `collectors/test_or_filter.py`: end-to-end test of the OR filter (inserts+verifies+cleans up a `pending` test row).
- A-011 (admin auth consolidation): all 8 admin routes now use the typed `requireAdmin` from `@/lib/admin-auth` (was previously importing from `@/lib/api-auth` which returns a different shape). See commit `a810fd8`.
- A-005 (orphan offers): `collectors/backfill_orphan_offers.py` — attempts to attach the 9 orphan offers to existing products via title matching. Result: 0/9 matched (products table doesn't contain those SKUs). 9 orphans preserved in DB for future manual product creation.
- **A-005 re-check 2026-06-15** (post-A-003 schema sync): Re-ran the same match analysis against current `products` table (64 rows). 9 orphans still 0/9 matched. URLs reference products not in the catalog (e.g. "mofii-mouse-wireless-gaming-rechargeable-baterai-type-c-fast-charging-1600dpi-rgb-light-p6", "rexus-heroic-k", "aoc-k61-keyboard-mekan", "dell-xps-13-9340-core-ultr", "thinkpad-t14-gen-2-ryz", "thinkpad-t495-ryzen-7-"). Confirmed: keep orphans in place. To process them, products need to be created first via `collectors/create_products_from_orphans.py` (already exists, never run in prod).
- A-010 (doc cleanup): deleted 5 stale root `.md` files (`DEPLOYMENT_STATUS.md`, `IMPLEMENTATION_REPORT_FINAL.md`, `LAUNCH_COMPLETE.md`, `OPSI_B1_PROGRESS.md`, `AUDIT_REPORT_2026-06-11.md`). 17 more candidates deleted in second batch (`FULL_UPGRADE_COMPLETE.md`, `INGESTION_INFRASTRUCTURE_COMPLETE.md`, `IMPROVEMENTS_SUMMARY.md`, `EXECUTIVE_SUMMARY.md`, `PROJECT_STATUS_FINAL.md`, `ROADMAP_NEXT.md`, `OPSI_BD_FINAL_REPORT.md`, `OPSI_BD_PROGRESS.md`, `OPSI_B_PROGRESS.md`, `DAILY_PROGRESS_20260612.md`, `SESSION_SUMMARY_20260612.md`, `KIRO_QUICK_REFERENCE.md`, `GITHUB_RESEARCH_RESULTS.md`, `TODO_REMAINING.md`, `VERCEL_ENV_UPDATE.md`, `VEXO_API_UPDATE.md`, `MANUAL_ACTIONS_GUIDE.md`). Root `.md` count: 43 → 21.
- Recommendation endpoints security (C): `/api/recommendation/buy-or-wait` POST + `/api/recommendation/fake-discount` POST now have rate limiting (30 req/min per user/IP) via `checkPersistentRateLimit`. Switched both routes from `runtime = "edge"` to default Node runtime (required by `createAdminClient` in rate-limit RPC).
- A-007 (validation): documented the dual-validation system (zod for ingestion, custom `lib/validation` for admin) is **by design**, not tech debt. Each has its niche.
- A-005 re-check (2026-06-15): 9 orphan offers still 0/9 matched against current `products` table (64 rows). Decision confirmed: keep in place. URLs reference products not in catalog (mofii mouse, rexus keyboard, AOC K61, Dell XPS 13, ThinkPad T14/T495). To process them, run `collectors/create_products_from_orphans.py` first.
- **Phase 3 job-logger rewrite** (2026-06-15): `src/lib/job-logger.ts` rewritten from no-op stub to real implementation against `ingestion_logs` table. `startJobLog` inserts a running row; `completeJobLog` updates with final status, counts, error message; `logJob` is the one-shot convenience; `getRecentJobLogs` filters by `metadata.job_name`; `getJobStatistics` aggregates by day+job+status client-side; `cleanupOldJobLogs` deletes by cutoff; `withJobLogging` wraps a job with full observability. Job name lives in `metadata.job_name` (no dedicated column). All 7 exports now functional. The only caller (`/api/cron/digest`) gets real DB logging.
- **Phase 3 a11y** (2026-06-15): 4 gaps closed.
  - Live region: `src/app/search/SearchPageContent.tsx` now has `role="status" aria-live="polite"` for result count announcements.
  - Color contrast: `src/components/product/ProductCard.tsx` `text-muted-foreground/70` → `text-muted-foreground` (full opacity, AA contrast restored on strikethrough price).
  - Reduced motion: `src/app/globals.css` adds `@media (prefers-reduced-motion: reduce)` rule disabling all CSS animations + transitions site-wide (WCAG 2.3.3).
  - Icon button sweep: re-audited. Only 2 icon-only `<Button size="icon">` exist in codebase, both already have `aria-label` (fixed in commit c72e06d). Zero remaining.
- **Performance audit** (2026-06-15): REST API latency tests across 8 hot queries. All under 350ms (PostgREST + network dominant, not DB). Findings: migration 122 `api_rate_limits` index verified applied. `offers.is_active + current_price sort` is 2x slower than baseline (303ms vs 163ms) — acceptable at 165 rows, deferred index ready in `supabase/migrations/A-005_FUTURE_PERFORMANCE_INDEXES.sql` for 10K+ rows. `crawl_targets` query uses `priority_score` (correct column, NOT `priority` — confirmed in `cron_scraper.py:58`). No urgent action needed; production is healthy.
- **Phase 4 security hardening** (2026-06-15): `forgot-password` and `reset-password` POST routes now rate-limited. forgot-password: 3/email/hour + 20/IP/hour (prevents email bombing + account enumeration, email normalized to lowercase to prevent casing bypass, generic success message to prevent user enumeration). reset-password: 10/IP/hour (defense-in-depth against bruteforce of expired Supabase recovery tokens). Existing security headers (CSP, HSTS, COOP/COEP, Permissions-Policy, CORS allowlist, CSRF double-submit) verified intact and OWASP API Top 10 compliant.
- **Phase 4A migration hardening** (2026-06-15):
  - `src/lib/backup.ts` rewritten to use canonical post-A-002 schema (`products`, `marketplaces`, `offers`, `price_snapshots`) instead of legacy (`prices`, `price_history`). Seed SQL now wraps in `BEGIN/COMMIT` transaction, includes stats header, escapes quotes/backslashes/null bytes, serializes JSONB for `specs`. Foreign-key dependency order: marketplaces → products → offers → price_snapshots. Idempotent via `ON CONFLICT (id) DO NOTHING`.
  - `src/app/api/backup/route.ts` — added `Cache-Control: no-store`, charset=utf-8, docstring.
  - 3 stale TODOs removed (claimed "regenerate types" needed — already done in commits 2d99834 and ada41c1). 3 real future TODOs preserved.
  - 10 new tests in `src/test/backup.test.ts` covering: header, transaction, idempotency, dependency order, escaping (quotes, backslashes, null bytes), JSONB, empty data, schema correctness.
- `src/lib/supabase/local-database.types.ts` (A-008 infra): hand-written `LocalDatabase` interface for `offers` + `price_snapshots` tables, integrated into `src/lib/supabase/types.ts`. Unblocks typed reads; supabase-js write methods (`upsert`/`insert`) still need full typegen to drop `as any` casts.
- `supabase/migrations/A-003_OFFERS_MISSING_COLUMNS.sql`: self-heal bundle for the 3 missing columns (`rating`, `review_count`, `currency`) — safe to run in Supabase SQL Editor. See `docs/MIGRATION_A003_GUIDE_2026-06-15.md`.
- `docs/COLLECTOR_AUDIT_2026-06-15.md`: collector architecture audit — `collectors/` is legacy/deprecated, `tools/price-collector/` is production, `tools/refresh_cron.py` is automated enqueue. **No code changes required.**
- `docs/MOBILE_AUDIT_2026-06-15.md`: mobile app audit — `apps/mobile/` is **not buildable** (3 missing routes, NativeWind unconfigured, no auth, Expo SDK 50 EOL). Recommendation: delete after web launch, focus PWA.
- `docs/ROUTE_AUDIT_2026-06-15.md`: complete route auth audit of all 48 routes. Found 2 routes with `POST` and no auth (`recommendation/buy-or-wait`, `recommendation/fake-discount`) — both pure local compute, low risk. **All admin routes verified consistent post-A-011.**
- `docs/A11Y_AUDIT_2026-06-15.md`: a11y quick scan. Fixed: `SearchBar` missing `aria-label`, 2 icon-only buttons missing labels. 4 remaining gaps in Phase 3 backlog.

### Removed
- `apps/mobile/` (D): Expo scaffold that was not buildable (3 missing routes, NativeWind unconfigured, no auth, Expo SDK 50 EOL). Audit in `docs/MOBILE_AUDIT_2026-06-15.md`. Preserved as git tag `mobile-scaffold-2026-06-15` for future rebuild reference. To restore: `git checkout mobile-scaffold-2026-06-15 -- apps/mobile/`.
- `docs/AUDIT_2026-06-14.md` (in progress): independent senior audit, 2-batch scope.
  - **Batch 1 (Fase 1) — applied:** A-001 (zod phantom → pinned), A-004 (bun.lock → removed). Verified: lint 0 errors, typecheck clean, 239/239 tests pass.
  - **Batch 2 (Fase 1) — pending user action:** A-003 (3 missing `offers` columns from migration 124: `rating`, `review_count`, `currency`) — self-heals when Part 3a of the previously-provided migration SQL bundle is run.
  - **Backlog (Fase 2+):** A-002 critical (dualisme `prices` vs `offers` — `deals`/`scrape`/`products/[id]`/`ai-advisor` all read legacy `prices` table while ingestion writes `offers`; 72 vs 165 rows, UI & pipeline not converging); A-005 (9 orphan offers with null product_id); A-006 (`offer-snapshot` returns `Access-Control-Allow-Origin: *` despite strict proxy CORS); A-007 (2 validation systems parallel: zod + custom `lib/validation`); A-008 (`as any` debt, tracked in `deals`/`offer-snapshot` as "Phase 5 backlog"); A-009 (`verifyApiKey` fail-OPEN if env not set, opposite of `verifyCronSecret` fail-closed); A-010 (~40 status markdown files in root, many likely stale); A-011 (two `requireAdmin` implementations with different signatures: `api-auth.ts:51` returns `NextResponse|null`, `admin-auth.ts:57` returns typed result).
  - **A-002 migration Batches A+B+C (applied, `4633537`):** completed prices→offers migration across 8 files (products/[id], ai-advisor, compare, admin page, 2 admin actions, scrape, cron/prices). No `from("prices")` left in `src/app/`. Upsert conflict key switched to `url` (new table's unique index); admin/simulator pakai `admin://` / `simulation://` synthetic URL fallback via select-then-upsert.
  - **Fase 2 backlog cleared (`a810fd8`–`11fb743`):** A-011 (8 admin routes pakai typed `requireAdmin` from `admin-auth`), A-005 (orphan backfill script 0/9, 9 orphans left in place — products missing for those SKUs), A-008 partial (1 of ~30 `as any` documented, rest needs Supabase typegen), A-007 (zod + custom `lib/validation` resolved by design), A-010 partial (5 safest stale `.md` deleted, 17 candidates in `docs/DOCS_CLEANUP_2026-06-15.md`).
  - **What audit did NOT find (good):** all admin routes use `requireAdmin` BEFORE `createAdminClient`; cron routes call `verifyCronSecret` first; ingestion routes compare INGESTION_SECRET with `===` (not timing-safe but acceptable for non-PII bearer); CSRF double-submit enforced in `proxy.ts` for state-changing methods; security headers + CSP comprehensive in `next.config.ts`; rate-limiter fails closed; product/recheck/review UI components manage submit-state with disabled-while-pending + success/error feedback + dialog auto-close on success; 24/26 audited routes have an explicit auth/guard pattern (only public-by-design are `/api/auth/csrf`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/health`, `/api/health/db`, `/api/deals`, `/api/leaderboard`).
  - **Not yet audited (deferred to Fase 2+):** 38 Python collectors, mobile app, performance runtime, E2E test gap, full accessibility audit.


## [2026-06-13 15:37]

### Feat
- Phase 4-5: Performance indexes + GitHub Actions CI/CD

## [2026-06-13 15:35]

### Test
- Phase 3: Add rate limiter tests (8 tests passing)

## [2026-06-13 15:30]

### Feat
- Phase 1-2: Security hardening + schema sync


### Added

## [0.5.0] - 2026-06-11

### Added - Migration 110 Activation
- **Database Schema Applied:** 3 new tables (`crawl_targets`, `recheck_requests`, `price_reports`) + 5 new offer columns
- **Admin APIs Activated (5):** offers list, conflicts list, resolve conflict, rechecks list, update recheck status
- **User APIs Activated (2):** recheck request, price report submission
- **Column Naming:** Used `crawl_status`, `request_status`, `report_status` to avoid PostgreSQL reserved keywords
- **Documentation:** Created MIGRATION_110_ACTIVATION.md with complete activation log

### Changed
- Replaced all stubbed API endpoints (503 responses) with real Supabase implementations
- Updated migration 110 SQL file with correct column names
- Removed `@ts-ignore` comments from user-facing endpoints

### Fixed
- PostgreSQL reserved keyword conflicts (`status` → `crawl_status`/`request_status`/`report_status`)
- Foreign key constraints to auth.users (removed, using plain UUID + RLS policies) - PHASE 5: Automation & Refresh System (2026-06-11)
- **Refresh Priority Calculator** (`src/lib/refresh-priority.ts`)
  - Intelligent scoring: staleness, engagement, volatility, user requests
  - Dynamic crawl frequency: 1h to 48h based on priority
  - calculateRefreshPriority(), calculateNextCrawlTime()

- **Price Conflict Detection** (`src/lib/price-conflict.ts`)
  - Detects: price jumps, confidence drops, fake discounts, cross-marketplace anomalies
  - Severity levels: low/medium/high
  - Suggests resolution: review/recheck/flag

- **Refresh API Endpoints** (3 endpoints, stubbed until migration 110)
  - POST /api/refresh/calculate-priorities: Calculate priority scores
  - POST /api/refresh/trigger: Manually enqueue targets for refresh
  - GET /api/refresh/queue: Fetch pending crawl targets

- **Automation Script** (`tools/refresh_cron.py`)
  - Python CLI for automated refresh cron job
  - Fetches queue, triggers collector, Rich CLI output
  - Ready for crontab scheduling

### Changed - PHASE 4: Integration (2026-06-11)
- **Product Detail Page** (`src/app/product/[slug]/page.tsx`)
  - Replaced PriceComparisonTable with EnhancedPriceTable
  - Added DataTransparencyDisclaimer
  - Integrated all PHASE 4 metadata components
  - Mock data until migration 110

### Documentation
- Created docs/PHASE_5_PROGRESS.md (67% feature completion)

## [Unreleased - PHASE 4]

### Added - PHASE 4: User-Facing UI Features (2026-06-11)
- **Data Transparency Components** (9 new UI components)
  - ConfidenceBadge: Visual trust indicators (High/Medium/Low)
  - SourceLabel: Data source badges (Browser/Manual/Auto)
  - LastCheckedTimestamp: Relative time with stale warnings
  - StaleDataBadge: Compact "Data Lama" indicator
  - ValidationStatusAlert: Status-specific alerts for non-verified data
  - DataTransparencyDisclaimer: Legal disclaimer (2 variants)
  - RecheckPriceButton: User-triggered price refresh
  - ReportPriceForm: Modal for reporting incorrect prices
  - EnhancedPriceTable: Extended comparison table with metadata

- **API Endpoints** (stubbed, pending migration 110)
  - POST /api/recheck-request: User recheck requests
  - POST /api/price-report: Price error reporting

- **UI Components**
  - Dialog component (Radix UI wrapper)
  - Updated Select component

### Dependencies
- Added @radix-ui/react-dialog
- Added @radix-ui/react-select

### Documentation
- Created docs/PHASE_4_PROGRESS.md (86% feature completion)

## [Unreleased - PHASE 3]

### Added - PHASE 3: Admin Dashboard (2026-06-11)
- **Admin Data Collection Dashboard** (`/admin/data-collection`)
  - Statistics cards with real-time metrics (offers, conflicts, rechecks, stale data)
  - Offers management table with search and filters (status, marketplace)
  - Price conflicts resolution interface with side-by-side comparison
  - Recheck requests queue with priority scoring
  - Manual offer input form with full validation
  
- **UI Components** (7 new files)
  - `DataCollectionDashboard` - Main tabs container
  - `DataCollectionStats` - Statistics cards (server component)
  - `OffersList` - Searchable offers table with filters
  - `ConflictsList` - Price conflicts management
  - `RechecksList` - Recheck queue management
  - `ManualOfferForm` - Manual offer input form
  - Base UI: `Tabs`, `Label`, `Textarea` (Radix UI)

- **API Routes** (6 endpoints)
  - `GET /api/admin/data-collection/offers` - List offers with filters
  - `GET /api/admin/data-collection/conflicts` - List unresolved conflicts
  - `GET /api/admin/data-collection/rechecks` - List pending rechecks
  - `PATCH /api/admin/data-collection/rechecks/[id]` - Update recheck status
  - `POST /api/admin/data-collection/resolve-conflict` - Resolve conflict
  - `POST /api/admin/data-collection/manual-offer` - Submit manual offer

- **Documentation**
  - `docs/PHASE_3_COMPLETE.md` - Complete PHASE 3 documentation
  - `docs/DEPLOYMENT.md` - Production deployment guide
  - Updated `docs/PROGRESS.md` - Project progress tracker

### Changed
- Updated `README.md` with PHASE 1 & 2 progress (211 tests, Python collector)
- Added project structure with new `docs/` and collector directories

### Technical
- Installed `@radix-ui/react-tabs`, `@radix-ui/react-label`
- API routes use mock data until migration 110 applied
- Full implementations ready (commented out, awaiting migration)
- Next.js 16 async params API compatibility

### Notes
- **PHASE 3 Status:** Code complete (90%), blocked by migration 110
- **Files Created:** 16 files, ~2,400 lines
- **Activation Required:** Apply migration 110, uncomment implementations

---

## [2026-06-11 09:48] - PHASE 1 & 2: Data Collection System

### Added
- **Database Migration 110**: Enhanced data collection schema
  - New tables: `crawl_targets`, `recheck_requests`, `price_reports`
  - Enhanced `offers` table with validation_status, confidence_label, title, image_url, category_hint
  - Enhanced `price_snapshots` table with confidence scoring
- **API Endpoint**: `/api/ingestion/offer-snapshot` for single offer ingestion (419 lines)
- **Python Browser Collector**: Semi-automated data collection tool (1,631 lines)
  - 3 collection modes: manual (browser control), URL (direct), keyword (search & select)
  - Tokopedia collector with Apollo GraphQL cache extraction (tested & working)
  - Generic parser fallback for any marketplace
  - Rich CLI with preview, confirmation, and error handling
  - Data normalization matching server-side logic
  - Rate limiting and safety features (no captcha bypass, no PII)
- **Documentation**: Complete PHASE 1, PHASE 2, and progress tracking docs

### Changed
- Enhanced ingestion API route schema with new optional fields
- Updated collectors/tokopedia_collector.py with 2026 selectors

### Technical Details
- Migration 110: 216 lines SQL with RLS policies and indexes
- Browser collector: 9 Python files in tools/price-collector/
- Dependencies: Playwright, Rich, Click, Requests, Pydantic
- Test coverage: 211 tests passing
- Build status: ✅ Successful

## [2026-06-11 07:11]

### Changed
- Enhanced PriceHistoryChart component with best features from both versions
- Added date-fns Indonesian locale support for better date formatting
- Improved performance with 50 data point limit optimization
- Better Y-axis domain calculation with 10% padding
- Enhanced tooltip with null value filtering

### Removed
- Duplicate price-history-chart.tsx component
- 13 outdated PHASE*.md documentation files

## [2026-06-11 06:45]

### Fix
- Update dependencies and audit fixes

## [2026-06-11 06:00]

### Feat
- Add beautiful reports, auto-git workflow, and system improvements


## [1.2.0] - 2026-06-11

### Added
- Price history visualization component with Recharts
- Natural language support for Telegram interface
- Voice message transcription capability
- Simple command shortcuts (ph command)
- Beautiful report formatting for all automated reports
- Auto git workflow with changelog management
- Multi-agent system (4 autonomous + 5 specialist agents)

### Changed
- Improved Telegram UX patterns for non-technical users
- Enhanced cron job reports with visual formatting
- Updated all agent prompts to use beautiful-reports skill

### Fixed
- Dependencies updated (recharts, date-fns added)

### Security
- 4 moderate vulnerabilities detected (pending fix)

## [1.1.0] - 2026-06-10

### Added
- Phase 4 & 5 completion
- Push notifications system
- Legal compliance features
- Comprehensive testing suite (59 tests)

### Changed
- Updated testing infrastructure
- Enhanced documentation

## [1.0.0] - 2026-06-01

### Added
- Initial release
- Deal Score Engine (6-factor scoring system)
- Fake Discount Detector
- Buy/Wait Recommendation engine
- Supabase integration
- OpenAI integration
- 6 marketplace collectors (Python/Playwright)
- Next.js 16 with TypeScript
- Complete test suite with Vitest

---

**Note:** This changelog is automatically maintained. Each commit updates this file with relevant changes.
