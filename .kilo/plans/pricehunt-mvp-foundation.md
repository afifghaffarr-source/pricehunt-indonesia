# BijakBeli.app — MVP Foundation Plan

## Ringkasan Pemahaman Project

**BijakBeli.app** adalah website perbandingan harga marketplace Indonesia. Target user adalah pembeli online yang ingin membandingkan harga dari beberapa marketplace (Tokopedia, Shopee, Bukalapak, Lazada, Blibli, TikTok Shop) agar hemat uang dan waktu.

### State Saat Ini
- Next.js **16.2.7** (bukan 14 — sudah terinstall, tidak perlu downgrade)
- React 19.2.4
- Tailwind CSS **v4** (menggunakan `@import "tailwindcss"` + `@theme inline`)
- TypeScript sudah terkonfigurasi dengan path alias `@/*`
- App Router sudah aktif, `src/` directory sudah ada
- Hanya boilerplate default `create-next-app` — belum ada komponen custom

### Catatan Teknis Penting
1. **Tailwind v4**: Menggunakan sintaks baru (`@import "tailwindcss"`, `@theme inline`), bukan v3. Semua styling harus sesuai.
2. **shadcn/ui**: Versi terbaru sudah support Tailwind v4. Akan di-setup dengan `bunx shadcn@latest init`.
3. **Font**: Akan diganti dari Geist ke **Inter** sesuai permintaan.
4. **Images**: Karena ini mock data, gambar produk akan menggunakan placeholder URLs.
5. **Dark mode**: Akan diimplementasikan via Tailwind `dark:` classes.

---

## Daftar File yang Akan Dibuat

### Dependency Installation
- Install: `shadcn/ui`, `lucide-react`, `recharts`, `framer-motion`, `class-variance-authority`, `clsx`, `tailwind-merge`

### Files to Create/Modify

```
src/
├── app/
│   ├── layout.tsx                    (MODIFY — update font, metadata, add Header/Footer)
│   ├── globals.css                   (MODIFY — update theme colors, add custom CSS vars)
│   ├── page.tsx                      (MODIFY — full homepage implementation)
│   ├── search/
│   │   └── page.tsx                  (CREATE — search results page)
│   └── product/
│       └── [slug]/
│           └── page.tsx              (CREATE — product detail page)
├── components/
│   ├── layout/
│   │   ├── Header.tsx                (CREATE)
│   │   └── Footer.tsx                (CREATE)
│   ├── search/
│   │   ├── SearchBar.tsx             (CREATE)
│   │   └── PopularSearchChips.tsx    (CREATE)
│   ├── product/
│   │   ├── ProductCard.tsx           (CREATE)
│   │   ├── PriceComparisonTable.tsx  (CREATE)
│   │   ├── PriceHistoryChart.tsx     (CREATE)
│   │   ├── DealScoreBadge.tsx        (CREATE)
│   │   └── MarketplaceBadge.tsx      (CREATE)
│   ├── ai/
│   │   └── AIAdvisorCard.tsx         (CREATE)
│   └── common/
│       ├── LoadingSkeleton.tsx       (CREATE)
│       ├── EmptyState.tsx            (CREATE)
│       └── SectionHeading.tsx        (CREATE)
├── lib/
│   ├── mock-data.ts                  (CREATE)
│   ├── utils.ts                      (CREATE)
│   └── types.ts                      (CREATE)
```

**Total: ~25 file** (3 modify + ~22 create)

---

## Urutan Pengerjaan

### Step 1: Setup Dependencies (~5 min)
1. Install semua dependency: `bun add lucide-react recharts framer-motion class-variance-authority clsx tailwind-merge`
2. Init shadcn/ui: `bunx shadcn@latest init`
3. Tambahkan shadcn/ui components: `button`, `input`, `card`, `badge`, `skeleton`, `table`, `select`, `separator`
4. Update `next.config.ts` jika perlu

### Step 2: Foundation — Types, Utils, Mock Data (~15 min)
1. **`src/lib/types.ts`** — TypeScript interfaces
2. **`src/lib/utils.ts`** — Helper functions
3. **`src/lib/mock-data.ts`** — Mock data lengkap

