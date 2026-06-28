# Chrome Web Store Listing — BijakBeli.app v3.0.1

Submission-ready text for Chrome Web Store Developer Dashboard.

---

## 📝 Short Description (max 132 chars)

**Final:** 113 chars

> Bandingkan harga marketplace Indonesia saat browsing. Auto-scrape produk untuk bantu komunitas.

## 📋 Detailed Description (max 15000 chars)

**Final:** ~2700 chars.

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

### Apa yang TIDAK dilakukan extension ini:

❌ Tidak.Collect personal data (nama, email, telepon)
❌ Tidak.Track browsing history di luar marketplace
❌ Tidak.Show iklan atau monetize data kamu
❌ Tidak.Access password atau payment info
❌ Tidak.Sell data ke third party

### Privacy & Trust:

• Source code openly published di GitHub
• Semua data tersimpan lokal (chrome.storage.local), tidak dikirim ke server
  kecuali kamu konfigurasi INGESTION_SECRET
• 100% gratis, 100% open, 100% no-ads
• Lihat Privacy Policy lengkap di:
  https://www.bijakbeli.web.id/legal#privacy

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

File size: < 1 MB each. Use PNG or JPEG.

## 🎬 Promotional Tile (Optional)

- Small: 440×280 PNG
- Marquee: 1400×560 PNG

## 🔐 Permissions Justification

### Chrome permissions

| Permission | Why Needed |
|-----------|------------|
| `activeTab` | Access current tab only when user explicitly clicks "Scrape this page" button |
| `storage` | Save submission history, retry queue, and stats on user's local device |
| `tabs` | Detect tab URL/title changes to trigger re-scraping on SPA navigation |
| `scripting` | Inject marketplace-scraper.js into matching marketplace pages |
| `alarms` | Schedule periodic retry flush of failed submissions every 5 minutes |

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

### Data NOT collected:

- ❌ Personally identifiable information (PII)
- ❌ Authentication credentials
- ❌ Payment information
- ❌ Health, financial, or location data
- ❌ Web browsing history outside marketplace sites

### Data usage:

- ✅ Used for: Building community price database
- ✅ Used by: Extension user themselves (history view) + community database
- ❌ Not used for: Personalized advertising
- ❌ Not sold to: Third parties, data brokers, or affiliates

## 🛡️ Privacy Policy URL

**Live URL:** https://www.bijakbeli.web.id/legal#privacy

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
- [x] Permissions justified ✅
- [x] Host permissions scoped to specific marketplaces ✅
- [x] Privacy policy URL live ✅
- [x] No remote code execution ✅
- [x] No obfuscation ✅
- [x] No suspicious permissions ✅
- [ ] Screenshots captured (TODO before publish)
- [ ] Promotional tile captured (optional)
- [ ] Tarball zipped as `.zip` (not `.tar.gz`) per CWS upload requirement

## 📦 Submission tarball

Rename `bijakbeli-extension-v3.0.1.tar.gz` → `bijakbeli-extension-v3.0.1.zip`
before uploading to Chrome Web Store dashboard (CWS expects .zip).
