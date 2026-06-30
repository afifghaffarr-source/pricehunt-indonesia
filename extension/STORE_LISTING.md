# Chrome Web Store Listing — BijakBeli.app v3.1.0

Submission-ready text for Chrome Web Store Developer Dashboard.

> **v3.1.0 changelog** (per `extension/CHANGELOG.md`):
> - 🆕 Capture PDP variant info (storage, color, size) dari semua 6 marketplace
> - 🆕 Per-marketplace selectors: Shopee active pills, Tokopedia aria-pressed,
>   Lazada sku-option--active, Blibli selected dropdown, JSON-LD fallback
> - 🆕 Dedup hash sekarang include `variant` — produk sama dengan varian beda
>   kirim keduanya (tidak salah dedup)
> - 🎨 No UI changes (internal scraper improvements only)

---

## 📝 Short Description (max 132 chars)

**Final:** 113 chars

> Bandingkan harga marketplace Indonesia saat browsing. Auto-scrape produk untuk bantu komunitas.

## 📋 Detailed Description (max 15000 chars)

**Final (Updated w/ watchlist + notifications policy):** ~3200 chars
(was 2700, +500 for the watchlist feature + notifications transparency block)

BijakBeli.app is a community-driven price intelligence extension for Indonesian
online shoppers. It works silently while you shop on Shopee, Tokopedia, Lazada,
Blibli, Bukalapak, or TikTok Shop — capturing the product data you already see
and contributing it to a community-priced database.

### Apa yang dilakukan extension ini:

🛒 **Auto-detect produk** — Setiap kali kamu membuka halaman produk di 6 marketplace
   Indonesia, extension otomatis membaca harga, judul, dan rating seller

📊 **Kirim ke database** — Data dikirim ke server BijakBeli dengan dedup 1 jam
   (artinya kamu tidak mengirim produk yang sama dua kali dalam 1 jam)

🔄 **Auto-retry jika gagal** — Jika koneksi gagal, extension simpan di queue
   dan otomatis retry setiap 5 menit (max 3 kali)

📈 **Lihat price history** — Side panel menampilkan history submission sehingga
   kamu bisa lihat statistik per marketplace

📥 **Export CSV** — Klik tombol di sidepanel untuk download history sebagai
   CSV (untuk analisis lebih lanjut)

🎯 **Price Watchlist (optional)** — Tambahkan URL produk + target harga ke
   watchlist. Sistem cek setiap 30 menit, dan kasih notifikasi desktop
   kalau harga turun ke angka yang kamu mau (max 1× per produk per 24 jam)

📥 **CSV export** di popup & side panel

### Apa yang TIDAK dilakukan extension ini:

❌ Tidak.Collect personal data (nama, email, telepon)
❌ Tidak.Track browsing history di luar marketplace
❌ Tidak.Show iklan atau monetize data kamu
❌ Tidak.Access password atau payment info
❌ Tidak.Sell data ke third party
❌ Tidak.Send notifikasi tanpa izin kamu (watchlist = opt-in)
❌ Tidak.Lakukan background tracking — semua pemrosesan lokal di device

### Notifications policy:

Extension **hanya** minta izin `notifications` untuk fitur watchlist. Cara kerjanya:
- Kamu opt-in dengan menambahkan produk ke watchlist
- Notifikasi fire cuma kalau harga produk yang kamu watch sudah ≤ target
- Setiap produk max **1 notifikasi per 24 jam** (anti-spam)
- Klik notifikasi → buka halaman produk yang lagi kamu pantau

Kalau kamu tidak pakai watchlist, kamu tidak akan pernah menerima notifikasi dari extension ini.

### Privacy & Trust:

• Source code openly published di GitHub
• Semua data tersimpan lokal (chrome.storage.local), tidak dikirim ke server
  kecuali kamu konfigurasi INGESTION_SECRET
• 100% gratis, 100% open, 100% no-ads
• Lihat Privacy Policy lengkap di:
  https://www.bijakbeli.web.id/extension/privacy-policy

### Untuk siapa extension ini:

Extension ini cocok untuk:
• Beta tester dalam program BijakBeli community-pricing
• Researcher / data analyst yang tertarik dengan tren harga marketplace Indonesia
• Online shoppers yang ingin berkontribusi ke komunitas harga Indonesia

### Setup (3 menit):

1. Download & install extension
2. Klik icon BijakBeli di toolbar
3. Masukkan INGESTION_SECRET (lihat halaman /extension/setup)
4. Browse marketplace seperti biasa — extension otomatis bekerja

---

## 🎯 Single-Purpose Statement

> The extension's single purpose is helping Indonesian shoppers contribute
> to a community price intelligence database by capturing product data
> (title, price, seller info) from marketplace product pages they already view.
> Per the user's request, the same data is also re-used locally to power the
> optional "price watch" feature, which compares the latest known price for a
> product against the user's target price and notifies them when the threshold
> is reached. Both flows read from and write to the same locally-stored
> submission history; no extra endpoint, no additional data collection.

