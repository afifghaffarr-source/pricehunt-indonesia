# PriceHunt Indonesia - Browser Collector

Semi-automated browser-based price data collection tool untuk PriceHunt Indonesia.

## 🎯 Filosofi

Bukan scraper massal. Ini adalah tool untuk **semi-automated data collection** yang:
- ✅ Membuka browser seperti user biasa
- ✅ User/admin bisa browse manual
- ✅ Tool membaca data yang **terlihat** di halaman
- ✅ User confirm sebelum kirim
- ❌ TIDAK bypass captcha/login
- ❌ TIDAK ambil data pribadi
- ❌ TIDAK crawl ribuan halaman otomatis

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd tools/price-collector
pip install -r requirements.txt
playwright install chromium
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env - set PRICEHUNT_API_URL and INGESTION_SECRET
```

### 3. Test Connection

```bash
python collector.py test
```

### 4. Run Collector

**Manual Mode** (recommended untuk pertama kali):
```bash
python collector.py manual
# Browser akan terbuka → browse ke produk → tekan Enter → confirm send
```

**URL Mode** (extract single product):
```bash
python collector.py url "https://www.tokopedia.com/..."
```

**Keyword Mode** (search & select):
```bash
python collector.py keyword "iphone 15 128gb" --marketplace tokopedia --limit 10
```

## 📋 Modes

### 1. Manual Mode
```bash
python collector.py manual [--marketplace tokopedia]
```

- Browser terbuka (visible)
- User bebas browse ke halaman produk mana saja
- Setelah halaman ready, tekan Enter di terminal
- Tool extract data yang terlihat
- Preview data → confirm → send

**Use case:** Eksplorasi, manual QA, edge cases

### 2. URL Mode
```bash
python collector.py url <PRODUCT_URL> [--marketplace tokopedia]
```

- Input: Product URL langsung
- Browser terbuka (headless)
- Extract data otomatis
- Preview → confirm → send

**Use case:** Targeted collection, specific products

### 3. Keyword Mode
```bash
python collector.py keyword <KEYWORD> --marketplace tokopedia --limit 10
```

- Search marketplace by keyword
- Tampilkan hasil (max `limit`)
- User pilih nomor produk mana yang mau di-collect
- Loop: extract → preview → confirm → send

**Use case:** Bulk collection dengan kontrol

## 🛠️ Architecture

```
collector.py (CLI)
├── config.py (settings, env vars)
├── api_client.py (send to PriceHunt API)
├── normalizer.py (price, marketplace, stock normalization)
├── base_collector.py (base class, browser control)
├── generic_parser.py (fallback parser - any marketplace)
└── marketplaces/
    ├── tokopedia.py (Apollo GraphQL cache extraction)
    └── shopee.py (generic parser for now)
```

## 🔍 Data Extraction

### Tokopedia
- **Primary:** Apollo GraphQL cache extraction (most reliable)
- **Fallback:** Generic parser

### Shopee
- **Primary:** Generic parser (TODO: Shopee-specific)

### Generic Parser
Works on any marketplace with fallback strategies:
1. Open Graph meta tags
2. JSON-LD structured data
3. Common HTML selectors
4. Regex price pattern matching

## 📊 Data Sent to API

```json
{
  "marketplace": "tokopedia",
  "product_url": "https://...",
  "title": "Samsung Galaxy S24 Ultra...",
  "price": 13250000,
  "original_price": 15000000,
  "seller_name": "Samsung Official Store",
  "is_official_store": true,
  "stock_status": "in_stock",
  "rating": 5.0,
  "image_url": "https://...",
  "category_hint": "smartphone",
  "source": "browser_collector",
  "captured_at": "2026-06-11T01:30:00Z"
}
```

API endpoint: `/api/ingestion/offer-snapshot`

## ⚙️ Configuration (.env)

```env
# Required
PRICEHUNT_API_URL=http://localhost:3000
INGESTION_SECRET=your-secret-here

# Optional
DEFAULT_MARKETPLACE=tokopedia
COLLECTOR_DEFAULT_LIMIT=10
COLLECTOR_HEADLESS=false
BROWSER_TIMEOUT=30000
MIN_DELAY_SECONDS=2
MAX_DELAY_SECONDS=5
DEBUG=false
```

## 🚨 Important Rules

1. **Captcha:** Jika muncul captcha, tampilkan pesan: "Captcha detected. Solve it manually if authorized, then press Enter." **JANGAN bypass**.

2. **Rate Limiting:** Default delay 2-5 detik antar request. Hormati rate limit marketplace.

3. **No Login:** Tool tidak login otomatis. Jika perlu login, user login manual di browser.

4. **No PII:** Tool TIDAK ambil cookie, token, alamat, riwayat belanja, chat, checkout, atau data pribadi.

5. **HTML Storage:** Hanya untuk debug lokal (SAVE_HTML=true). Jangan simpan HTML penuh ke database.

## 🧪 Testing

Test API connection:
```bash
python collector.py test
```

Test Tokopedia extraction:
```bash
python collector.py url "https://www.tokopedia.com/owllonenew/samsung-galaxy-s24-ultra-12-256-garansi-2026-1731786344964260912"
```

## 🔒 Security

- `INGESTION_SECRET` required untuk auth ke API
- Secret tidak boleh exposed ke browser
- Tool ini internal/admin use only
- Data sent: product info saja (no PII)

## 📚 Files

```
tools/price-collector/
├── collector.py          # Main CLI script
├── config.py             # Configuration & env vars
├── api_client.py         # API client untuk send data
├── normalizer.py         # Data normalization
├── base_collector.py     # Base collector class
├── generic_parser.py     # Generic fallback parser
├── marketplaces/
│   ├── __init__.py
│   ├── tokopedia.py      # Tokopedia collector
│   └── shopee.py         # Shopee collector
├── output/               # HTML snapshots (if SAVE_HTML=true)
├── requirements.txt      # Python dependencies
├── .env.example          # Example config
└── README.md             # This file
```

## 🎓 Examples

**Collect single product:**
```bash
python collector.py url "https://tokopedia.com/..."
```

**Manual browse & collect:**
```bash
python collector.py manual
# → Browser opens → Navigate to product → Press Enter → Confirm
```

**Search & bulk collect:**
```bash
python collector.py keyword "macbook air m3" --marketplace tokopedia --limit 5
# → Shows 5 results → Select which to collect → Confirm each
```

## 🐛 Troubleshooting

**"Connection error":**
- Check if PriceHunt Next.js app running (`npm run dev`)
- Check `PRICEHUNT_API_URL` in `.env`

**"Unauthorized":**
- Check `INGESTION_SECRET` matches server config
- Format: `Authorization: Bearer <secret>`

**"Invalid price":**
- Tool cannot find valid price on page
- Try manual mode to inspect page
- Check if page loaded correctly (wait longer)

**Playwright install failed:**
```bash
playwright install --with-deps chromium
```

## 📈 Next Steps

- [ ] Implement Shopee-specific parser
- [ ] Add Lazada collector
- [ ] Add Bukalapak collector
- [ ] Chrome extension version (future)
- [ ] Smarter product matching
- [ ] Conflict detection integration

## 📄 License

Internal tool untuk PriceHunt Indonesia project.