### Step 3: Global Styles & Layout (~10 min)
1. **`src/app/globals.css`** — Update CSS variables
2. **`src/app/layout.tsx`** — Update font, metadata, Header/Footer

### Step 4: Common Components (~10 min)
1. **`SectionHeading.tsx`**
2. **`LoadingSkeleton.tsx`**
3. **`EmptyState.tsx`**

### Step 5: Layout Components (~10 min)
1. **`Header.tsx`**
2. **`Footer.tsx`**

### Step 6: Search Components (~15 min)
1. **`SearchBar.tsx`**
2. **`PopularSearchChips.tsx`**

### Step 7: Product Components (~20 min)
1. **`DealScoreBadge.tsx`**
2. **`MarketplaceBadge.tsx`**
3. **`ProductCard.tsx`**
4. **`PriceComparisonTable.tsx`**
5. **`PriceHistoryChart.tsx`**

### Step 8: AI & Pages (~15 min)
1. **`AIAdvisorCard.tsx`**
2. **Homepage** — Hero search, popular chips, features, trending
3. **Search Page** — Filters, product list, empty state
4. **Product Detail Page** — Full detail

### Step 9: Polish & Responsive (~10 min)
1. Responsive check mobile/tablet/desktop
2. Dark mode toggle test
3. Accessibility basics

---

## Risiko & Catatan

| # | Risiko | Mitigasi |
|---|--------|----------|
| 1 | Next.js 16 bukan 14 | Gunakan apa yang sudah ada, API sama |
| 2 | Tailwind v4 syntax beda | Ikuti sintaks v4, init shadcn benar |
| 3 | No real product images | Gunakan placeholder URLs |
| 4 | Recharts butuh client-side | Bungkus dengan `'use client'` |
| 5 | shadcn/ui init kadang bermasalah | Fallback ke manual setup |

---

## Validation Checklist

- [x] Homepage tampil dengan hero search
- [x] Search page menampilkan produk mock → sekarang Supabase data
- [x] Product card menampilkan harga termurah dan deal score
- [x] Product detail page menampilkan price comparison table
- [x] Price history chart tampil dengan data 30 hari
- [x] AI Advisor card menampilkan dummy verdict
- [x] Responsive di mobile/tablet/desktop
- [x] Dark mode berfungsi
- [x] Empty state tampil jika search kosong
- [x] Format rupiah benar
- [x] Deal score badge berwarna sesuai level
- [x] `bun run lint` pass
- [x] `bun run build` pass

---

## Saran Prompt Phase 2

1. ✅ "Integrasikan Supabase untuk database produk dan wishlist" — Phase 2 & 3
2. ✅ "Buat fitur authentication dengan Supabase Auth" — Phase 2
3. ✅ "Implementasi price alert notification" — Phase 3
4. ✅ "Buat API routes untuk search dan product data" — Phase 4
5. ✅ "Integrasikan AI Advisor dengan OpenAI API" — Phase 4
6. ✅ "Tambahkan SEO metadata dan Open Graph tags" — Phase 4
7. ✅ "Buat admin dashboard untuk manage produk" — Phase 4
8. ✅ "Implementasi real marketplace scraping/API" — Phase 9 + VexoAPI

---

## Status: SELESAI (13/13 checklist, 8/8 Phase 2 saran)

### Phases Completed: 1-9 + VexoAPI Integration
- Phase 1: MVP Foundation (UI)
- Phase 2: Supabase + Auth
- Phase 3: Full DB Integration, Wishlist, Alerts
- Phase 4: API Routes, SEO, Admin, AI, Email
- Phase 5: PWA, Tests, Settings, Performance
- Phase 6: CI/CD, Rate Limiting, Health Check, Deploy
- Phase 7: Price Tracker, Analytics, Security, Backup
- Phase 8: Comparison, Push Notifications, Social, Digest
- Phase 9: Scraper, Prediction, Gamification, Extension, Currency
- VexoAPI: Product Discovery, Image Search, AI Insights, Smart Search
