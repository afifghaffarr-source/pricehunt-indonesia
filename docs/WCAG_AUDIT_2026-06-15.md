# WCAG 2.1 AA Accessibility Audit — 2026-06-15

**Phase:** 4D (closes out the 4-phase audit plan)
**Status:** ✅ All 4 critical pages pass WCAG 2.1 AA
**Method:** `@axe-core/playwright` 4.11.3 + `axe-core` 4.12.1, automated sweep of 4 critical user-facing pages against WCAG 2.0 A/AA + WCAG 2.1 A/AA rule sets

---

## Summary

| Page | Critical | Serious | Moderate | Minor | Status |
|---|---|---|---|---|---|
| Home (`/`) | 0 | 0 | 0 | 0 | ✅ PASS |
| Search (`/search`) | 0 | 0 | 0 | 0 | ✅ PASS |
| Product detail (`/product/[slug]`) | 0 | 0 | 0 | 0 | ✅ PASS |
| Login (`/auth/login`) | 0 | 0 | 0 | 0 | ✅ PASS |
| **Total** | **0** | **0** | **0** | **0** | **All clean** |

**Test count:** 5 new a11y tests added (4 per-page + 1 summary report). Total E2E: **19/19 pass** (5 a11y + 14 existing critical flows).

---

## Why this matters

Indonesian e-commerce is heavily used on mobile by users with assistive tech — screen readers, keyboard-only navigation, low vision, motor impairments. WCAG 2.1 AA is the internationally-recognized baseline for "doesn't block real users". A critical violation means someone **literally cannot use the app**; a serious violation means **a major task is hard or impossible**.

This is also a legal risk surface: Indonesia's UU No. 8/2016 on disabilities references accessibility standards, and the global WCAG 2.1 AA requirement appears in procurement guidelines for government-adjacent platforms.

---

## Violations found (initial baseline → all fixed)

### CRITICAL: `button-name` (search page, 2 nodes)

**Rule:** Buttons must have discernible text
**Where:** `src/app/search/SearchPageContent.tsx:241,257` — `<SelectTrigger>` for category and sort filters
**Problem:** Radix UI's `SelectTrigger` renders as `<button role="combobox">` but the visible value comes from the dynamically-injected `SelectValue` child. axe-core scans the trigger before the value is injected, so the button has no accessible name.
**Impact:** Screen reader users hitting Tab land on a button that announces nothing — they don't know it's a filter or sort dropdown.
**Fix:** Add `aria-label` to the `SelectTrigger`:
```tsx
<SelectTrigger className="w-[160px]" aria-label="Filter kategori">
<SelectTrigger className="w-[180px]" aria-label="Urutkan hasil">
```

### SERIOUS: `color-contrast` (3 pages, 11 nodes)

**Rule:** Foreground/background contrast ratio must be ≥ 4.5:1 for normal text, ≥ 3:1 for large text (≥18pt or ≥14pt bold)
**Where:** 9 distinct color combinations across the app
**Impact:** Low-vision users, users in bright sunlight, aging users — badge text becomes unreadable.

| Original | Ratio | Fix | New ratio |
|---|---|---|---|
| `text-white` on `bg-emerald-600` (#009966) | 3.65:1 | `bg-emerald-700` (#047857) | 4.74:1 ✅ |
| `text-white` on `bg-green-500` (#00c950) | 2.21:1 | `bg-green-700` (#15803d) | 5.05:1 ✅ |
| `text-white` on `bg-green-600` (#00a63e) | 3.21:1 | `bg-green-700` | 5.05:1 ✅ |
| `text-white` on `bg-amber-500` (#fe9a00) | 2.13:1 | `bg-amber-700` (#b45309) | 4.74:1 ✅ |
| `text-white` on `bg-blue-500` (#3b82f6) | 3.04:1 | `bg-blue-700` (#1d4ed8) | 7.07:1 ✅ |
| `text-white` on `bg-blue-600` (#2563eb) | 3.74:1 | `bg-blue-700` | 7.07:1 ✅ |
| `text-red-600` (#dc2626) on `#f5f5f5` | 4.37:1 | `text-red-700` (#b91c1c) | 5.94:1 ✅ |
| `text-primary-foreground/80` (opacity) on `bg-blue-600` | 3.74:1 | `text-primary-foreground` (no opacity) | full white = pass ✅ |
| `text-yellow-600` on `bg-yellow-50` (BuyOrWaitDecision badge) | 3.5:1 | `text-yellow-700` | 4.7:1 ✅ |

**Files changed:**
- `src/lib/utils.ts` — central `getDealScoreInfo()` colors (emerald/green/amber/red)
- `src/app/page.tsx` — hero badge + opacity text
- `src/app/deals/page.tsx` — deal score badge
- `src/app/global-error.tsx` — error retry button
- `src/components/product/BuyOrWaitDecision.tsx` — recommendation colors (4 categories)
- `src/components/product/ConfidenceBadge.tsx` — 2 confidence levels (tinggi, dipercaya)
- `src/components/product/PriceComparisonPreview.tsx` — cheapest badge + CTA button
- `src/components/product/SocialShare.tsx` — WhatsApp share button
- `src/test/utils.test.ts` — test expectations updated to match new colors

---

## How to re-run

```bash
# Local: full E2E suite (14 critical flows + 5 a11y = 19 tests)
npm run test:e2e

# A11y only
npx playwright test tests/e2e/a11y.spec.ts

# Specific page
npx playwright test tests/e2e/a11y.spec.ts --grep "home page"

# Summary report (all 4 pages, full violation breakdown)
npx playwright test tests/e2e/a11y.spec.ts --grep "summary"
```

**In CI:** the E2E workflow (`.github/workflows/e2e.yml`) runs `npm run test:e2e` after the build. Once CI env vars are fixed (separate task), a11y tests will run on every PR.

---

## Tools / version pinning

```json
"@axe-core/playwright": "4.11.3",
"axe-core": "4.12.1",
"@playwright/test": "1.60.0"
```

**Test approach:** `domcontentloaded` + 1.5s hydration settle (NOT `networkidle` — Next.js 16 streams RSC and the home page does background polling, so network never goes idle). This is a real-world Next.js 16 + Playwright gotcha worth documenting separately.

---

## Out of scope (tracked elsewhere)

- **Reduced motion:** Already implemented in `src/app/globals.css` (global `@media (prefers-reduced-motion)` rule from Phase 3 audit)
- **Live region for search results:** Already implemented in `SearchPageContent.tsx` (aria-live="polite" from Phase 3 audit)
- **Icon-only button aria-labels:** Audit only flagged 2 (the combobox triggers). Other icon-only buttons (close, dismiss, etc.) need deeper review in a follow-up pass.
- **Keyboard navigation order:** axe-core checks focus, but manual Tab-order review across forms is recommended for Phase 5.

---

## Related issues (not a11y, but noticed during audit)

- `[WebServer] Error fetching reviews: PGRST205 — table 'public.product_reviews' does not exist` — the product page tries to fetch from a non-existent `product_reviews` table. This is logged server-side, doesn't break the page (the reviews section just doesn't render), but should be cleaned up — either create the table or remove the call. **Not in scope for a11y fix**; tracked in project backlog.