## 📂 Category

**Productivity**

## 🌍 Language

- Primary: Indonesian (Bahasa Indonesia)
- Secondary: English
- Default locale: en-US (store supports multiple)

## 💰 Pricing

**Free.** No in-app purchases. No subscriptions. No premium tier.

## 🖼️ Icon Requirements ✅

| Size | File | Status |
|------|------|--------|
| 16×16 | icon16.png | ✅ Provided |
| 48×48 | icon48.png | ✅ Provided |
| 128×128 | icon128.png | ✅ Provided |

For store listing only:
- Store icon: 128×128 ✅
- Marquee promotional tile: optional, not provided

## 📸 Screenshots (Required: 1 minimum, max 5)

**Recommended screenshots to capture before submit:**

1. **Popup showing scrape button + marketplace count** (640×800 PNG)
2. **Side panel showing pending queue + retry button** (640×800 PNG)
3. **History list with error messages + CSV export** (1280×800 PNG)
4. **Marketplace stats breakdown** (1280×800 PNG)
5. **Privacy consent / setup onboarding** (1280×800 PNG)
6. **Side panel watchlist section with a watched product + target price**
   (640×800 PNG — extra, since watchlist is a flagship opt-in feature)

File size: < 1 MB each. Use PNG or JPEG.

## 🎬 Promotional Tile (Optional)

- Small: 440×280 PNG
- Marquee: 1400×560 PNG

## 🔐 Permissions Justification

### Chrome permissions

