# 🛒 BijakBeli.app

**Beli yang Tepat, di Waktu yang Tepat** — Smart price comparison platform untuk marketplace Indonesia dengan AI-powered insights dan trust-based data validation.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-231%20passing-success.svg)](https://github.com/afifghaffarr-source/pricehunt-indonesia)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 🎯 **What is BijakBeli?**

BijakBeli helps Indonesian shoppers make smarter purchase decisions by:
- **Comparing prices** across 6 marketplaces (Tokopedia, Shopee, Bukalapak, Lazada, Blibli, TikTok Shop)
- **Detecting fake discounts** with historical price analysis
- **Recommending buy/wait timing** based on deal scores & price trends
- **Validating data trust** with confidence scoring (browser collector + AI verification)

**Live:** [bijakbeli.app](https://www.bijakbeli.app) | **Repo:** [GitHub](https://github.com/afifghaffarr-source/pricehunt-indonesia)

---

## ✨ **Key Features**

### 🧠 **Intelligence Layer**
- **Deal Score Engine** — 6-factor scoring (0-100): price discount, historical percentile, seller trust, official store, stock, promotions
- **Fake Discount Detector** — Median 30/90-day price analysis to catch inflated "original prices"
- **Buy or Wait AI** — Data-driven purchase timing recommendations
- **Total Cost Calculator** — Real cost comparison (product + shipping - voucher - cashback)

### 📊 **Core Features**
- Price comparison with **confidence scores** (85-95% trusted data)
- 30-90 day price history charts
- Smart price alerts with target recommendations
- Chrome extension for 1-click product collection
- PWA support (install as mobile/desktop app)

### 🖼️ **Image Pipeline** (NEW!)
- **VexoAPI Marketplace** — Real product images from Indonesian marketplaces
- **VexoAPI Image Search** — AI-powered image discovery
- **picsum.photos** — Stable fallback (always valid)
- **Package icon** — Last resort placeholder
- Automatic pipeline: marketplace → image search → picsum → icon

### 🔐 **Data Trust System**
- **Source transparency**: Browser collector, API, affiliate feed, manual admin
- **Confidence scoring**: 85-95% based on data freshness & validation
- **Last checked timestamps**: Real-time data age visibility
- **Automated matching**: Hourly cron jobs link offers to products

---

## 📊 **Current Stats**

| Metric | Value |
|--------|-------|
| Products | 64 |
| With images | 64/64 (100%) |
| With prices | 64/64 (100%) |
| Total offers | 165 |
| Matched offers | 157 (95%) |
| Tests passing | 231 |
| Migrations | 120 |

---

## 🛠️ **Tech Stack**

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack, RSC) |
| **Language** | TypeScript 5.0 |
| **UI** | Tailwind CSS v4 + shadcn/ui |
| **Database** | Supabase (PostgreSQL + Realtime) |
| **Auth** | Supabase Auth |
| **AI** | VexoAPI (product discovery, image search, marketplace data) |
| **Charts** | Recharts |
| **Testing** | Vitest (231 tests passing) |
| **Deployment** | Vercel (auto-deploy from Git) |
| **Collector** | Chrome Extension + Python scripts |

---

## 🚀 **Quick Start**

### **Prerequisites**
- [Bun](https://bun.sh) v1.0+ (or npm on VPS)
- [Supabase](https://supabase.com) account
- [VexoAPI](https://vexoapi.dev) VIP key (optional but recommended)

### **Installation**

```bash
# Clone repository
git clone https://github.com/afifghaffarr-source/pricehunt-indonesia.git
cd bijakbeli-app

# Install dependencies
bun install  # or npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run database migrations
bun supabase db push

# Start development server
bun dev  # or npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 **Environment Variables**

### **Required**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=https://www.bijakbeli.app
```

### **Optional (Recommended)**
```env
# VexoAPI (AI features: product summaries, image search, marketplace data)
VEXO_API_BASE_URL=https://vexoapi.dev
VEXO_API_KEY=your_vip_lifetime_key_here
VEXO_API_TIMEOUT_MS=10000

# Ingestion API (Chrome extension data collection)
INGESTION_SECRET=your-random-secret-256bit

# Cron jobs (automated price updates)
CRON_SECRET=your-cron-secret

# Email notifications (price alerts)
RESEND_API_KEY=re_your-resend-key
```

**VexoAPI Setup:**
1. Get VIP LIFETIME key from [VexoAPI Dashboard](https://vexoapi.dev)
2. Models available: `gptoss120b`, `glm47flash`, `duckai`
3. Without VexoAPI: AI features fallback to manual mode

---

## 📦 **Project Structure**

```
bijakbeli-app/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Auth pages (login, signup)
│   │   ├── product/      # Product detail pages
│   │   ├── api/          # API routes (ingestion, vexo, cron)
│   │   │   ├── vexo/     # VexoAPI proxy (images, marketplace, search)
│   │   │   ├── ingestion/ # Data ingestion endpoints
│   │   │   └── cron/     # Scheduled jobs
│   ├── components/       # React components
│   │   ├── ai/           # VexoAPI components (summaries, images)
│   │   ├── common/       # Shared components (VexoImageFallback)
│   │   ├── product/      # Product UI (price tables, charts)
│   │   ├── ui/           # shadcn/ui base components
│   ├── lib/              # Utilities & business logic
│   │   ├── supabase/     # Database queries & auth
│   │   ├── vexo/         # VexoAPI client & adapters
│   ├── proxy.ts          # Next.js 16 middleware (CORS, CSRF)
├── extensions/           # Chrome extension (data collector)
├── collectors/           # Python scripts
│   ├── quick_wins.py     # Match orphan offers
│   ├── fix_remaining.py  # Fix missing prices
│   ├── vexo_marketplace_images.py  # VexoAPI image population
│   ├── image_populator_ddg.py      # DuckDuckGo fallback
│   └── use_picsum_images.py        # picsum.photos fallback
├── supabase/
│   └── migrations/       # Database schema (120 migrations)
├── tests/                # Vitest tests (231 passing)
└── BETA_QUICK_START.md   # Extension beta testing guide
```

---

## 🧪 **Testing**

```bash
# Run all tests
bun test

# Watch mode
bun test:watch

# Coverage
bun test:coverage
```

**Test Stats:** 231 tests passing, 85%+ coverage

---

## 📊 **Database Schema**

Key tables:
- `products` — Product catalog with metadata (image_url, lowest_price)
- `offers` — Price snapshots with trust metadata (current_price, product_id)
- `price_histories` — Historical price tracking
- `marketplaces` — Marketplace registry (Tokopedia, Shopee, etc.)
- `wishlists` — Saved products
- `price_alerts` — User price alerts
- `crawl_targets` — Automated scraping targets

**Migrations:** 120 applied (trust system v3 active, performance indexes)

---

## 🔌 **Chrome Extension Beta**

**Status:** v2.0.2 production-ready (CORS + database bugs fixed)

**Features:**
- 1-click product collection from marketplace pages
- Background service worker architecture (Manifest V3)
- Auto-sync to BijakBeli database
- Confidence scoring (85% browser-sourced data)

**Download:** [bijakbeli.app/extension](https://www.bijakbeli.app/extension)

**Setup Guide:** [BETA_QUICK_START.md](BETA_QUICK_START.md)

---

## 🤖 **AI Features (VexoAPI)**

When VexoAPI is configured:
- ✅ **Product Summaries** — AI-generated 1-sentence descriptions
- ✅ **Deal Verdicts** — Buy/wait recommendations with reasoning
- ✅ **Marketplace Data** — Real product images & pricing from Shopee
- ✅ **Image Fallback** — Auto-fetch product images if missing
- ✅ **Smart Search** — Natural language product discovery
- ✅ **Translations** — Indonesian ↔ English product names

Without VexoAPI:
- ⏸️ AI features fallback to manual mode
- ✅ Core features (price comparison, alerts) still work

---

## 🖼️ **Image Pipeline**

Product images use a 3-step fallback pipeline:

```
1. VexoAPI Marketplace (/api/tools/marketplace)
   → Real product images from Indonesian marketplaces
   ↓ (if fails)
2. VexoAPI Image Search (/api/vexo/images)
   → AI-powered image discovery
   ↓ (if fails)
3. picsum.photos (https://picsum.photos/seed/{keyword}/600/600)
   → Stable free placeholder (always valid)
   ↓ (if fails)
4. Package icon (lucide-react)
   → Last resort placeholder
```

**Supported image domains** (in next.config.ts):
- `picsum.photos`, `fastly.picsum.photos`
- `images.tokopedia.net`, `p16-images-sign-sg.tokopedia-static.net`
- `cf.shopee.co.id`, `s.bukalapak.com`
- `www.static-src.com`, `img.lazcdn.com`
- `images.unsplash.com`, `placehold.co`

---

## 🚢 **Deployment**

**Production:** Vercel auto-deploy from `master` branch (Git integration)

```bash
# Correct workflow (DO NOT run vercel --prod manually)
git add .
git commit -m "feat: your changes"
git push origin master
# Vercel auto-deploys in 2-3 minutes
```

**⚠️ Important:**
- Never run `vercel --prod` manually (causes double deployment)
- Vercel Git integration handles deployment automatically
- Wait 2-3 minutes after push, then verify at https://www.bijakbeli.app

---

## 📚 **Documentation**

- **Beta Testing:** [BETA_QUICK_START.md](BETA_QUICK_START.md)
- **Monitoring:** [scripts/MONITORING_README.md](scripts/MONITORING_README.md)
- **Old README:** [README.old.md](README.old.md) (full 650-line version)

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

**Tests required:** All PRs must pass 231 existing tests

---

## 📝 **License**

MIT License — see [LICENSE](LICENSE) file

---

## 🙏 **Acknowledgments**

- [Next.js](https://nextjs.org) — React framework
- [Supabase](https://supabase.com) — Backend infrastructure
- [VexoAPI](https://vexoapi.dev) — AI & product discovery
- [shadcn/ui](https://ui.shadcn.com) — UI components
- [Vercel](https://vercel.com) — Hosting & deployment

---

**Built with ❤️ for Indonesian shoppers** 🇮🇩
