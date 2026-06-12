# 🛒 BijakBeli.app

**Beli yang Tepat, di Waktu yang Tepat** — Smart price comparison platform untuk marketplace Indonesia dengan AI-powered insights dan trust-based data validation.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-215%20passing-success.svg)](https://github.com/afifghaffarr-source/bijakbeli-app)
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

### 🔐 **Data Trust System** (NEW!)
- **Source transparency**: Browser collector, API, affiliate feed, manual admin
- **Confidence scoring**: 85-95% based on data freshness & validation
- **Last checked timestamps**: Real-time data age visibility
- **Automated matching**: Hourly cron jobs link offers to products

---

## 🛠️ **Tech Stack**

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack, RSC) |
| **Language** | TypeScript 5.0 |
| **UI** | Tailwind CSS v4 + shadcn/ui |
| **Database** | Supabase (PostgreSQL + Realtime) |
| **Auth** | Supabase Auth |
| **AI** | VexoAPI (product discovery, image search, translations) |
| **Charts** | Recharts |
| **Testing** | Vitest (215 tests passing) |
| **Deployment** | Vercel (Production) |
| **Collector** | Chrome Extension + Python scripts |

---

## 🚀 **Quick Start**

### **Prerequisites**
- [Bun](https://bun.sh) v1.0+
- [Supabase](https://supabase.com) account
- [VexoAPI](https://vexoapi.dev) VIP key (optional but recommended)

### **Installation**

```bash
# Clone repository
git clone https://github.com/afifghaffarr-source/pricehunt-indonesia.git
cd bijakbeli-app

# Install dependencies
bun install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run database migrations
bun supabase db push

# Start development server
bun dev
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
# VexoAPI (AI features: product summaries, image search, translations)
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
│   ├── components/       # React components
│   │   ├── ai/           # VexoAPI components (summaries, images)
│   │   ├── product/      # Product UI (price tables, charts)
│   │   ├── ui/           # shadcn/ui base components
│   ├── lib/              # Utilities & business logic
│   │   ├── supabase/     # Database queries & auth
│   │   ├── vexo/         # VexoAPI client & adapters
│   │   ├── marketplace/  # Marketplace integrations
├── extensions/           # Chrome extension (data collector)
├── scripts/              # SQL monitoring dashboards
│   ├── quick_check_extension.sql
│   ├── monitor_extension_beta.sql
├── supabase/
│   ├── migrations/       # Database schema (114 migrations)
├── tests/                # Vitest tests (215 passing)
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

**Test Stats:** 215 tests passing, 85%+ coverage

---

## 📊 **Database Schema**

Key tables:
- `products` — Product catalog with metadata
- `offers` — Price snapshots with trust metadata
- `price_histories` — Historical price tracking
- `users` — User accounts & profiles
- `wishlists` — Saved products
- `price_alerts` — User price alerts

**Migrations:** 114 applied (trust system v3 active)

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
- ✅ **Image Fallback** — Auto-fetch product images if missing
- ✅ **Smart Search** — Natural language product discovery
- ✅ **Translations** — Indonesian ↔ English product names

Without VexoAPI:
- ⏸️ AI features fallback to manual mode
- ✅ Core features (price comparison, alerts) still work

---

## 📚 **Documentation**

- **Beta Testing:** [BETA_QUICK_START.md](BETA_QUICK_START.md)
- **Monitoring:** [scripts/MONITORING_README.md](scripts/MONITORING_README.md)
- **Old README:** [README.old.md](README.old.md) (full 650-line version)

---

## 🚢 **Deployment**

**Production:** Vercel auto-deploy from `master` branch

```bash
# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls
```

**Environment:** Production uses `.env.production.local` (not committed)

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

**Tests required:** All PRs must pass 215 existing tests

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