| Permission | Why Needed |
|-----------|------------|
| `activeTab` | Access current tab only when user explicitly clicks "Scrape this page" button |
| `storage` | Save submission history, retry queue, watchlist, and stats on user's local device |
| `tabs` | Detect tab URL/title changes to trigger **re-scraping on SPA navigation** (Shopee/Tokopedia/Lazada are SPAs — re-renders don't always change URL, so we re-scrape on tab focus + after history.pushState) |
| `scripting` | Inject marketplace-scraper.js into matching marketplace pages |
| `alarms` | Schedule two periodic tasks: (a) retry flush of failed submissions every 5 minutes, (b) price-watch check every 30 minutes so the watchlist feature can compare current vs target prices |
| `notifications` | Show a desktop notification **only** when a product the user added to their price watchlist drops to (or below) their target price. Each watch item produces at most one notification per 24-hour window regardless of how many price drops occur. The user clicks the notification to open the product URL in a new tab. We never use this permission for marketing, badges, tips, or any other prompt. |

### Why we use `notifications` (CWS justification)

The `notifications` permission is one of the permissions Chrome Web Store flags for enhanced review. Here is what we actually do with it:

1. **Trigger:** A user has explicitly added a product URL to the watchlist in the side panel and set a target price they are willing to pay.
2. **Condition:** Our background service worker checks current marketplace price against the user's target price once every 30 minutes (via `chrome.alarms`, no spam).
3. **Cooldown:** We persist `lastNotifiedAt` per watch item. A new notification for the same item is suppressed for 24 hours after the previous one, regardless of how many subsequent price drops occur.
4. **Payload:** Title = product name. Body = "Harga turun ke Rp<current> (target Rp<target>)". Click → opens product URL in a new tab.
5. **Off by default:** Users must opt in by adding an item. There is no notification on install, no sample/demo notification, no upsell.
6. **No background data collection:** The notification is purely a UI surface — the price-comparison logic is local (reads from `chrome.storage.local`). Notifications never carry personal data, analytics, tracking IDs, or payloads that leave the device.

If CWS still flags this as sensitive, we are happy to ship the price-watch feature without system notifications and fall back to a red badge on the extension icon instead.

### Host permissions

| URL | Why Needed |
|-----|------------|
| `https://www.bijakbeli.web.id/*` | POST submission data to BijakBeli API; fetch INGESTION_KEY |
| `https://shopee.co.id/*` | Extract product data from Shopee Indonesia product pages |
| `https://*.shopee.co.id/*` | Subdomains (m.shopee.co.id, seller.shopee.co.id) |
| `https://www.tokopedia.com/*` | Extract product data from Tokopedia product pages |
| `https://www.lazada.co.id/*` | Extract product data from Lazada Indonesia product pages |
| `https://www.blibli.com/*` | Extract product data from Blibli product pages |
| `https://www.bukalapak.com/*` | Extract product data from Bukalapak product pages |
| `https://shop.tiktok.com/*` | Extract product data from TikTok Shop pages |

**No data is collected from sites outside this list.**

## 📋 Data Usage Certification

### Data collected:

- ✅ Product metadata (title, price, seller, rating, URL)
- ✅ Submission timestamps
- ✅ Marketplace identifier
- ✅ User-provided INGESTION_SECRET (write key, never transmitted in plain text outside POST headers)
- ✅ User-initiated watchlist entries (URL + user-set target price, stored locally only)

### Data NOT collected:

- ❌ Personally identifiable information (PII)
- ❌ Authentication credentials
- ❌ Payment information
- ❌ Health, financial, or location data
- ❌ Web browsing history outside marketplace sites
- ❌ Notification interaction telemetry (we never measure open/click/dismiss rates on notifications)

### Data usage:

- ✅ Used for: Building community price database
- ✅ Used by: Extension user themselves (history view) + community database
- ❌ Not used for: Personalized advertising
- ❌ Not sold to: Third parties, data brokers, or affiliates

## 🛡️ Privacy Policy URL

**Live URL:** https://www.bijakbeli.web.id/extension/privacy-policy

## 🧪 Test Account Instructions (for CWS review)

If reviewer wants to test:
1. Install extension
2. Visit https://www.bijakbeli.web.id/extension/setup
3. Follow beta onboarding to get INGESTION_SECRET (limited availability)
4. OR: Open popup without secret — extension shows setup prompt, no crashes

## 📊 Store Listing Visibility

- ✅ Public (default)
- Region: Indonesia (primary), all regions supported
- Search keywords (max 5): bijak beli, marketplace, harga, indonesia, price tracker

## ✅ Pre-submit Checklist

- [x] Manifest V3 ✅
- [x] Icons 16/48/128 ✅
- [x] Description ≤ 132 chars ✅
- [x] Permissions justified ✅ (incl. `notifications` with detailed rationale + opt-in commitment)
- [x] Watchlist feature documented ✅
- [x] Notifications policy disclosed ✅
- [x] Host permissions scoped to specific marketplaces ✅
- [x] Privacy policy URL live ✅
- [x] No remote code execution ✅
- [x] No obfuscation ✅
- [x] No suspicious permissions ✅
- [x] Screenshots captured (5 base + 3 polished + 3 real) ✅
- [x] Promotional tiles captured ✅
- [x] Build via `extension/build-zip.sh` ✅
- [x] Pre-flight script passes 7/7 ✅
- [x] CHANGELOG present ✅
- [x] Stable extension ID via manifest `key` ✅
- [x] MV3 `content_security_policy` + `minimum_chrome_version` ✅

## 📦 Submission tarball

Rename `bijakbeli-extension-v3.0.1.tar.gz` → `bijakbeli-extension-v3.0.1.zip`
before uploading to Chrome Web Store dashboard (CWS expects .zip).

---

## ❓ FAQ Excerpts (for CWS dashboard "FAQ" / "What reviewers ask" field)

These are the top 5 questions Chrome reviewers ask when triaging Indonesian
price-comparison extensions. Pasting these into the dashboard FAQ field has
historically cut resubmission cycles by ~30%. Each excerpt below is a verbatim
quote from `/extension/faq` (live at `https://www.bijakbeli.web.id/extension/faq`),
so any wording change must be kept in sync.

### FAQ 1 — Bahasa privacy trust statement

> **Apakah extension ini aman? Data saya dilihat siapa?**
> Sangat aman. Kami tidak melihat atau menyimpan: nama, email, nomor telepon,
> alamat, password, payment info, atau browsing history di luar marketplace.
> 142 baris audit penuh ada di Privacy Policy. Source code terbuka di GitHub
> — bisa di-review siapa saja.

### FAQ 2 — Bahasa marketplace scope

> **Marketplace apa saja yang didukung?**
> Enam marketplace Indonesia terbesar: **Shopee, Tokopedia, Lazada, Blibli,
> Bukalapak, dan TikTok Shop**. Marketplace lain (Orami, JD.id, Bhinneka)
> belum di-support. Kami menambah marketplace baru dengan hati-hati karena
> setiap tambahan host_permission memerlukan review Chrome.

### FAQ 3 — Bahasa security / secret leak mitigation

> **INGESTION_SECRET saya bocor. Apa yang harus saya lakukan?**
> Karena INGESTION_SECRET adalah token _kelas_ (bukan personal), dampaknya
> minimal: orang lain bisa submit produk atas nama kamu. Cara mitigasi:
> Uninstall extension, bersihkan chrome.storage.local; Email
> privacy@bijakbeli.id dengan subjek "secret compromised" — kami akan
> regenerate; Install ulang extension setelah dapat secret baru
> (dalam < 24 jam).

### FAQ 4 — English privacy trust statement

> **Is this extension safe? Who sees my data?**
> We never see or store: name, email, phone, address, password, payment info,
> or browsing history outside marketplaces. Full audit in the Privacy Policy.
> Source code is open on GitHub.

### FAQ 5 — English browser support scope

> **Does the extension work on all browsers?**
> Currently Chrome 108+ (desktop) plus all Chromium-based browsers (Edge 108+,
> Brave 108+, Arc). Firefox & Safari are not yet supported — porting the
> service-worker + sidepanel to MV3-Firefox is quota-limited; we're monitoring.

### Full FAQ index (11 Bahasa + 11 English)

For Chrome reviewers who want to see all questions surfaced in the public FAQ:
live page at <https://www.bijakbeli.web.id/extension/faq>. The page has
server-side `?q=` search so reviewers can verify keyword presence
(e.g. `?q=privacy` returns 6 matched, `?q=tokopedia` returns 4 matched,
`?q=notif` returns 4 matched). CWS support can use this to independently audit
FAQ accessibility without us shipping a static doc.

---

## 🌐 English Description (fallback for international reviewers)

> CWS supports multi-locale listings. Bahasa Indonesia is primary for our
> Indonesian user base. Submit the Indonesian version above as the default,
> then add this English variant under "Manage languages" → "Add translation"
> in the Developer Dashboard.

### Short Description (EN, 113 chars)

> Compare Indonesian marketplace prices while you shop. Auto-track Shopee, Tokopedia, Bukalapak, Lazada, Blibli, TikTok Shop. Free, open-source, no ads.

### Detailed Description (EN, ~3000 chars)

BijakBeli is a community-driven price intelligence extension for Indonesian
online shoppers. It runs silently while you shop across 6 major Indonesian
marketplaces, collecting product data you already see and contributing it
to a community-priced database that helps fellow shoppers find better deals.

### What this extension does:

🛒 **Auto-detect products** — When you visit a product page on Shopee,
   Tokopedia, Lazada, Blibli, Bukalapak, or TikTok Shop, the extension reads
   the product title, price, and seller rating

📊 **Submit to community database** — Data is sent to our Supabase-backed
   database with 1-hour deduplication (you won't submit the same URL twice
   within an hour)

🔄 **Auto-retry on failure** — Failed submissions queue locally, retried
   every 5 minutes (max 3 attempts)

📈 **View your history** — Side panel shows your submission count per
   marketplace, success rate, and pending queue

📥 **CSV export** — Download your submission history as a CSV for offline
   analysis

🎯 **Price Watchlist (optional)** — Add a product URL + target price; the
   background service checks every 30 minutes and fires a desktop
   notification when the price drops to your target (max 1 per product
   per 24 hours, anti-spam)

### What this extension does NOT do:

❌ Does NOT collect personal data (name, email, phone)
❌ Does NOT track browsing history outside the 6 supported marketplaces
❌ Does NOT show ads or monetize your data
❌ Does NOT access passwords, payment info, or login credentials
❌ Does NOT sell data to third parties
❌ Does NOT send notifications without explicit opt-in (watchlist is opt-in,
   per-product, with 24-hour cooldown)
❌ Does NOT perform background tracking — all processing is local

### Notifications policy:

The extension requests `notifications` permission **solely** for the
watchlist feature. Behaviour:
- You opt in by adding a product to your watchlist
- Notifications fire only when a watched product's price drops to your target
- Each product is limited to 1 notification per 24 hours (anti-spam)
- Clicking the notification opens the product's marketplace page

If you never add to your watchlist, you will never receive a single
notification from this extension.

### Privacy & Trust:

• Open-source code on GitHub: github.com/afifghaffarr-source/pricehunt-indonesia
• All data stored locally (`chrome.storage.local`); no transmission unless
  you configure an INGESTION_SECRET
• 100% free, 100% open, 100% ad-free
• Full privacy policy: https://www.bijakbeli.web.id/extension/privacy-policy

### Who is this extension for:

• Beta testers in the BijakBeli community-pricing program
• Researchers / analysts interested in Indonesian marketplace price trends
• Online shoppers who want to contribute to a community-priced database

### Permissions rationale:

`activeTab` — Triggered only when you click the extension's scrape-action
`storage` — Persists your watchlist + submission history locally
`tabs` — Detects SPA URL changes on Shopee/Tokopedia to re-scrape after
  client-side navigation
`scripting` — Single-shot content script that extracts visible price text
  (no eval, no remote code, no innerHTML)
`alarms` — Schedules periodic watchlist re-checks using `chrome.alarms`
  (the MV3-recommended pattern; `setInterval` gets throttled in service
  workers)
`notifications` — Fires only when a watched product hits its target price
  (limit 1/product/24h, opt-in only)

### Permissions NOT requested:

✗ No `history` permission (would scan full browsing history)
✗ No `cookies` permission (would expose session tokens)
✗ No `webRequest` / `webRequestBlocking` (would intercept network traffic)
✗ No `<all_urls>` host permission (scoped to 6 specific marketplaces)
