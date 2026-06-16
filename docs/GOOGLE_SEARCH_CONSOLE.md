# Google Search Console Setup Guide

Panduan step-by-step untuk menghubungkan `bijakbeli.web.id` ke Google
Search Console biar site ter-index lebih cepat.

---

## Kenapa Perlu GSC?

Google Search Console adalah tools resmi Google untuk:
- Lihat berapa page yang sudah di-index
- Submit sitemap langsung ke Google
- Request indexing untuk URL spesifik
- Lihat error crawl, mobile usability, security issues
- Monitor search performance (clicks, impressions, CTR, position)
- Detect structured data problems (rich results eligibility)

Tanpa GSC, Google tetap bisa menemukan site via backlinks, tapi
jauh lebih lambat dan tanpa visibility.

---

## Step 1: Buka Google Search Console

1. Buka https://search.google.com/search-console/
2. Login pakai Google account manapun (pakai personal, bukan workspace)
3. Klik **Add Property** (dropdown di kiri atas → "+ Add property")

---

## Step 2: Pilih Property Type

Ada 2 opsi:

| Type | Coverage | Verification | Recommended |
|---|---|---|---|
| **URL prefix** | Exact URL match (`https://www.bijakbeli.web.id/`) | HTML tag, file, GA, GTM | Untuk single host |
| **Domain** | All subdomains + protocols (`bijakbeli.web.id`) | DNS TXT only | Untuk multi-subdomain |

**Recommended: URL prefix** (lebih simpel, HTML tag verification cukup).

Property name: `https://www.bijakbeli.web.id/`

> Note: Kita udah punya 308 redirect dari `bijakbeli.web.id` (apex) ke
> `www.bijakbeli.web.id`, jadi verify `www` aja udah cukup untuk cover
> semua traffic.

---

## Step 3: Verifikasi Ownership

1. Pilih verification method **"HTML tag"** (Recommended)
2. GSC bakal show sesuatu kayak:
   ```html
   <meta name="google-site-verification" content="abc123xyz..." />
   ```
3. Copy value `content="abc123xyz..."` (string di antara tanda kutip)

### Masukin ke Vercel

1. Buka https://vercel.com/afif-s-projects5/pricehunt-indonesia/settings/environment-variables
2. **Add New**:
   - **Key**: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   - **Value**: (paste dari GSC)
   - **Environments**: ✅ Production (Preview optional)
3. Save
4. Trigger redeploy:
   - Deployments tab → Latest → ⋯ → Redeploy
   - Atau: push commit kosong (`git commit --allow-empty -m "trigger redeploy"`)

### Masukin ke local (untuk testing)

Edit `~/projects/bijakbeli-app/.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=abc123xyz...
```

### Verify di GSC

1. Balik ke GSC verification page
2. Klik **"Verify"** button
3. Should pass dalam beberapa detik

---

## Step 4: Submit Sitemap

1. Di GSC left sidebar: **Sitemaps**
2. Masukin:
   - **Sitemap URL**: `sitemap.xml`
   - (Field "Add a new sitemap" → "sitemap.xml")
3. Klik **Submit**
4. Tunggu beberapa menit → status berubah jadi "Success"
5. Klik sitemap → lihat berapa URLs yang ke-discover (sekarang ~64 products + 4 static = 68)

> Note: `sitemap.xml` di `https://www.bijakbeli.web.id/sitemap.xml`
> auto-generated dari `src/app/sitemap.ts` di server. Filename extension
> di GSC field = `sitemap.xml` (no path prefix).

---

## Step 5: Request Indexing untuk Key Pages

1. Di GSC top bar: **URL Inspection**
2. Masukin URL per page, contoh:
   - `https://www.bijakbeli.web.id/`
   - `https://www.bijakbeli.web.id/search`
   - `https://www.bijakbeli.web.id/deals`
   - `https://www.bijakbeli.web.id/product/anti-gores-nintendo-switch`
   - (tambah 5-10 product pages populer)
3. Klik **Request Indexing** di hasil inspection

> Limit: ~10-12 request per hari. Jadi jangan request sekaligus.

---

## Step 6: Konfigurasi Settings

Di GSC left sidebar → **Settings**:

### Crawl rate
Biarkan default (Google auto-adjust). Jangan set custom.

### International Targeting
1. **Settings** → **International Targeting**
2. Jika ditanya: set **Country**: Indonesia (`idn`)
3. **Language**: biarkan default (Google deteksi dari `<html lang="id">`)

---

## Step 7: Monitor Performance

Tunggu 3-7 hari untuk data pertama, lalu:

- **Performance** → klik/impressions/CTR/position per query
- **Pages** → page mana yang ke-index, duplikat, excluded
- **Experience** → Core Web Vitals (LCP, INP, CLS)
- **Enhancements** → rich results (Product, BreadcrumbList) eligibility

---

## Yang Udah Dikerjakan di v1.5.7 (Code Side)

- ✅ `src/lib/seo.tsx` — JSON-LD helpers (Organization, WebSite, Product, BreadcrumbList)
- ✅ `src/app/layout.tsx` — `verification.google` driven by `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- ✅ `src/app/page.tsx` — Organization + WebSite + SearchAction JSON-LD
- ✅ `src/app/product/[slug]/page.tsx` — Product (with AggregateOffer) + BreadcrumbList JSON-LD
- ✅ Sitemap 64 products + 4 static = 68 URLs (auto-indexable)
- ✅ Per-page canonical (`www.bijakbeli.web.id/<path>`)
- ✅ All private pages `noindex, nofollow`
- ✅ 308 redirects: apex + Vercel URLs → www

## Yang Perlu User Lakukan (Manual)

- [ ] Step 1-3: Bikin GSC property, copy verification code, set di Vercel env
- [ ] Step 4: Submit `sitemap.xml`
- [ ] Step 5: Request indexing untuk 5-10 key pages
- [ ] Step 6: Set country targeting ke Indonesia
- [ ] Step 7: Monitor performance setelah 3-7 hari

## Estimasi Timeline Indexing

| Source | Typical indexing time |
|---|---|
| Manual "Request Indexing" | 1-3 hari |
| Sitemap submission (crawled naturally) | 3-14 hari |
| Backlink dari site lain | 1-4 minggu |
| Random discovery (no signals) | Sebulan+ |

Dengan setup di atas + Request Indexing manual, target: **1-2 minggu
semua 68 URLs ke-index**.

---

## Useful Links

- GSC: https://search.google.com/search-console/
- Rich Results Test: https://search.google.com/test/rich-results
- Schema.org docs: https://schema.org/Product
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
